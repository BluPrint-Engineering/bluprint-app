import {
	MAX_ROOMS_PER_TYPOLOGY,
	MAX_TYPOLOGIES_PER_REQUEST,
} from "@bluprint/shared";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AddTag, Tags } from "../components/Tags";
import { plural } from "../plural";
import { SELECT } from "./fieldStyles";
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

function ExistingTypologyCard({ typology }: { typology: TypologyDraft }) {
	return (
		<div className="grid content-start gap-(--space-3) rounded-lg bg-background p-(--space-4) shadow-(--ring-hairline)">
			<div className="flex items-baseline justify-between gap-(--space-2)">
				<span className="font-semibold [overflow-wrap:anywhere]">
					{typology.name}
				</span>
				<span className="shrink-0 text-sm text-muted-foreground">
					{plural(typology.rooms.length, "cômodo", "cômodos")}
				</span>
			</div>
			<Tags items={typology.rooms} />
		</div>
	);
}

function TypologyCard({
	typology,
	errors,
	edit,
}: {
	typology: TypologyDraft;
	errors: DraftErrors;
	edit: Edit;
}) {
	const id = typologyFieldId(typology.key);
	const error = errors[id];
	const change = (update: (current: TypologyDraft) => TypologyDraft) =>
		edit((draft) => ({
			...draft,
			typologies: draft.typologies.map((other) =>
				other.key === typology.key ? update(other) : other,
			),
		}));
	const label = typology.name.trim() || "tipologia";

	return (
		<div className="grid content-start gap-(--space-3) rounded-lg bg-background p-(--space-4) shadow-(--ring-hairline)">
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
			<Tags
				items={typology.rooms}
				removeLabel={(room) => `Tirar ${room} da ${label}`}
				onRemove={(index) =>
					change((current) => ({
						...current,
						rooms: current.rooms.filter((_, at) => at !== index),
					}))
				}
			/>
			<AddTag
				label={`Novo cômodo da ${label}`}
				placeholder="Novo cômodo"
				existing={typology.rooms}
				duplicateMessage="Esse cômodo já está na tipologia."
				maxItems={MAX_ROOMS_PER_TYPOLOGY}
				maxMessage={`Uma tipologia tem até ${MAX_ROOMS_PER_TYPOLOGY} cômodos.`}
				onAdd={(name) => {
					change((current) => ({
						...current,
						rooms: [...current.rooms, name],
					}));
					return true;
				}}
			/>
		</div>
	);
}

function RuleRow({
	rule,
	number,
	draft,
	errors,
	edit,
	desktop,
}: {
	rule: RuleDraft;
	number: number;
	draft: WizardDraft;
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
			{draft.typologies.map((typology) => (
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
}: {
	draft: WizardDraft;
	errors: DraftErrors;
	edit: Edit;
	desktop: boolean;
}) {
	const several = draft.towers.length > 1;
	return (
		<div className="grid gap-(--space-5)">
			<div className="grid gap-(--space-3)">
				<div
					className={cn(
						"grid gap-(--space-3)",
						desktop && "grid-cols-[repeat(auto-fit,minmax(240px,1fr))]",
					)}
				>
					{draft.typologies.map((typology) =>
						typology.existing ? (
							<ExistingTypologyCard key={typology.key} typology={typology} />
						) : (
							<TypologyCard
								key={typology.key}
								typology={typology}
								errors={errors}
								edit={edit}
							/>
						),
					)}
				</div>
				<Button
					type="button"
					variant="outline"
					className="justify-self-start"
					disabled={
						draft.typologies.filter(({ existing }) => !existing).length >=
						MAX_TYPOLOGIES_PER_REQUEST
					}
					onClick={() => edit(withNewTypology)}
				>
					<Plus className="size-5" aria-hidden="true" />
					Nova tipologia
				</Button>
			</div>
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
						errors={errors}
						edit={edit}
						desktop={desktop}
					/>
				))}
				<Button
					type="button"
					variant="ghost"
					className="justify-self-start text-primary"
					disabled={draft.typologies.length === 0}
					onClick={() => edit(withNewRule)}
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
		</div>
	);
}
