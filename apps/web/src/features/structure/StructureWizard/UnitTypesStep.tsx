import {
	MAX_ROOMS_PER_UNIT_TYPE,
	MAX_UNIT_TYPES_PER_REQUEST,
} from "@bluprint/shared";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { plural } from "../plural";
import { SELECT } from "./fieldStyles";
import { AddTag, Tags } from "./Tags";
import {
	ALL_FINALS,
	type RuleDraft,
	type UnitTypeDraft,
} from "./unitTypeRules";
import {
	type DraftErrors,
	type RuleField,
	ruleFieldId,
	unitTypeFieldId,
	type WizardDraft,
	withNewRule,
	withNewUnitType,
	withoutUnitType,
} from "./wizardDraft";

type Edit = (
	update: (draft: WizardDraft) => WizardDraft,
	touched?: string,
) => void;

const RULE_GRID =
	"grid-cols-[1fr_0.7fr_0.7fr_1.3fr_44px] items-start gap-(--space-2)";
const RULE_GRID_WITH_TOWER = "grid-cols-[1.1fr_1fr_0.7fr_0.7fr_1.3fr_44px]";

function UnitTypeCard({
	unitType,
	errors,
	edit,
}: {
	unitType: UnitTypeDraft;
	errors: DraftErrors;
	edit: Edit;
}) {
	const id = unitTypeFieldId(unitType.key);
	const error = errors[id];
	const change = (update: (current: UnitTypeDraft) => UnitTypeDraft) =>
		edit((draft) => ({
			...draft,
			unitTypes: draft.unitTypes.map((other) =>
				other.key === unitType.key ? update(other) : other,
			),
		}));
	const label = unitType.name.trim() || "tipologia";

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
						value={unitType.name}
						onChange={(event) => {
							const name = event.target.value;
							edit(
								(draft) => ({
									...draft,
									unitTypes: draft.unitTypes.map((other) =>
										other.key === unitType.key ? { ...other, name } : other,
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
					onClick={() => edit((draft) => withoutUnitType(draft, unitType.key))}
				>
					<X className="size-5" aria-hidden="true" />
				</Button>
			</div>
			<span className="text-sm text-muted-foreground">
				{plural(unitType.rooms.length, "cômodo", "cômodos")}
			</span>
			<Tags
				items={unitType.rooms}
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
				existing={unitType.rooms}
				duplicateMessage="Esse cômodo já está na tipologia."
				maxItems={MAX_ROOMS_PER_UNIT_TYPE}
				maxMessage={`Uma tipologia tem até ${MAX_ROOMS_PER_UNIT_TYPE} cômodos.`}
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
			value={rule.unitType}
			onChange={(event) => set({ unitType: event.target.value })}
		>
			{draft.unitTypes.map((unitType) => (
				<option key={unitType.key} value={unitType.key}>
					{unitType.name}
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

export function UnitTypesStep({
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
					{draft.unitTypes.map((unitType) => (
						<UnitTypeCard
							key={unitType.key}
							unitType={unitType}
							errors={errors}
							edit={edit}
						/>
					))}
				</div>
				<Button
					type="button"
					variant="outline"
					className="justify-self-start"
					disabled={draft.unitTypes.length >= MAX_UNIT_TYPES_PER_REQUEST}
					onClick={() => edit(withNewUnitType)}
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
					disabled={draft.unitTypes.length === 0}
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
