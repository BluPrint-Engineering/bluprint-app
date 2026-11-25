import { CircleAlert, Minus, Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { plural } from "../plural";
import {
	type RangeField,
	type RangeFloors,
	rangeOverlap,
	readRange,
	towerFloors,
} from "./floorRanges";
import {
	type DraftErrors,
	type Numbering,
	type RangeDraft,
	rangeFieldId,
	rangeOverlapId,
	type TowerDraft,
	towerFieldId,
	towerLabel,
	type WizardDraft,
	withNewRange,
	withNumbering,
	withoutRange,
	withRange,
	withTowerCount,
} from "./wizardDraft";

type Edit = (
	update: (draft: WizardDraft) => WizardDraft,
	touched?: string,
) => void;

function listed(items: string[]): string {
	const last = items.at(-1) ?? "";
	return items.length < 2 ? last : `${items.slice(0, -1).join(", ")} e ${last}`;
}

function rangeLine({ first, last, stacks }: RangeFloors): string {
	const floors = last - first + 1;
	return [
		plural(floors * stacks.length, "unidade", "unidades"),
		plural(floors, "andar", "andares"),
		...(stacks.length > 0
			? [
					`${stacks.length === 1 ? "final" : "finais"} ${listed(stacks.map(({ label }) => label))}`,
				]
			: []),
	].join(" · ");
}

function CheckField({
	id,
	label,
	description,
	checked,
	onCheckedChange,
}: {
	id: string;
	label: string;
	description: string;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
}) {
	return (
		<Field
			orientation="horizontal"
			className="min-h-(--tap-min) items-start py-(--space-1)"
		>
			<Checkbox
				id={id}
				checked={checked}
				aria-describedby={`${id}-description`}
				onCheckedChange={(value) => onCheckedChange(value === true)}
				className="mt-0.5"
			/>
			<FieldLabel htmlFor={id} className="grid gap-0">
				<span className="font-medium">{label}</span>
				<span
					id={`${id}-description`}
					aria-hidden="true"
					className="text-sm font-normal text-muted-foreground"
				>
					{description}
				</span>
			</FieldLabel>
		</Field>
	);
}

function RangeInput({
	id,
	label,
	value,
	error,
	describedBy,
	placeholder,
	help,
	numeric,
	onChange,
	className,
}: {
	id: string;
	label: string;
	value: string;
	error: string | undefined;
	describedBy?: string | undefined;
	placeholder?: string;
	help?: string;
	numeric: boolean;
	onChange: (value: string) => void;
	className?: string;
}) {
	const invalid = error !== undefined || describedBy !== undefined;
	const errorId = error === undefined ? describedBy : `${id}-error`;
	const helpId = help && error === undefined ? `${id}-help` : undefined;
	return (
		<Field data-invalid={invalid} className={cn("min-w-0", className)}>
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			<Input
				id={id}
				inputMode={numeric ? "numeric" : "text"}
				autoComplete="off"
				maxLength={numeric ? 3 : 120}
				placeholder={placeholder}
				aria-invalid={invalid}
				aria-describedby={
					[errorId, helpId].filter(Boolean).join(" ") || undefined
				}
				value={value}
				onChange={(event) => onChange(event.target.value)}
			/>
			{error !== undefined && (
				<FieldError id={`${id}-error`} className="flex gap-(--space-1)">
					<CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
					{error}
				</FieldError>
			)}
			{helpId && <FieldDescription id={helpId}>{help}</FieldDescription>}
		</Field>
	);
}

function RangeCard({
	range,
	ranges,
	number,
	tower,
	numbering,
	extending,
	errors,
	edit,
}: {
	range: RangeDraft;
	ranges: RangeDraft[];
	number: number;
	tower: number;
	numbering: Numbering;
	extending: boolean;
	errors: DraftErrors;
	edit: Edit;
}) {
	const set = (field: RangeField, value: string) =>
		edit(
			(draft) => withRange(draft, tower, range.key, { [field]: value }),
			rangeFieldId(range.key, field),
		);
	const errorOf = (field: RangeField) => errors[rangeFieldId(range.key, field)];
	const overlap = rangeOverlap(ranges, number - 1);
	const overlapId = rangeOverlapId(range.key);
	const read = readRange(range, numbering);
	const invalid =
		overlap !== undefined ||
		(["first", "last", "finals"] as const).some(
			(field) =>
				errorOf(field) !== undefined && (field !== "finals" || !range.noUnits),
		);

	const fields = (
		<div className="grid grid-cols-2 items-start gap-(--space-3) md:grid-cols-[1fr_1fr_2fr]">
			<RangeInput
				id={rangeFieldId(range.key, "first")}
				label={extending ? "Do andar" : "Primeiro andar"}
				value={range.first}
				error={errorOf("first")}
				describedBy={overlap === undefined ? undefined : overlapId}
				numeric
				onChange={(value) => set("first", value)}
			/>
			<RangeInput
				id={rangeFieldId(range.key, "last")}
				label="Último andar"
				value={range.last}
				error={errorOf("last")}
				numeric
				onChange={(value) => set("last", value)}
			/>
			{!range.noUnits && (
				<RangeInput
					id={rangeFieldId(range.key, "finals")}
					label="Finais"
					value={range.finals}
					error={errorOf("finals")}
					placeholder={numbering === "letters" ? "Ex.: A, B" : "Ex.: 01, 02"}
					help="Separe os finais com vírgula e espaço."
					numeric={false}
					onChange={(value) => set("finals", value)}
					className="col-span-2 md:col-span-1"
				/>
			)}
		</div>
	);

	const line =
		overlap !== undefined ? (
			<p
				id={overlapId}
				className="flex gap-(--space-1) text-sm text-destructive"
			>
				<CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
				{overlap}
			</p>
		) : read ? (
			<p className="text-sm font-medium">{rangeLine(read)}</p>
		) : (
			<p className="text-sm text-muted-foreground">
				Preencha a faixa para ver as unidades.
			</p>
		);

	if (extending) {
		return (
			<div className="grid gap-(--space-3)">
				{fields}
				{line}
			</div>
		);
	}

	const titleId = `${range.key}-title`;
	return (
		<section
			aria-labelledby={titleId}
			className={cn(
				"grid gap-(--space-3) rounded-lg p-(--space-3) shadow-(--ring-hairline)",
				invalid && "shadow-[inset_0_0_0_1px_var(--destructive)]",
			)}
		>
			<div className="flex min-h-(--tap-min) items-center justify-between gap-(--space-2)">
				<h4 id={titleId} className="text-sm font-semibold">
					Faixa {number}
				</h4>
				{ranges.length > 1 && (
					<Button
						type="button"
						variant="ghost"
						size="icon"
						aria-label={`Tirar a faixa ${number}`}
						onClick={() =>
							edit((draft) => withoutRange(draft, tower, range.key))
						}
					>
						<X className="size-5" aria-hidden="true" />
					</Button>
				)}
			</div>
			{fields}
			<CheckField
				id={`${range.key}-no-units`}
				label="Andares sem unidades"
				description="Só áreas comuns, como um andar de lazer."
				checked={range.noUnits}
				onCheckedChange={(noUnits) =>
					edit((draft) => withRange(draft, tower, range.key, { noUnits }))
				}
			/>
			{line}
		</section>
	);
}

function TowerCard({
	tower,
	index,
	draft,
	named,
	errors,
	edit,
}: {
	tower: TowerDraft;
	index: number;
	draft: WizardDraft;
	named: boolean;
	errors: DraftErrors;
	edit: Edit;
}) {
	const extending = draft.extend !== undefined;
	const toggle = (field: "ground" | "hall", value: boolean) =>
		edit((current) => ({
			...current,
			towers: current.towers.map((other, at) =>
				at === index ? { ...other, [field]: value } : other,
			),
		}));
	const nameId = towerFieldId(index, "name");
	const nameError = errors[nameId];
	const floors = towerFloors(tower.ranges, draft.numbering) ?? [];
	const units = floors.reduce((sum, floor) => sum + floor.stacks.length, 0);
	const total = `${draft.towers.length > 1 ? towerLabel(draft, index) : "Total"}: ${plural(units, "unidade", "unidades")} em ${plural(floors.length, "andar", "andares")}`;

	const rangeCards = tower.ranges.map((range, at) => (
		<RangeCard
			key={range.key}
			range={range}
			ranges={tower.ranges}
			number={at + 1}
			tower={index}
			numbering={draft.numbering}
			extending={extending}
			errors={errors}
			edit={edit}
		/>
	));

	const hall = (
		<CheckField
			id={`tower-${index}-hall`}
			label="Hall em cada andar"
			description="Um Hall em cada andar da torre. Cada um usa 1 da reserva."
			checked={tower.hall}
			onCheckedChange={(checked) => toggle("hall", checked)}
		/>
	);

	if (extending) {
		return (
			<div className="grid gap-(--space-4) rounded-lg bg-background p-(--space-4) shadow-(--ring-hairline)">
				{rangeCards}
				{hall}
			</div>
		);
	}

	return (
		<div className="grid gap-(--space-4) rounded-lg bg-background p-(--space-4) shadow-(--ring-hairline)">
			{named && (
				<Field data-invalid={nameError !== undefined}>
					<FieldLabel htmlFor={nameId}>Nome</FieldLabel>
					<Input
						id={nameId}
						autoComplete="off"
						maxLength={60}
						aria-invalid={nameError !== undefined}
						aria-describedby={nameError ? `${nameId}-error` : undefined}
						value={tower.name}
						onChange={(event) =>
							edit(
								(current) => ({
									...current,
									towers: current.towers.map((other, at) =>
										at === index
											? { ...other, name: event.target.value }
											: other,
									),
								}),
								nameId,
							)
						}
					/>
					{nameError && (
						<FieldError id={`${nameId}-error`}>{nameError}</FieldError>
					)}
				</Field>
			)}
			<div className="grid gap-(--space-1)">
				<h3 className="font-medium">Faixas de andares</h3>
				<p className="text-sm text-pretty text-muted-foreground">
					Cada faixa vai de um andar a outro, com os seus finais. Andar fora de
					uma faixa não existe.
				</p>
			</div>
			<div className="grid gap-(--space-2)">{rangeCards}</div>
			<div className="flex flex-wrap items-center justify-between gap-x-(--space-3)">
				<Button
					type="button"
					variant="ghost"
					className="text-primary"
					onClick={() => edit((current) => withNewRange(current, index))}
				>
					<Plus className="size-5" aria-hidden="true" />
					Faixa
				</Button>
				<span className="text-sm font-semibold">{total}</span>
			</div>
			<div className="grid border-t border-border pt-(--space-3)">
				<CheckField
					id={`tower-${index}-ground`}
					label="Térreo sem unidades"
					description="Com hall de entrada"
					checked={tower.ground}
					onCheckedChange={(checked) => toggle("ground", checked)}
				/>
				{hall}
			</div>
		</div>
	);
}

export function TowersStep({
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
	const [refusal, setRefusal] = useState<string>();
	const count = draft.towers.length;
	const setCount = (next: number) =>
		edit((current) => withTowerCount(current, next));

	if (draft.extend) {
		const [tower] = draft.towers;
		return (
			tower && (
				<TowerCard
					tower={tower}
					index={0}
					draft={draft}
					named={false}
					errors={errors}
					edit={edit}
				/>
			)
		);
	}

	function changeNumbering(next: Numbering) {
		const change = withNumbering(draft, next);
		setRefusal(change.refusal);
		const { draft: changed } = change;
		if (changed) edit(() => changed);
	}

	return (
		<div className="grid gap-(--space-4)">
			<div className="flex flex-wrap items-center justify-between gap-(--space-3)">
				<span className="font-medium">Quantas torres?</span>
				<div className="flex items-center gap-(--space-2)">
					<Button
						type="button"
						variant="outline"
						size="icon"
						aria-label="Uma torre a menos"
						disabled={count <= 1}
						onClick={() => setCount(count - 1)}
					>
						<Minus aria-hidden="true" className="size-5" />
					</Button>
					<span
						aria-live="polite"
						className="min-w-12 text-center font-mono text-lg font-semibold"
					>
						{count}
					</span>
					<Button
						type="button"
						variant="outline"
						size="icon"
						aria-label="Uma torre a mais"
						onClick={() => setCount(count + 1)}
					>
						<Plus aria-hidden="true" className="size-5" />
					</Button>
				</div>
			</div>
			{count === 1 && (
				<p className="text-sm text-muted-foreground">
					Com uma torre só, ela não aparece na navegação: a obra abre direto na
					fachada.
				</p>
			)}
			{draft.towers.map((tower, index) => (
				<TowerCard
					key={tower.key}
					tower={tower}
					index={index}
					draft={draft}
					named={count > 1}
					errors={errors}
					edit={edit}
				/>
			))}
			<div className="grid gap-(--space-2)">
				<span className="font-medium" id="numbering-label">
					Numeração das unidades
				</span>
				<ToggleGroup
					type="single"
					aria-labelledby="numbering-label"
					aria-describedby={refusal ? "numbering-error" : undefined}
					value={draft.numbering}
					onValueChange={(next) => {
						if (next === "digits" || next === "letters") changeNumbering(next);
					}}
					className={cn(!desktop && "w-full")}
				>
					<ToggleGroupItem value="digits" className={cn(!desktop && "flex-1")}>
						101, 102
					</ToggleGroupItem>
					<ToggleGroupItem value="letters" className={cn(!desktop && "flex-1")}>
						1A, 1B
					</ToggleGroupItem>
				</ToggleGroup>
				{refusal && <FieldError id="numbering-error">{refusal}</FieldError>}
				<FieldDescription>
					Vale para a obra toda. Depois, qualquer nome se troca na própria
					unidade.
				</FieldDescription>
			</div>
		</div>
	);
}
