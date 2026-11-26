import {
	MAX_ROOMS_PER_TYPOLOGY,
	MAX_TYPOLOGIES_PER_REQUEST,
	type Typology,
	type TypologyLocationType,
} from "@bluprint/shared";
import { Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { TypologyNameDialog } from "../ConfigurationSections/TypologyNameDialog";
import { CopyTypologyDialog } from "../components/CopyTypologyDialog";
import { RoomList } from "../components/RoomList";
import { RoomSuggestField } from "../components/RoomSuggestField";
import { plural } from "../plural";
import { SELECT } from "./fieldStyles";
import {
	type CatalogTypology,
	catalogOf,
	ofKind,
	takenTypologyNames,
	usedRoomNames,
} from "./typologyCatalog";
import {
	ALL_FINALS,
	type RuleDraft,
	type TypologyDraft,
} from "./typologyRules";
import {
	type DraftErrors,
	type RuleField,
	ruleFieldId,
	typologyFieldId,
	type WizardDraft,
	withCopiedTypology,
	withNewRule,
	withNewTypology,
	withoutTypology,
} from "./wizardDraft";

type Edit = (
	update: (draft: WizardDraft) => WizardDraft,
	touched?: string,
) => void;

const RULE_GRID =
	"grid-cols-[1fr_0.7fr_0.7fr_1.3fr_44px] items-start gap-(--space-2)";
const RULE_GRID_WITH_TOWER = "grid-cols-[1.1fr_1fr_0.7fr_0.7fr_1.3fr_44px]";

const GROUPS = [
	{ locationType: "unit", title: "Unidades", create: "Nova tipologia" },
	{
		locationType: "common_area",
		title: "Áreas comuns",
		description:
			"Escolhidas no Hall em cada andar, no hall de entrada e em cada área comum.",
		create: "Nova tipologia de área comum",
	},
] as const satisfies readonly {
	locationType: TypologyLocationType;
	title: string;
	description?: string;
	create: string;
}[];

export const typologyCardId = (key: string) => `${key}-card`;

function ExistingTypologyCard({
	typology,
	onCopy,
	copyDisabled,
}: {
	typology: CatalogTypology;
	onCopy: (opener: HTMLElement) => void;
	copyDisabled: boolean;
}) {
	return (
		<div
			id={typologyCardId(typology.key)}
			tabIndex={-1}
			className="grid content-start gap-(--space-3) rounded-lg bg-background p-(--space-4) shadow-(--ring-hairline) outline-none focus-visible:shadow-(--shadow-focus)"
		>
			<div className="flex items-baseline justify-between gap-(--space-2)">
				<span className="font-semibold [overflow-wrap:anywhere]">
					{typology.name}
				</span>
				<span className="shrink-0 text-sm text-muted-foreground">
					{plural(typology.rooms.length, "cômodo", "cômodos")}
				</span>
			</div>
			<RoomList rooms={typology.rooms.map((name) => ({ id: name, name }))} />
			<p className="text-sm text-pretty text-muted-foreground">
				Já existe na obra. Os cômodos mudam na Configuração.
			</p>
			<Button
				type="button"
				variant="outline"
				className="justify-self-start"
				aria-label={`Copiar ${typology.name}`}
				disabled={copyDisabled}
				onClick={(event) => onCopy(event.currentTarget)}
			>
				Copiar
			</Button>
		</div>
	);
}

function TypologyCard({
	typology,
	errors,
	edit,
	used,
	onCopy,
	copyDisabled,
}: {
	typology: TypologyDraft;
	errors: DraftErrors;
	edit: Edit;
	used: readonly string[];
	onCopy: (opener: HTMLElement) => void;
	copyDisabled: boolean;
}) {
	const id = typologyFieldId(typology.key);
	const error = errors[id];
	const [typed, setTyped] = useState("");
	const change = (update: (current: TypologyDraft) => TypologyDraft) =>
		edit((draft) => ({
			...draft,
			typologies: draft.typologies.map((other) =>
				other.key === typology.key ? update(other) : other,
			),
		}));
	const label = typology.name.trim() || "tipologia";

	return (
		<div
			id={typologyCardId(typology.key)}
			tabIndex={-1}
			className="grid content-start gap-(--space-3) rounded-lg bg-background p-(--space-4) shadow-(--ring-hairline) outline-none focus-visible:shadow-(--shadow-focus)"
		>
			<div className="flex items-end gap-(--space-2)">
				<Field data-invalid={error !== undefined} className="min-w-0 flex-1">
					<FieldLabel htmlFor={id}>Nome da tipologia</FieldLabel>
					<Input
						id={id}
						autoComplete="off"
						maxLength={60}
						aria-invalid={error !== undefined}
						aria-describedby={error ? `${id}-error` : undefined}
						value={typology.name}
						onChange={(event) => {
							const name = event.target.value;
							edit(
								(draft) => ({
									...draft,
									typologies: draft.typologies.map((other) =>
										other.key === typology.key ? { ...other, name } : other,
									),
								}),
								id,
							);
						}}
					/>
					{error && <FieldError id={`${id}-error`}>{error}</FieldError>}
				</Field>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					aria-label={`Tirar ${label}`}
					onClick={() => edit((draft) => withoutTypology(draft, typology.key))}
				>
					<X className="size-5" aria-hidden="true" />
				</Button>
			</div>
			<span className="text-sm text-muted-foreground">
				{plural(typology.rooms.length, "cômodo", "cômodos")}
			</span>
			<RoomList
				rooms={typology.rooms.map((name) => ({ id: name, name }))}
				onRemove={(index) =>
					change((current) => ({
						...current,
						rooms: current.rooms.filter((_, at) => at !== index),
					}))
				}
			/>
			<RoomSuggestField
				label="Novo cômodo"
				value={typed}
				onValueChange={setTyped}
				onAdd={(name) => {
					change((current) => ({
						...current,
						rooms: [...current.rooms, name],
					}));
					setTyped("");
				}}
				used={used}
				present={typology.rooms}
				presentLabel="Já está nesta tipologia"
				duplicateMessage="Esse cômodo já está na tipologia."
				maxItems={MAX_ROOMS_PER_TYPOLOGY}
				maxMessage={`Uma tipologia tem até ${MAX_ROOMS_PER_TYPOLOGY} cômodos.`}
			/>
			<Button
				type="button"
				variant="outline"
				className="justify-self-start"
				aria-label={`Copiar ${label}`}
				disabled={copyDisabled}
				onClick={(event) => onCopy(event.currentTarget)}
			>
				Copiar
			</Button>
		</div>
	);
}

function RuleRow({
	rule,
	number,
	draft,
	unitTypes,
	errors,
	edit,
	desktop,
}: {
	rule: RuleDraft;
	number: number;
	draft: WizardDraft;
	unitTypes: readonly CatalogTypology[];
	errors: DraftErrors;
	edit: Edit;
	desktop: boolean;
}) {
	const several = draft.towers.length > 1;
	const set = (patch: Partial<RuleDraft>, touched?: string) =>
		edit(
			(current) => ({
				...current,
				rules: current.rules.map((other) =>
					other.key === rule.key ? { ...other, ...patch } : other,
				),
			}),
			touched,
		);
	const errorOf = (field: RuleField) => errors[ruleFieldId(rule.key, field)];
	const describedBy = (field: RuleField) =>
		errorOf(field) ? `${ruleFieldId(rule.key, field)}-error` : undefined;
	const messages = (["finals", "from", "to"] as const).flatMap((field) => {
		const message = errorOf(field);
		return message ? [{ field, message }] : [];
	});

	const text = (field: RuleField, label: string, placeholder?: string) => {
		const id = ruleFieldId(rule.key, field);
		const digits = field !== "finals";
		return (
			<Input
				id={id}
				aria-label={desktop ? `${label} da regra ${number}` : undefined}
				autoComplete="off"
				inputMode={digits ? "numeric" : "text"}
				maxLength={digits ? 3 : 40}
				placeholder={placeholder}
				aria-invalid={errorOf(field) !== undefined}
				aria-describedby={describedBy(field)}
				value={rule[field]}
				onChange={(event) =>
					set(
						{
							[field]: digits
								? event.target.value.replace(/\D/g, "")
								: event.target.value,
						},
						id,
					)
				}
			/>
		);
	};
	const towerSelect = several && (
		<select
			id={`${rule.key}-tower`}
			aria-label={desktop ? `Torre da regra ${number}` : undefined}
			className={SELECT}
			value={rule.tower}
			onChange={(event) => set({ tower: Number(event.target.value) })}
		>
			{draft.towers.map((tower, index) => (
				<option key={tower.key} value={index}>
					{tower.name}
				</option>
			))}
		</select>
	);
	const typeSelect = (
		<select
			id={`${rule.key}-type`}
			aria-label={desktop ? `Tipologia da regra ${number}` : undefined}
			className={SELECT}
			value={rule.typology}
			onChange={(event) => set({ typology: event.target.value })}
		>
			{unitTypes.map((typology) => (
				<option key={typology.key} value={typology.key}>
					{typology.name}
				</option>
			))}
		</select>
	);
	const remove = (
		<Button
			type="button"
			variant="ghost"
			size="icon"
			aria-label={`Tirar regra ${number}`}
			onClick={() =>
				edit((current) => ({
					...current,
					rules: current.rules.filter((other) => other.key !== rule.key),
				}))
			}
		>
			<X className="size-5" aria-hidden="true" />
		</Button>
	);
	const errorList = messages.map(({ field, message }) => (
		<FieldError key={field} id={`${ruleFieldId(rule.key, field)}-error`}>
			{message}
		</FieldError>
	));

	if (desktop) {
		return (
			<fieldset className="grid min-w-0 gap-1">
				<legend className="sr-only">Regra {number}</legend>
				<div className={cn("grid", RULE_GRID, several && RULE_GRID_WITH_TOWER)}>
					{towerSelect}
					{text("finals", "Finais", ALL_FINALS)}
					{text("from", "Do andar", "Primeiro")}
					{text("to", "Até o andar", "Último")}
					{typeSelect}
					{remove}
				</div>
				{errorList}
			</fieldset>
		);
	}

	return (
		<fieldset className="grid min-w-0 gap-(--space-3) rounded-lg bg-background p-(--space-3) shadow-(--ring-hairline)">
			<legend className="sr-only">Regra {number}</legend>
			<div className="grid grid-cols-[minmax(0,1fr)_44px] items-end gap-(--space-2)">
				<Field>
					<FieldLabel htmlFor={`${rule.key}-type`}>Tipologia</FieldLabel>
					{typeSelect}
				</Field>
				{remove}
			</div>
			{several && (
				<Field>
					<FieldLabel htmlFor={`${rule.key}-tower`}>Torre</FieldLabel>
					{towerSelect}
				</Field>
			)}
			<div className="grid grid-cols-3 items-start gap-(--space-2)">
				<Field data-invalid={errorOf("finals") !== undefined}>
					<FieldLabel htmlFor={ruleFieldId(rule.key, "finals")}>
						Finais
					</FieldLabel>
					{text("finals", "Finais", ALL_FINALS)}
				</Field>
				<Field data-invalid={errorOf("from") !== undefined}>
					<FieldLabel htmlFor={ruleFieldId(rule.key, "from")}>
						Do andar
					</FieldLabel>
					{text("from", "Do andar", "Primeiro")}
				</Field>
				<Field data-invalid={errorOf("to") !== undefined}>
					<FieldLabel htmlFor={ruleFieldId(rule.key, "to")}>
						Até o andar
					</FieldLabel>
					{text("to", "Até o andar", "Último")}
				</Field>
			</div>
			{errorList}
		</fieldset>
	);
}

export function TypologiesStep({
	draft,
	errors,
	edit,
	desktop,
	existing,
	roomNames,
}: {
	draft: WizardDraft;
	errors: DraftErrors;
	edit: Edit;
	desktop: boolean;
	existing: readonly Typology[];
	roomNames: readonly string[];
}) {
	const several = draft.towers.length > 1;
	const catalog = catalogOf(draft, existing);
	const unitTypes = ofKind(catalog, "unit");
	const taken = takenTypologyNames(draft, existing);
	const used = usedRoomNames(roomNames, draft.typologies);
	const atLimit = draft.typologies.length >= MAX_TYPOLOGIES_PER_REQUEST;
	const [naming, setNaming] = useState<{
		locationType: TypologyLocationType;
		returnFocus: () => HTMLElement | null;
	}>();
	const [copying, setCopying] = useState<CatalogTypology>();
	const copyOpener = useRef<HTMLElement | null>(null);
	const copiedKey = useRef<string | undefined>(undefined);
	const [focusKey, setFocusKey] = useState<string>();

	useEffect(() => {
		if (focusKey === undefined) return;
		const card = document.getElementById(typologyCardId(focusKey));
		card?.focus();
		if (card) setFocusKey(undefined);
	}, [focusKey]);

	function openCopy(typology: CatalogTypology, opener: HTMLElement) {
		copyOpener.current = opener;
		setCopying({ ...typology, rooms: [...typology.rooms] });
	}

	return (
		<div className="grid gap-(--space-5)">
			{GROUPS.map((group) => {
				const items = ofKind(catalog, group.locationType);
				return (
					<section
						key={group.locationType}
						aria-labelledby={`typologies-${group.locationType}`}
						className="grid gap-(--space-3)"
					>
						<div className="grid gap-(--space-1)">
							<div className="flex items-baseline justify-between gap-(--space-2)">
								<h3
									id={`typologies-${group.locationType}`}
									className="font-medium"
								>
									{group.title}
								</h3>
								<span className="text-sm text-muted-foreground">
									{plural(items.length, "tipologia", "tipologias")}
								</span>
							</div>
							{"description" in group && group.description && (
								<p className="text-sm text-pretty text-muted-foreground">
									{group.description}
								</p>
							)}
						</div>
						<div
							className={cn(
								"grid gap-(--space-3)",
								desktop && "grid-cols-[repeat(auto-fit,minmax(240px,1fr))]",
							)}
						>
							{items.map((typology) => {
								if (typology.existing) {
									return (
										<ExistingTypologyCard
											key={typology.key}
											typology={typology}
											copyDisabled={atLimit}
											onCopy={(opener) => openCopy(typology, opener)}
										/>
									);
								}
								const drafted = draft.typologies.find(
									(item) => item.key === typology.key,
								);
								if (!drafted) return null;
								return (
									<TypologyCard
										key={typology.key}
										typology={drafted}
										errors={errors}
										edit={edit}
										used={used}
										copyDisabled={atLimit}
										onCopy={(opener) => openCopy(typology, opener)}
									/>
								);
							})}
						</div>
						<Button
							type="button"
							variant="outline"
							className="justify-self-start"
							disabled={atLimit}
							onClick={(event) => {
								const button = event.currentTarget;
								setNaming({
									locationType: group.locationType,
									returnFocus: () => button,
								});
							}}
						>
							<Plus className="size-5" aria-hidden="true" />
							{group.create}
						</Button>
					</section>
				);
			})}
			<div className="grid gap-(--space-2)">
				<span className="font-medium">Onde se aplica</span>
				{desktop && draft.rules.length > 0 && (
					<div
						aria-hidden="true"
						className={cn(
							"grid text-xs font-semibold text-muted-foreground",
							RULE_GRID,
							several && RULE_GRID_WITH_TOWER,
						)}
					>
						{several && <span>Torre</span>}
						<span>Finais</span>
						<span>Do andar</span>
						<span>Até o andar</span>
						<span>Tipologia</span>
						<span />
					</div>
				)}
				{draft.rules.map((rule, index) => (
					<RuleRow
						key={rule.key}
						rule={rule}
						number={index + 1}
						draft={draft}
						unitTypes={unitTypes}
						errors={errors}
						edit={edit}
						desktop={desktop}
					/>
				))}
				<Button
					type="button"
					variant="ghost"
					className="justify-self-start text-primary"
					disabled={unitTypes.length === 0}
					onClick={() => {
						const first = unitTypes[0];
						if (first) edit((current) => withNewRule(current, first.key));
					}}
				>
					<Plus className="size-5" aria-hidden="true" />
					Regra
				</Button>
				<span className="text-sm text-pretty text-muted-foreground">
					Uma obra com todas as unidades iguais tem uma tipologia só, em todos
					os finais e andares. Unidade sem regra fica sem tipologia, e os
					cômodos dela se cadastram nela.
				</span>
			</div>
			{naming && (
				<TypologyNameDialog
					draft={{
						locationType: naming.locationType,
						takenNames: taken,
					}}
					onClose={() => setNaming(undefined)}
					onCreate={(name) =>
						edit((current) =>
							withNewTypology(current, name, naming.locationType),
						)
					}
					returnFocus={naming.returnFocus}
				/>
			)}
			{copying && (
				<CopyTypologyDialog
					key={`${copying.key}:${copying.rooms.join("\0")}`}
					name={copying.name}
					rooms={copying.rooms.map((name) => ({ id: name, name }))}
					takenNames={taken}
					onConfirm={(name) => {
						const source = copying;
						edit((current) => {
							const next = withCopiedTypology(current, source, name);
							const key = next.typologies.at(-1)?.key;
							copiedKey.current = key;
							if (key) setFocusKey(key);
							return next;
						});
						setCopying(undefined);
						return Promise.resolve();
					}}
					onClose={() => setCopying(undefined)}
					returnFocus={() => {
						const key = copiedKey.current;
						copiedKey.current = undefined;
						if (key) return document.getElementById(typologyCardId(key));
						return copyOpener.current;
					}}
				/>
			)}
		</div>
	);
}
