import { type Typology, tidyLocationName } from "@bluprint/shared";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { uuidV7 } from "@/lib/uuidV7";
import { TypologyNameDialog } from "../ConfigurationSections/TypologyNameDialog";
import { AddTag } from "../components/Tags";
import { CommonAreaTypologySelect } from "./CommonAreaTypologySelect";
import { SELECT } from "./fieldStyles";
import {
	catalogOf,
	ofKind,
	takenTypologyNames,
	typologyNameOf,
} from "./typologyCatalog";
import {
	type AreaDraft,
	type DraftErrors,
	floorAreaFieldId,
	floorAreaProblem,
	listedFloorAreas,
	SINGLE_TOWER_NAME,
	typologyLimitReached,
	type WizardDraft,
	withNewTypology,
} from "./wizardDraft";

type Edit = (update: (draft: WizardDraft) => WizardDraft) => boolean;

export type FloorAreaInput = {
	name: string;
	tower: number;
	floor: string;
	typology: string | null;
};

export const EMPTY_FLOOR_AREA: FloorAreaInput = {
	name: "",
	tower: 0,
	floor: "",
	typology: null,
};

function Group({
	title,
	description,
	children,
}: {
	title: string;
	description?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="grid gap-(--space-2)">
			<span className="font-medium">{title}</span>
			{description && (
				<span className="-mt-1 text-sm text-muted-foreground">
					{description}
				</span>
			)}
			{children}
		</div>
	);
}

function FloorAreaForm({
	draft,
	value,
	onChange,
	onAdd,
	onCancel,
	commonTypes,
	onCreateType,
}: {
	draft: WizardDraft;
	value: FloorAreaInput;
	onChange: (value: FloorAreaInput) => void;
	onAdd: (area: FloorAreaInput) => void;
	onCancel: () => void;
	commonTypes: { key: string; name: string }[];
	onCreateType: (select: HTMLSelectElement) => void;
}) {
	const several = draft.towers.length > 1;
	const { name, tower, floor, typology } = value;
	const [errors, setErrors] = useState<{ name?: string; floor?: string }>({});

	function submit(event: React.FormEvent) {
		event.preventDefault();
		const found: typeof errors = {};
		const trimmed = tidyLocationName(name);
		if (trimmed === "") found.name = "Informe o nome da área comum.";
		if (floor === "") found.floor = "Informe o andar.";
		else {
			const problem = floorAreaProblem(
				draft,
				{ tower, floor, name: trimmed },
				listedFloorAreas(draft),
			);
			if (problem) found[problem.field] = problem.message;
		}
		setErrors(found);
		if (Object.keys(found).length > 0) return;
		onAdd({ tower, floor, name: trimmed, typology });
	}

	return (
		<form
			onSubmit={submit}
			noValidate
			aria-label="Área comum num andar"
			className="grid gap-(--space-3) rounded-lg bg-background p-(--space-4) shadow-(--ring-hairline)"
		>
			<Field data-invalid={errors.name !== undefined}>
				<FieldLabel htmlFor="floor-area-name">Nome da área comum</FieldLabel>
				<Input
					id="floor-area-name"
					autoComplete="off"
					maxLength={60}
					placeholder="Ex.: Terraço"
					aria-invalid={errors.name !== undefined}
					value={name}
					onChange={(event) => onChange({ ...value, name: event.target.value })}
				/>
				{errors.name && <FieldError>{errors.name}</FieldError>}
			</Field>
			<div className="grid grid-cols-2 items-start gap-(--space-3)">
				{several && (
					<Field>
						<FieldLabel htmlFor="floor-area-tower">Torre</FieldLabel>
						<select
							id="floor-area-tower"
							className={SELECT}
							value={tower}
							onChange={(event) =>
								onChange({ ...value, tower: Number(event.target.value) })
							}
						>
							{draft.towers.map((option, index) => (
								<option key={option.key} value={index}>
									{option.name}
								</option>
							))}
						</select>
					</Field>
				)}
				<Field data-invalid={errors.floor !== undefined}>
					<FieldLabel htmlFor="floor-area-floor">Andar</FieldLabel>
					<Input
						id="floor-area-floor"
						inputMode="numeric"
						autoComplete="off"
						maxLength={3}
						aria-invalid={errors.floor !== undefined}
						value={floor}
						onChange={(event) =>
							onChange({
								...value,
								floor: event.target.value.replace(/\D/g, ""),
							})
						}
					/>
					{errors.floor && <FieldError>{errors.floor}</FieldError>}
				</Field>
			</div>
			<CommonAreaTypologySelect
				id="floor-area-typology"
				label="Tipologia da área comum"
				value={typology}
				options={commonTypes}
				createDisabled={typologyLimitReached(draft)}
				onChange={(key) => onChange({ ...value, typology: key })}
				onCreate={onCreateType}
			/>
			<div className="flex gap-(--space-2)">
				<Button type="submit" variant="outline">
					Adicionar ao andar
				</Button>
				<Button type="button" variant="ghost" onClick={onCancel}>
					Cancelar
				</Button>
			</div>
		</form>
	);
}

