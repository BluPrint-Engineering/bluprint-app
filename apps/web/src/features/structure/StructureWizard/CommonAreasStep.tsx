import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { uuidV7 } from "@/lib/uuidV7";
import { AddTag, Tags } from "./Tags";
import {
	type DraftErrors,
	floorAreaFieldId,
	floorAreaProblem,
	listedFloorAreas,
	SINGLE_TOWER_NAME,
	type WizardDraft,
} from "./wizardDraft";

type Edit = (update: (draft: WizardDraft) => WizardDraft) => void;

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

const SELECT =
	"h-(--control-h) w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

function FloorAreaForm({
	draft,
	onAdd,
	onCancel,
}: {
	draft: WizardDraft;
	onAdd: (area: { tower: number; floor: string; name: string }) => void;
	onCancel: () => void;
}) {
	const several = draft.towers.length > 1;
	const [name, setName] = useState("");
	const [tower, setTower] = useState(0);
	const [floor, setFloor] = useState("");
	const [errors, setErrors] = useState<{ name?: string; floor?: string }>({});

	function submit(event: React.FormEvent) {
		event.preventDefault();
		const found: typeof errors = {};
		const trimmed = name.trim().replace(/\s+/g, " ");
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
		onAdd({ tower, floor, name: trimmed });
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
					onChange={(event) => setName(event.target.value)}
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
							onChange={(event) => setTower(Number(event.target.value))}
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
							setFloor(event.target.value.replace(/\D/g, ""))
						}
					/>
					{errors.floor && <FieldError>{errors.floor}</FieldError>}
				</Field>
			</div>
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

export function CommonAreasStep({
	draft,
	errors,
	edit,
}: {
	draft: WizardDraft;
	errors: DraftErrors;
	edit: Edit;
}) {
	const [adding, setAdding] = useState(false);
	const several = draft.towers.length > 1;
	const towerName = (index: number) =>
		several ? (draft.towers[index]?.name ?? "") : SINGLE_TOWER_NAME;
	const places = listedFloorAreas(draft);

	return (
		<div className="grid gap-(--space-5)">
			<Group
				title="Da obra"
				description="Fora das torres: garagem, fachada, piscina."
			>
				<Tags
					items={draft.projectAreas}
					onRemove={(index) =>
						edit((current) => ({
							...current,
							projectAreas: current.projectAreas.filter(
								(_, at) => at !== index,
							),
						}))
					}
				/>
				<AddTag
					label="Área comum da obra"
					placeholder="Ex.: Guarita"
					existing={draft.projectAreas}
					onAdd={(name) =>
						edit((current) => ({
							...current,
							projectAreas: [...current.projectAreas, name],
						}))
					}
				/>
			</Group>
			{several && (
				<Group
					title="Em cada torre"
					description="Criada uma vez em cada torre."
				>
					<Tags
						items={draft.towerAreas}
						onRemove={(index) =>
							edit((current) => ({
								...current,
								towerAreas: current.towerAreas.filter((_, at) => at !== index),
							}))
						}
					/>
					<AddTag
						label="Área comum de cada torre"
						placeholder="Ex.: Salão de festas"
						existing={draft.towerAreas}
						onAdd={(name) =>
							edit((current) => ({
								...current,
								towerAreas: [...current.towerAreas, name],
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
									className="flex min-h-14 scroll-mt-22 items-center gap-(--space-2) pl-(--space-4) outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
								>
									<span className="grid min-w-0 flex-1 gap-(--space-1) [overflow-wrap:anywhere]">
										<span>
											<span className="font-medium">{area.name}</span>
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
				{adding ? (
					<FloorAreaForm
						draft={draft}
						onCancel={() => setAdding(false)}
						onAdd={(area) => {
							edit((current) => ({
								...current,
								floorAreas: [...current.floorAreas, { key: uuidV7(), ...area }],
							}));
							setAdding(false);
						}}
					/>
				) : (
					<Button
						type="button"
						variant="ghost"
						className="justify-self-start text-primary"
						onClick={() => setAdding(true)}
					>
						<Plus className="size-5" aria-hidden="true" />
						Área comum num andar
					</Button>
				)}
			</Group>
		</div>
	);
}
