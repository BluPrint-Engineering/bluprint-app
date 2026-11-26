import {
	type Discipline,
	type DisciplineBatch,
	type LocationDetail,
	MAX_EXTRA_DISCIPLINES,
	type Structure,
	type StructureFloor,
	type StructureTower,
} from "@bluprint/shared";
import { Check } from "lucide-react";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Field, FieldLabel } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ApiError } from "@/lib/api";
import { isProjectDelivered } from "../../projects/api";
import { isLocationNotFound, useApplyDisciplineBatchMutation } from "../api";
import {
	BATCH_FAILED_TEXT,
	BATCH_GONE_TEXT,
	BATCH_PENDING,
	BATCH_PLACES_NOTE,
	BATCH_SCOPE_NOTE,
	BATCH_TITLE,
	batchAppliedText,
	batchApplyLabel,
	EMPTY_FLOOR,
	EMPTY_TOWER,
	NO_FLOORS,
	NO_TOWER,
} from "../disciplinesText";
import { SELECT } from "../StructureWizard/fieldStyles";
import { CheckRow } from "./CheckRow";
import { DisciplineChecklist } from "./DisciplineChecklist";
import { FormDialog } from "./FormDialog";
import { NewDisciplineDialog } from "./NewDisciplineDialog";
import { useCreateDiscipline } from "./useCreateDiscipline";

type Mode = "locations" | "floor" | "tower";
type Problem = "gone" | "failed";

const MODES: { value: Mode; label: string }[] = [
	{ value: "locations", label: "Locais" },
	{ value: "floor", label: "Um andar" },
	{ value: "tower", label: "Uma torre" },
];

const isMode = (value: string): value is Mode =>
	MODES.some((mode) => mode.value === value);

const isSpecific = ({ type }: Discipline) => type !== "general";

const placesOf = (floor: StructureFloor | undefined) =>
	floor ? [...floor.units, ...floor.commonAreas] : [];

const placesOfTower = (tower: StructureTower) => [
	...tower.floors.flatMap(placesOf),
	...tower.commonAreas,
];

function opening(from: LocationDetail, shown: readonly Discipline[]) {
	const parent = from.ancestors.at(-1);
	const onFloor = from.type === "floor" ? from : parent;
	const floorId = onFloor?.type === "floor" ? onFloor.id : undefined;
	const towerId =
		from.type === "tower"
			? from.id
			: from.ancestors.find((ancestor) => ancestor.type === "tower")?.id;
	const leaf = from.type === "unit" || from.type === "common_area";
	const mode: Mode =
		from.type === "floor"
			? "floor"
			: from.type === "tower"
				? "tower"
				: "locations";
	const own = leaf && floorId === undefined;
	const checked = new Set(
		shown
			.filter((discipline) =>
				leaf
					? from.disciplines.some(
							({ id, applies }) => id === discipline.id && applies,
						)
					: discipline.type === "base" || discipline.appliesEverywhere,
			)
			.map(({ id }) => id),
	);

	return {
		mode,
		towerId,
		floorId,
		own,
		chosen:
			leaf && floorId !== undefined ? new Set([from.id]) : new Set<string>(),
		checked,
	};
}

function toggle(
	set: ReadonlySet<string>,
	id: string,
	next: boolean,
): ReadonlySet<string> {
	const copy = new Set(set);
	if (next) copy.add(id);
	else copy.delete(id);
	return copy;
}