function areaLabel(name: string, typologyName: string | undefined): string {
	return typologyName ? `${name} · ${typologyName}` : name;
}

function AreaTags({
	areas,
	catalog,
	onRemove,
}: {
	areas: AreaDraft[];
	catalog: ReturnType<typeof catalogOf>;
	onRemove: (index: number) => void;
}) {
	if (areas.length === 0) return null;
	return (
		<ul className="flex flex-wrap gap-(--space-2)">
			{areas.map((area, index) => (
				<li
					key={area.name}
					className="inline-flex min-h-8 items-center gap-1 rounded-full bg-muted pl-3 text-sm"
				>
					<span className="[overflow-wrap:anywhere]">
						{areaLabel(area.name, typologyNameOf(catalog, area.typology))}
					</span>
					<button
						type="button"
						aria-label={`Tirar ${area.name}`}
						onClick={() => onRemove(index)}
						className="relative grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground outline-none after:absolute after:-inset-2 hover:text-foreground focus-visible:shadow-(--shadow-focus)"
					>
						<X className="size-4" aria-hidden="true" />
					</button>
				</li>
			))}
		</ul>
	);
}

export function CommonAreasStep({
	draft,
	errors,
	edit,
	floorArea,
	onFloorAreaChange,
	existing,
}: {
	draft: WizardDraft;
	errors: DraftErrors;
	edit: Edit;
	floorArea: FloorAreaInput | undefined;
	onFloorAreaChange: (value: FloorAreaInput | undefined) => void;
	existing: readonly Typology[];
}) {
	const several = draft.towers.length > 1;
	const towerName = (index: number) =>
		draft.extend?.towerName ??
		(several ? (draft.towers[index]?.name ?? "") : SINGLE_TOWER_NAME);
	const places = listedFloorAreas(draft);
	const catalog = catalogOf(draft, existing);
	const commonTypes = ofKind(catalog, "common_area");
	const [projectType, setProjectType] = useState<string | null>(null);
	const [towerType, setTowerType] = useState<string | null>(null);
	const [naming, setNaming] = useState<{
		returnFocus: () => HTMLElement | null;
		apply: (key: string) => void;
	}>();
	const chosen = (picked: string | null) =>
		commonTypes.some((option) => option.key === picked) ? picked : null;

	function openCreate(select: HTMLSelectElement, apply: (key: string) => void) {
		setNaming({ returnFocus: () => select, apply });
	}

	return (
		<div className="grid gap-(--space-5)">
			{!draft.extend && (
				<Group
					title="Da obra"
					description="Fora das torres: garagem, fachada, piscina."
				>
					<AreaTags
						areas={draft.projectAreas}
						catalog={catalog}
						onRemove={(index) =>
							edit((current) => ({
								...current,
								projectAreas: current.projectAreas.filter(
									(_, at) => at !== index,
								),
							}))
						}
					/>
					<CommonAreaTypologySelect
						id="project-area-typology"
						label="Tipologia da área comum"
						value={chosen(projectType)}
						options={commonTypes}
						createDisabled={typologyLimitReached(draft)}
						onChange={setProjectType}
						onCreate={(select) => openCreate(select, setProjectType)}
					/>
					<AddTag
						label="Área comum da obra"
						placeholder="Ex.: Guarita"
						existing={draft.projectAreas.map((area) => area.name)}
						duplicateMessage="Essa área comum já está na lista."
						onAdd={(name) =>
							edit((current) => ({
								...current,
								projectAreas: [
									...current.projectAreas,
									{ name, typology: chosen(projectType) },
								],
							}))
						}
					/>
				</Group>
			)}
			{several && (
				<Group
					title="Em cada torre"
					description="Criada uma vez em cada torre."
				>
					<AreaTags
						areas={draft.towerAreas}
						catalog={catalog}
						onRemove={(index) =>
							edit((current) => ({
								...current,
								towerAreas: current.towerAreas.filter((_, at) => at !== index),
							}))
						}
					/>
					<CommonAreaTypologySelect
						id="tower-area-typology"
						label="Tipologia da área comum"
						value={chosen(towerType)}
						options={commonTypes}
						createDisabled={typologyLimitReached(draft)}
						onChange={setTowerType}
						onCreate={(select) => openCreate(select, setTowerType)}
					/>
					<AddTag
						label="Área comum de cada torre"
						placeholder="Ex.: Salão de festas"
						existing={draft.towerAreas.map((area) => area.name)}
						duplicateMessage="Essa área comum já está na lista."
						onAdd={(name) =>
							edit((current) => ({
								...current,
								towerAreas: [
									...current.towerAreas,
									{ name, typology: chosen(towerType) },
								],
							}))
						}
					/>
				</Group>
			)}
			<Group
				title="Num andar só"
				description="Para o que só existe ali, como o terraço da cobertura."
			>
				{places.length > 0 ? (
					<ul className="grid rounded-xl bg-card shadow-(--ring-hairline)">
						{places.map((area) => {
							const id = floorAreaFieldId(area.key);
							const error = errors[id];
							return (
								<li
									key={area.key}
									id={id}
									tabIndex={-1}
									aria-describedby={error ? `${id}-error` : undefined}
									className="flex min-h-14 scroll-mt-6 items-center gap-(--space-2) pl-(--space-4) outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
								>
									<span className="grid min-w-0 flex-1 gap-(--space-1) [overflow-wrap:anywhere]">
										<span>
											<span className="font-medium">
												{areaLabel(
													area.name,
													typologyNameOf(catalog, area.typology),
												)}
											</span>
											<span className="text-sm text-muted-foreground">
												{` · ${towerName(area.tower)}, ${area.floor}º andar`}
											</span>
										</span>
										{error && (
											<FieldError id={`${id}-error`}>{error}</FieldError>
										)}
									</span>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										aria-label={`Tirar ${area.name}`}
										onClick={() =>
											edit((current) => ({
												...current,
												floorAreas: current.floorAreas.filter(
													(other) => other.key !== area.key,
												),
											}))
										}
									>
										<X className="size-5" aria-hidden="true" />
									</Button>
								</li>
							);
						})}
					</ul>
				) : (
					<span className="text-sm text-muted-foreground">Nenhuma.</span>
				)}
				{floorArea ? (
					<FloorAreaForm
						draft={draft}
						value={floorArea}
						commonTypes={commonTypes}
						onChange={onFloorAreaChange}
						onCancel={() => onFloorAreaChange(undefined)}
						onCreateType={(select) =>
							openCreate(select, (key) =>
								onFloorAreaChange({ ...floorArea, typology: key }),
							)
						}
						onAdd={(area) => {
							const added = edit((current) => ({
								...current,
								floorAreas: [...current.floorAreas, { key: uuidV7(), ...area }],
							}));
							if (added) onFloorAreaChange(undefined);
						}}
					/>
				) : (
					<Button
						type="button"
						variant="ghost"
						className="justify-self-start text-primary"
						onClick={() => onFloorAreaChange(EMPTY_FLOOR_AREA)}
					>
						<Plus className="size-5" aria-hidden="true" />
						Área comum num andar
					</Button>
				)}
			</Group>
			{naming && (
				<TypologyNameDialog
					draft={{
						locationType: "common_area",
						takenNames: takenTypologyNames(draft, existing),
					}}
					onClose={() => setNaming(undefined)}
					onCreate={(name) => {
						let created = "";
						edit((current) => {
							const next = withNewTypology(current, name, "common_area");
							created = next.typologies.at(-1)?.key ?? "";
							return next;
						});
						if (created) naming.apply(created);
					}}
					returnFocus={naming.returnFocus}
				/>
			)}
		</div>
	);
}
