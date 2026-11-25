import {
	type CreateDiscipline,
	createDisciplineSchema,
	type LocationDetail,
	type LocationDiscipline,
	MAX_EXTRA_DISCIPLINES,
} from "@bluprint/shared";
import { useQuery } from "@tanstack/react-query";
import { Check, Info, Plus, X } from "lucide-react";
import { type RefObject, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useClearSessionDraft, useSessionDraft } from "@/features/auth";
import { isProjectDelivered } from "../../projects/api";
import {
	disciplineNameTakenOf,
	disciplinesQueryOptions,
	isDisciplineLimitReached,
	useCreateDisciplineMutation,
	useSetLocationDisciplineMutation,
} from "../api";
import {
	DISCIPLINE_LIMIT_TEXT,
	NewDisciplineDialog,
	type NewDisciplineRefusal,
} from "../components/NewDisciplineDialog";
import {
	generalSentence,
	NONE_TURNED_ON,
	OFF_HERE,
	ownListSentence,
} from "../disciplinesText";

const ROW =
	"flex min-h-14 items-center gap-(--space-3) py-(--space-2) px-(--space-4)";
const ITEM = "border-t border-border first:border-t-0";

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
		<li className={ITEM}>
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
		<li className={`${ITEM} ${ROW}`}>
			<Icon aria-hidden="true" className="size-4.5 shrink-0" />
			<span className="text-base font-medium [overflow-wrap:anywhere]">
				{discipline.name}
				{discipline.applies ? " · ligada" : " · desligada"}
			</span>
		</li>
	);
}

function NewDisciplineEntry({
	projectId,
	location,
	card,
}: {
	projectId: string;
	location: LocationDetail;
	card: RefObject<HTMLElement | null>;
}) {
	const catalog = useQuery(disciplinesQueryOptions(projectId));
	const create = useCreateDisciplineMutation(projectId);
	const restored = useSessionDraft(
		"create-discipline",
		(variables) => createDisciplineSchema.safeParse(variables).data,
	);
	const clearDraft = useClearSessionDraft("create-discipline");
	const [dialog, setDialog] = useState<{ initial?: CreateDiscipline } | null>(
		restored ? { initial: restored } : null,
	);
	const opener = useRef<HTMLButtonElement>(null);
	const atLimit =
		(catalog.data?.items.filter(({ type }) => type === "extra").length ?? 0) >=
		MAX_EXTRA_DISCIPLINES;
	const existing = catalog.data?.items ?? location.disciplines;

	function close() {
		clearDraft();
		setDialog(null);
	}

	async function send(
		discipline: CreateDiscipline,
	): Promise<NewDisciplineRefusal | undefined> {
		try {
			const created = await create.mutateAsync(discipline);
			toast.success(`Disciplina ${created.name} criada.`);
			setDialog(null);
			return undefined;
		} catch (failure) {
			const takenAs = disciplineNameTakenOf(failure);
			if (takenAs !== undefined) return { nameTakenAs: takenAs };
			if (isDisciplineLimitReached(failure)) return { limitReached: true };
			if (isProjectDelivered(failure)) {
				close();
				return undefined;
			}
			throw failure;
		}
	}

	return (
		<>
			{atLimit ? (
				<p className="text-sm text-pretty text-muted-foreground">
					{DISCIPLINE_LIMIT_TEXT}
				</p>
			) : (
				<Button
					ref={opener}
					type="button"
					variant="ghost"
					size="lg"
					className="text-primary max-md:w-full md:justify-self-start"
					onClick={() => setDialog({})}
				>
					<Plus aria-hidden="true" />
					Nova disciplina
				</Button>
			)}
			{dialog && (
				<NewDisciplineDialog
					existing={existing}
					initial={dialog.initial}
					onCreate={send}
					onClose={close}
					returnFocus={() => opener.current ?? card.current}
				/>
			)}
		</>
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
	const headingId = useId();
	const card = useRef<HTMLElement>(null);

	return (
		<section
			ref={card}
			tabIndex={-1}
			aria-labelledby={headingId}
			className="grid content-start gap-(--space-3) outline-none"
		>
			<div className="flex items-baseline justify-between gap-(--space-3)">
				<h2 id={headingId} className="text-lg font-semibold tracking-tight">
					Disciplinas
				</h2>
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
			{editable && (
				<NewDisciplineEntry
					projectId={projectId}
					location={location}
					card={card}
				/>
			)}
		</section>
	);
}
