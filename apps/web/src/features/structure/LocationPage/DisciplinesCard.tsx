import type { LocationDetail, LocationDiscipline } from "@bluprint/shared";
import { Check, Info, X } from "lucide-react";
import { useId } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { useSetLocationDisciplineMutation } from "../api";
import {
	generalSentence,
	NONE_TURNED_ON,
	OFF_HERE,
	ownListSentence,
} from "../disciplinesText";

const ROW =
	"flex min-h-14 items-center gap-(--space-3) border-t border-border py-(--space-2) pr-(--space-4) pl-(--space-4) first:border-t-0";

function DisciplineBox({
	projectId,
	location,
	discipline,
	anyOn,
}: {
	projectId: string;
	location: LocationDetail;
	discipline: LocationDiscipline;
	anyOn: boolean;
}) {
	const boxId = useId();
	const nameId = useId();
	const hintId = useId();
	const save = useSetLocationDisciplineMutation(projectId, location);
	const applies = save.isPending ? save.variables.applies : discipline.applies;
	const hint = !applies && anyOn;

	function toggle(next: boolean) {
		if (save.isPending) return;
		save.mutate({ disciplineId: discipline.id, applies: next });
	}

	return (
		<li>
			<label htmlFor={boxId} className={`${ROW} cursor-pointer`}>
				<Checkbox
					id={boxId}
					checked={applies}
					aria-labelledby={nameId}
					aria-describedby={hint ? hintId : undefined}
					onCheckedChange={(next) => toggle(next === true)}
				/>
				<span className="grid min-w-0">
					<span
						id={nameId}
						className="text-base font-medium [overflow-wrap:anywhere]"
					>
						{discipline.name}
					</span>
					{hint && (
						<span id={hintId} className="text-sm text-muted-foreground">
							{OFF_HERE}
						</span>
					)}
				</span>
			</label>
		</li>
	);
}

function ReadOnlyRow({ discipline }: { discipline: LocationDiscipline }) {
	const Icon = discipline.applies ? Check : X;
	return (
		<li className={ROW}>
			<Icon aria-hidden="true" className="size-4.5 shrink-0" />
			<span className="text-base font-medium [overflow-wrap:anywhere]">
				{discipline.name}
				{discipline.applies ? " · ligada" : " · desligada"}
			</span>
		</li>
	);
}

export function DisciplinesCard({
	projectId,
	location,
	editable,
}: {
	projectId: string;
	location: LocationDetail;
	editable: boolean;
}) {
	const { disciplines } = location;
	const turnedOn = disciplines.filter(({ applies }) => applies);
	const ownList = ownListSentence(location.type);

	return (
		<section className="grid content-start gap-(--space-3)">
			<div className="flex items-baseline justify-between gap-(--space-3)">
				<h2 className="text-lg font-semibold tracking-tight">Disciplinas</h2>
				<span className="text-sm text-muted-foreground">
					{turnedOn.length} de {disciplines.length}
				</span>
			</div>
			<ul
				aria-label="Disciplinas"
				className="overflow-hidden rounded-xl bg-card shadow-(--ring-hairline)"
			>
				{disciplines.map((discipline) =>
					editable ? (
						<DisciplineBox
							key={discipline.id}
							projectId={projectId}
							location={location}
							discipline={discipline}
							anyOn={turnedOn.length > 0}
						/>
					) : (
						<ReadOnlyRow key={discipline.id} discipline={discipline} />
					),
				)}
			</ul>
			{turnedOn.length > 0 ? (
				<p className="text-sm text-pretty text-muted-foreground">
					{generalSentence(turnedOn.map(({ name }) => name))}
				</p>
			) : (
				<Alert>
					<Info aria-hidden="true" />
					<AlertDescription>{NONE_TURNED_ON}</AlertDescription>
				</Alert>
			)}
			{ownList && (
				<p className="text-sm text-pretty text-muted-foreground">{ownList}</p>
			)}
		</section>
	);
}
