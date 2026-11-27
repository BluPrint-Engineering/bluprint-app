import { ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { plural } from "../plural";
import { ruleOptions } from "./assignmentRules";
import { SELECT } from "./fieldStyles";
import { stackLabel } from "./floorRanges";
import type { CatalogTypology } from "./typologyCatalog";
import {
	type RuleDraft,
	type RuleField,
	ruleErrors,
	ruleFieldId,
	towerShapes,
	type WizardDraft,
} from "./wizardDraft";

type Edit = (
	update: (draft: WizardDraft) => WizardDraft,
	touched?: string,
) => void;

export const ruleCardId = (key: string) => `${key}-card`;

const FINALS_HINT = "Preencha as faixas no passo 1 para escolher os finais.";
const MENU_ITEM = "min-h-(--tap-min) py-0 pr-10 pl-3 text-base";

function finalsSummary(
	rule: RuleDraft,
	numbering: WizardDraft["numbering"],
): string {
	if (rule.finals === "all") return "Todos os finais";
	if (rule.finals.length === 0) return "Nenhum final";
	const named = rule.finals.map((final) => stackLabel(final, numbering));
	const last = named.at(-1);
	return named.length === 1
		? (last ?? "")
		: `${named.slice(0, -1).join(", ")} e ${last}`;
}

function FinalsMenu({
	rule,
	number,
	finals,
	numbering,
	invalid,
	describedBy,
	onChange,
}: {
	rule: RuleDraft;
	number: number;
	finals: number[];
	numbering: WizardDraft["numbering"];
	invalid: boolean;
	describedBy: string | undefined;
	onChange: (finals: RuleDraft["finals"]) => void;
}) {
	const toggle = (final: number) => {
		if (rule.finals === "all") return onChange([final]);
		onChange(
			rule.finals.includes(final)
				? rule.finals.filter((other) => other !== final)
				: [...rule.finals, final].sort((a, b) => a - b),
		);
	};
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					id={ruleFieldId(rule.key, "finals")}
					aria-label={`Finais da regra ${number}`}
					aria-invalid={invalid}
					aria-describedby={describedBy}
					className={`${SELECT} flex items-center justify-between gap-(--space-2) text-left aria-invalid:border-destructive`}
				>
					<span className="min-w-0 truncate">
						{finalsSummary(rule, numbering)}
					</span>
					<ChevronDown
						className="size-5 shrink-0 text-muted-foreground"
						aria-hidden="true"
					/>
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent aria-label={`Finais da regra ${number}`}>
				<DropdownMenuCheckboxItem
					className={MENU_ITEM}
					checked={rule.finals === "all"}
					onSelect={(event) => event.preventDefault()}
					onCheckedChange={(checked) => onChange(checked ? "all" : [])}
				>
					Todos os finais
				</DropdownMenuCheckboxItem>
				{finals.length === 0 && (
					<p className="px-3 py-2 text-sm text-pretty text-muted-foreground">
						{FINALS_HINT}
					</p>
				)}
				{finals.map((final) => (
					<DropdownMenuCheckboxItem
						key={final}
						className={MENU_ITEM}
						checked={rule.finals !== "all" && rule.finals.includes(final)}
						onSelect={(event) => event.preventDefault()}
						onCheckedChange={() => toggle(final)}
					>
						{stackLabel(final, numbering)}
					</DropdownMenuCheckboxItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function FloorSelect({
	rule,
	number,
	field,
	label,
	unbounded,
	floors,
	onChange,
}: {
	rule: RuleDraft;
	number: number;
	field: "fromFloor" | "toFloor";
	label: string;
	unbounded: string;
	floors: number[];
	onChange: (floor: number | null) => void;
}) {
	const id = `${rule.key}-${field}`;
	const chosen = rule[field];
	const listed =
		chosen === null || floors.includes(chosen)
			? floors
			: [...floors, chosen].sort((a, b) => a - b);
	return (
		<Field>
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			<select
				id={id}
				aria-label={`${label} da regra ${number}`}
				className={SELECT}
				value={rule[field] ?? ""}
				onChange={(event) =>
					onChange(
						event.target.value === "" ? null : Number(event.target.value),
					)
				}
			>
				<option value="">{unbounded}</option>
				{listed.map((floor) => (
					<option key={floor} value={floor}>
						{floor}º
					</option>
				))}
			</select>
		</Field>
	);
}

export function RuleCard({
	rule,
	number,
	draft,
	unitTypes,
	units,
	edit,
}: {
	rule: RuleDraft;
	number: number;
	draft: WizardDraft;
	unitTypes: readonly CatalogTypology[];
	units: number;
	edit: Edit;
}) {
	const errors = ruleErrors([rule]);
	const options = ruleOptions(rule.towers, towerShapes(draft));
	const typology = unitTypes.find((item) => item.key === rule.typology);
	const set = (patch: Partial<RuleDraft>) =>
		edit((current) => ({
			...current,
			rules: current.rules.map((other) =>
				other.key === rule.key ? { ...other, ...patch } : other,
			),
		}));
	const messages = (["towers", "finals"] as const).flatMap(
		(field: RuleField) => {
			const message = errors[ruleFieldId(rule.key, field)];
			return message ? [{ field, message }] : [];
		},
	);
	const errorId = (field: RuleField) =>
		errors[ruleFieldId(rule.key, field)] === undefined
			? undefined
			: `${ruleFieldId(rule.key, field)}-error`;
	const showTower = draft.towers.length > 1 || rule.towers.length === 0;

	return (
		<fieldset
			id={ruleCardId(rule.key)}
			tabIndex={-1}
			aria-label={`Regra ${number}`}
			className="grid min-w-0 gap-(--space-3) rounded-lg bg-background p-(--space-4) shadow-(--ring-hairline) outline-none focus-visible:shadow-(--shadow-focus)"
		>
			<div className="grid grid-cols-[minmax(0,1fr)_44px] items-start gap-(--space-2)">
				<div className="grid gap-(--space-1)">
					<span className="font-semibold [overflow-wrap:anywhere]">
						{typology
							? `Regra ${number} · ${typology.name}`
							: `Regra ${number}`}
					</span>
					<span className="text-sm text-muted-foreground">
						{plural(units, "unidade", "unidades")}
					</span>
				</div>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					aria-label={`Tirar a regra ${number}`}
					onClick={() =>
						edit((current) => ({
							...current,
							rules: current.rules.filter((other) => other.key !== rule.key),
						}))
					}
				>
					<X className="size-5" aria-hidden="true" />
				</Button>
			</div>
			<Field>
				<FieldLabel htmlFor={`${rule.key}-type`}>Tipologia</FieldLabel>
				<select
					id={`${rule.key}-type`}
					aria-label={`Tipologia da regra ${number}`}
					className={SELECT}
					value={rule.typology}
					onChange={(event) => set({ typology: event.target.value })}
				>
					{unitTypes.map((item) => (
						<option key={item.key} value={item.key}>
							{item.name}
						</option>
					))}
				</select>
			</Field>
			{showTower && (
				<Field data-invalid={errorId("towers") !== undefined}>
					<FieldLabel htmlFor={ruleFieldId(rule.key, "towers")}>
						Torre
					</FieldLabel>
					<select
						id={ruleFieldId(rule.key, "towers")}
						aria-label={`Torre da regra ${number}`}
						aria-invalid={errorId("towers") !== undefined}
						aria-describedby={errorId("towers")}
						className={SELECT}
						value={rule.towers[0] ?? ""}
						onChange={(event) => set({ towers: [event.target.value] })}
					>
						{rule.towers.length === 0 && (
							<option value="" disabled>
								Escolha a torre
							</option>
						)}
						{draft.towers.map((tower) => (
							<option key={tower.key} value={tower.key}>
								{tower.name}
							</option>
						))}
					</select>
				</Field>
			)}
			<Field data-invalid={errorId("finals") !== undefined}>
				<FieldLabel htmlFor={ruleFieldId(rule.key, "finals")}>
					Finais
				</FieldLabel>
				<FinalsMenu
					rule={rule}
					number={number}
					finals={options.finals}
					numbering={draft.numbering}
					invalid={errorId("finals") !== undefined}
					describedBy={errorId("finals")}
					onChange={(finals) => set({ finals })}
				/>
			</Field>
			<div className="grid grid-cols-2 items-start gap-(--space-2)">
				<FloorSelect
					rule={rule}
					number={number}
					field="fromFloor"
					label="Do andar"
					unbounded="Primeiro"
					floors={options.floors}
					onChange={(fromFloor) =>
						set({
							fromFloor,
							...(fromFloor !== null &&
								rule.toFloor !== null &&
								rule.toFloor < fromFloor && { toFloor: null }),
						})
					}
				/>
				<FloorSelect
					rule={rule}
					number={number}
					field="toFloor"
					label="Até o andar"
					unbounded="Último"
					floors={options.floors.filter(
						(floor) => rule.fromFloor === null || floor >= rule.fromFloor,
					)}
					onChange={(toFloor) => set({ toFloor })}
				/>
			</div>
			{messages.map(({ field, message }) => (
				<FieldError key={field} id={`${ruleFieldId(rule.key, field)}-error`}>
					{message}
				</FieldError>
			))}
		</fieldset>
	);
}
