import { Minus, Plus } from "lucide-react";
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
import {
	type DraftErrors,
	MAX_TOWERS,
	type Numbering,
	type TowerDraft,
	type TowerField,
	towerFieldId,
	type WizardDraft,
	withTowerCount,
} from "./wizardDraft";

type Edit = (
	update: (draft: WizardDraft) => WizardDraft,
	touched?: string,
) => void;

function NumberField({
	index,
	field,
	label,
	value,
	error,
	onChange,
	className,
}: {
	index: number;
	field: TowerField;
	label: string;
	value: string;
	error: string | undefined;
	onChange: (value: string) => void;
	className?: string;
}) {
	const id = towerFieldId(index, field);
	return (
		<Field
			data-invalid={error !== undefined}
			className={cn("min-w-0", className)}
		>
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			<Input
				id={id}
				inputMode="numeric"
				autoComplete="off"
				maxLength={3}
				aria-invalid={error !== undefined}
				aria-describedby={error ? `${id}-error` : undefined}
				value={value}
				onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))}
			/>
			{error && <FieldError id={`${id}-error`}>{error}</FieldError>}
		</Field>
	);
}

function TowerCard({
	tower,
	index,
	named,
	errors,
	edit,
}: {
	tower: TowerDraft;
	index: number;
	named: boolean;
	errors: DraftErrors;
	edit: Edit;
}) {
	const set = (field: TowerField, value: string) =>
		edit(
			(draft) => ({
				...draft,
				towers: draft.towers.map((other, at) =>
					at === index ? { ...other, [field]: value } : other,
				),
			}),
			towerFieldId(index, field),
		);
	const toggle = (field: "ground" | "hall", value: boolean) =>
		edit((draft) => ({
			...draft,
			towers: draft.towers.map((other, at) =>
				at === index ? { ...other, [field]: value } : other,
			),
		}));
	const nameId = towerFieldId(index, "name");
	const nameError = errors[nameId];

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
						onChange={(event) => set("name", event.target.value)}
					/>
					{nameError && (
						<FieldError id={`${nameId}-error`}>{nameError}</FieldError>
					)}
				</Field>
			)}
			<div className="grid grid-cols-2 items-start gap-(--space-3) md:grid-cols-3">
				<NumberField
					index={index}
					field="first"
					label="Primeiro andar"
					value={tower.first}
					error={errors[towerFieldId(index, "first")]}
					onChange={(value) => set("first", value)}
				/>
				<NumberField
					index={index}
					field="last"
					label="Último andar"
					value={tower.last}
					error={errors[towerFieldId(index, "last")]}
					onChange={(value) => set("last", value)}
				/>
				<NumberField
					index={index}
					field="perFloor"
					label="Unidades por andar"
					value={tower.perFloor}
					error={errors[towerFieldId(index, "perFloor")]}
					onChange={(value) => set("perFloor", value)}
					className="col-span-2 md:col-span-1"
				/>
			</div>
			<div className="grid">
				<Field
					orientation="horizontal"
					className="min-h-(--tap-min) items-center"
				>
					<Checkbox
						id={`tower-${index}-ground`}
						checked={tower.ground}
						onCheckedChange={(checked) => toggle("ground", checked === true)}
					/>
					<FieldLabel htmlFor={`tower-${index}-ground`} className="grid gap-0">
						<span className="font-medium">Térreo sem unidades</span>
						<span className="text-sm font-normal text-muted-foreground">
							Com hall de entrada
						</span>
					</FieldLabel>
				</Field>
				<Field
					orientation="horizontal"
					className="min-h-(--tap-min) items-center"
				>
					<Checkbox
						id={`tower-${index}-hall`}
						checked={tower.hall}
						onCheckedChange={(checked) => toggle("hall", checked === true)}
					/>
					<FieldLabel htmlFor={`tower-${index}-hall`} className="font-medium">
						Hall em cada andar
					</FieldLabel>
				</Field>
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
	const count = draft.towers.length;
	const setCount = (next: number) =>
		edit((current) => withTowerCount(current, next));

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
						disabled={count >= MAX_TOWERS}
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
					value={draft.numbering}
					onValueChange={(next) => {
						if (next) {
							edit((current) => ({ ...current, numbering: next as Numbering }));
						}
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
				<FieldDescription>
					Depois, qualquer nome se troca na própria unidade.
				</FieldDescription>
			</div>
		</div>
	);
}