export function DisciplineBatchDialog({
	projectId,
	structure,
	catalog,
	from,
	onClose,
	returnFocus,
}: {
	projectId: string;
	structure: Structure;
	catalog: readonly Discipline[];
	from: LocationDetail;
	onClose: () => void;
	returnFocus: () => HTMLElement | null | undefined;
}) {
	const formId = useId();
	const modeId = useId();
	const [start] = useState(() => opening(from, catalog.filter(isSpecific)));
	const [known, setKnown] = useState<readonly Discipline[]>(catalog);
	const [mode, setMode] = useState<Mode>(start.mode);
	const [selected, setSelected] = useState({
		towerId: start.towerId,
		floorId: start.floorId,
	});
	const [chosen, setChosen] = useState<ReadonlySet<string>>(start.chosen);
	const [includeOwn, setIncludeOwn] = useState(start.own);
	const [checked, setChecked] = useState<ReadonlySet<string>>(start.checked);
	const [creating, setCreating] = useState(false);
	const [problem, setProblem] = useState<Problem>();
	const [pending, setPending] = useState(false);
	const sending = useRef(false);
	const newButton = useRef<HTMLButtonElement>(null);
	const apply = useApplyDisciplineBatchMutation(projectId);
	const createDiscipline = useCreateDiscipline(projectId, {
		onCreated: (created) => {
			setKnown((current) => [...current, created]);
			setChecked((current) => new Set(current).add(created.id));
			setCreating(false);
		},
		onDelivered: () => setCreating(false),
	});

	const shown = known.filter(isSpecific);
	const { towers } = structure;
	const tower = towers.find(({ id }) => id === selected.towerId) ?? towers[0];
	const floor =
		tower?.floors.find(({ id }) => id === selected.floorId) ?? tower?.floors[0];
	const places = placesOf(floor);
	const markedPlaces = places.filter(({ id }) => chosen.has(id));
	const ownRow = start.own;

	const target = ((): DisciplineBatch["target"] | undefined => {
		if (mode === "floor") {
			return floor && { type: "floor", locationId: floor.id };
		}
		if (mode === "tower") {
			return tower && { type: "tower", locationId: tower.id };
		}
		const locationIds = [
			...(ownRow && includeOwn ? [from.id] : []),
			...markedPlaces.map(({ id }) => id),
		];
		return locationIds.length > 0
			? { type: "locations", locationIds }
			: undefined;
	})();

	const count = ((): number => {
		if (mode === "floor") return places.length;
		if (mode === "tower") return tower ? placesOfTower(tower).length : 0;
		return markedPlaces.length + (ownRow && includeOwn ? 1 : 0);
	})();

	function chooseTower(towerId: string) {
		setSelected({
			towerId,
			floorId: towers.find(({ id }) => id === towerId)?.floors[0]?.id,
		});
		setChosen(new Set());
	}

	function chooseFloor(floorId: string) {
		setSelected({ towerId: tower?.id, floorId });
		setChosen(new Set());
	}

	async function submit() {
		if (sending.current || !target || count === 0) return;
		sending.current = true;
		setPending(true);
		setProblem(undefined);
		try {
			const { locations } = await apply.mutateAsync({
				target,
				on: shown.filter(({ id }) => checked.has(id)).map(({ id }) => id),
				off: shown.filter(({ id }) => !checked.has(id)).map(({ id }) => id),
			});
			toast.success(batchAppliedText(locations));
			onClose();
		} catch (failure) {
			if (failure instanceof ApiError && failure.status === 401) return;
			if (isProjectDelivered(failure)) return;
			setProblem(isLocationNotFound(failure) ? "gone" : "failed");
		} finally {
			sending.current = false;
			setPending(false);
		}
	}

	const towerSelect = towers.length > 1 && (
		<Field>
			<FieldLabel htmlFor={`${formId}-tower`}>Torre</FieldLabel>
			<select
				id={`${formId}-tower`}
				className={SELECT}
				value={tower?.id}
				disabled={pending}
				onChange={(event) => chooseTower(event.target.value)}
			>
				{towers.map(({ id, name }) => (
					<option key={id} value={id}>
						{name}
					</option>
				))}
			</select>
		</Field>
	);

	const floorSelect = tower && tower.floors.length > 0 && (
		<Field>
			<FieldLabel htmlFor={`${formId}-floor`}>Andar</FieldLabel>
			<select
				id={`${formId}-floor`}
				className={SELECT}
				value={floor?.id}
				disabled={pending}
				onChange={(event) => chooseFloor(event.target.value)}
			>
				{tower.floors.map(({ id, name }) => (
					<option key={id} value={id}>
						{name}
					</option>
				))}
			</select>
		</Field>
	);

	return (
		<>
			<FormDialog
				title={BATCH_TITLE}
				submitLabel={batchApplyLabel(count)}
				SubmitIcon={Check}
				pendingLabel={BATCH_PENDING}
				pending={pending}
				submitDisabled={count === 0}
				formId={formId}
				onSubmit={() => void submit()}
				onClose={onClose}
				returnFocus={returnFocus}
			>
				{problem && (
					<Alert variant="destructive">
						<AlertTitle>Nada mudou</AlertTitle>
						<AlertDescription>
							{problem === "gone" ? BATCH_GONE_TEXT : BATCH_FAILED_TEXT}
						</AlertDescription>
					</Alert>
				)}
				<div className="grid gap-(--space-3)">
					<span id={modeId} className="text-sm font-medium">
						Onde
					</span>
					<ToggleGroup
						type="single"
						aria-labelledby={modeId}
						value={mode}
						disabled={pending}
						onValueChange={(next) => {
							if (isMode(next)) setMode(next);
						}}
						className="w-full"
					>
						{MODES.map(({ value, label }) => (
							<ToggleGroupItem key={value} value={value} className="flex-1">
								{label}
							</ToggleGroupItem>
						))}
					</ToggleGroup>
					{towerSelect}
					{mode !== "tower" && floorSelect}
					{towers.length === 0 && mode !== "locations" && (
						<p className="text-sm text-pretty text-muted-foreground">
							{NO_TOWER}
						</p>
					)}
					{tower && tower.floors.length === 0 && mode !== "tower" && (
						<p className="text-sm text-pretty text-muted-foreground">
							{NO_FLOORS}
						</p>
					)}
					{mode === "locations" && (
						<>
							{(ownRow || places.length > 0) && (
								<ul
									aria-label="Locais"
									className="overflow-hidden rounded-xl bg-card shadow-(--ring-hairline)"
								>
									{ownRow && (
										<CheckRow
											checked={includeOwn}
											disabled={pending}
											onCheckedChange={setIncludeOwn}
										>
											{from.name} · este local
										</CheckRow>
									)}
									{places.map(({ id, name }) => (
										<CheckRow
											key={id}
											checked={chosen.has(id)}
											disabled={pending}
											onCheckedChange={(next) =>
												setChosen((current) => toggle(current, id, next))
											}
										>
											{name}
										</CheckRow>
									))}
								</ul>
							)}
							{floor && places.length === 0 && (
								<p className="text-sm text-pretty text-muted-foreground">
									{EMPTY_FLOOR}
								</p>
							)}
							{places.length > 0 && (
								<p className="text-sm text-pretty text-muted-foreground">
									{BATCH_PLACES_NOTE}
								</p>
							)}
						</>
					)}
					{mode === "floor" && floor && places.length === 0 && (
						<p className="text-sm text-pretty text-muted-foreground">
							{EMPTY_FLOOR}
						</p>
					)}
					{mode === "tower" && tower && count === 0 && (
						<p className="text-sm text-pretty text-muted-foreground">
							{EMPTY_TOWER}
						</p>
					)}
					{mode !== "locations" && (
						<p className="text-sm text-pretty text-muted-foreground">
							{BATCH_SCOPE_NOTE}
						</p>
					)}
				</div>
				<div className="grid gap-(--space-3)">
					<span className="text-sm font-medium">Disciplinas</span>
					<DisciplineChecklist
						label="Disciplinas do lote"
						disciplines={shown}
						checked={checked}
						disabled={pending}
						onToggle={(id, next) =>
							setChecked((current) => toggle(current, id, next))
						}
						atLimit={
							shown.filter(({ type }) => type === "extra").length >=
							MAX_EXTRA_DISCIPLINES
						}
						onNew={() => setCreating(true)}
						newRef={newButton}
					/>
				</div>
			</FormDialog>
			{creating && (
				<NewDisciplineDialog
					existing={known}
					onCreate={createDiscipline}
					onClose={() => setCreating(false)}
					returnFocus={() => newButton.current}
				/>
			)}
		</>
	);
}
