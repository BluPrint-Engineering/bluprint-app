import {
	LOCATION_NOT_FOUND,
	LOCATION_PARENT_INVALID,
	MAX_LOCATIONS_PER_REQUEST,
} from "@bluprint/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { type RefObject, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { uuidV7 } from "@/lib/uuidV7";
import {
	availableUnitsOf,
	isProjectDelivered,
	projectQueryOptions,
} from "../../projects/api";
import { ChangeReservationDialog } from "../../projects/components/ChangeReservationDialog";
import {
	namesTakenOf,
	projectUnitsQueryOptions,
	structureQueryOptions,
	useDuplicateLocationMutation,
} from "../api";
import {
	assertCopyMatches,
	buildDuplicate,
	type DuplicateKind,
	type DuplicateSource,
	findDuplicateSource,
	locationsCopied,
	renumberedUnitNames,
	StaleCopyError,
	sourceName,
	suggestedCopyName,
	unitsCopied,
} from "../duplicate";
import {
	copiedUnitsTakenText,
	duplicatedToast,
	duplicateGoneText,
	duplicateTitle,
	duplicateTooLargeText,
} from "../duplicateText";
import { nameProblem, type Scope, takenText, uniqueHint } from "../naming";
import { duplicateLine, duplicateOverText } from "../reserveText";
import { NameDialogFrame, NameDialogLayout } from "./NameDialog";

const DUPLICATE_FAILED =
	"Não foi possível duplicar. Confira sua conexão e tente de novo.";

const DUPLICATE_STALE =
	"Outra pessoa mudou as unidades ou áreas comuns enquanto você duplicava. A estrutura foi atualizada: confira e tente de novo.";

const DUPLICATE_REFUSED =
	"A estrutura mudou enquanto você duplicava. Recarregue a página e tente de novo.";

const SCOPES: Record<DuplicateKind, Scope> = {
	tower: "project",
	floor: "tower",
	unit: "tower",
};

export interface DuplicateTarget {
	type: DuplicateKind;
	id: string;
}

interface DuplicateDialogProps {
	projectId: string;
	target: DuplicateTarget;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	returnFocus: RefObject<HTMLElement | null>;
}

function DuplicateContent({
	projectId,
	source,
	several,
	suggestion,
	desktop,
	field,
	onDone,
}: {
	projectId: string;
	source: DuplicateSource;
	several: boolean;
	suggestion: string;
	desktop: boolean;
	field: RefObject<HTMLInputElement | null>;
	onDone: () => void;
}) {
	const formId = useId();
	const project = useQuery(projectQueryOptions(projectId));
	const units = useQuery(projectUnitsQueryOptions(projectId));
	const duplicate = useDuplicateLocationMutation(projectId);
	const ids = useRef(new Map<string, string>());
	const [name, setName] = useState(suggestion);
	const [problem, setProblem] = useState<string>();
	const [reserving, setReserving] = useState(false);
	const alterReservation = useRef<HTMLButtonElement>(null);
	const saving = duplicate.isPending;
	const mono = source.type === "unit";
	const admin = project.data?.role === "admin";
	const title = duplicateTitle(source.type, sourceName(source));
	const towerName = several ? source.tower.name : undefined;

	const toCreate = unitsCopied(source);
	const remaining = units.data?.remaining;
	const over = remaining !== undefined && toCreate > remaining;
	const locations = locationsCopied(source);
	const tooLarge = locations > MAX_LOCATIONS_PER_REQUEST;

	const taken = namesTakenOf(duplicate.error);
	const nameTaken =
		taken?.some((each) => each === name.trim()) === true
			? takenText(source.type, name.trim(), SCOPES[source.type], towerName)
			: undefined;
	const error = problem ?? nameTaken;
	const otherNames = nameTaken === undefined ? taken : undefined;
	const renumbered = renumberedUnitNames(source, name.trim());
	const failed =
		duplicate.isError &&
		taken === undefined &&
		availableUnitsOf(duplicate.error) === undefined;
	const failure =
		duplicate.error instanceof ApiError ? duplicate.error : undefined;
	const gone =
		failure?.problem?.code === LOCATION_NOT_FOUND ||
		failure?.problem?.code === LOCATION_PARENT_INVALID;
	const refused = failure?.status === 400;

	const queryClient = useQueryClient();
	useEffect(() => {
		if (!gone) return;
		return () => {
			void queryClient.invalidateQueries({
				queryKey: ["structure", projectId],
			});
		};
	}, [gone, queryClient, projectId]);

	function idFor(key: string) {
		let id = ids.current.get(key);
		if (!id) {
			id = uuidV7();
			ids.current.set(key, id);
		}
		return id;
	}

	function submit() {
		const found = nameProblem(name);
		if (found) return setProblem(found);
		const finalName = name.trim();
		duplicate.mutate(
			{
				locationId: locationOf(source),
				build: (below) => {
					assertCopyMatches(source, below);
					return buildDuplicate(source, finalName, below, idFor);
				},
			},
			{
				onSuccess: () => {
					toast.success(duplicatedToast(source.type, finalName));
					onDone();
				},
				onError: (failure) => {
					if (isProjectDelivered(failure)) onDone();
					if (failure instanceof StaleCopyError) {
						void queryClient.invalidateQueries({
							queryKey: ["structure", projectId],
						});
					}
				},
			},
		);
	}

	const count =
		toCreate === 0 ? null : over ? (
			<Alert variant="destructive" id={`${formId}-count`}>
				<AlertDescription>
					{duplicateOverText(title, toCreate, remaining)}
					{admin && (
						<>
							{" "}
							<button
								ref={alterReservation}
								type="button"
								className="relative underline underline-offset-3 after:absolute after:-inset-y-3 after:inset-x-0 hover:text-foreground"
								onClick={() => setReserving(true)}
							>
								Alterar reserva
							</button>
						</>
					)}
				</AlertDescription>
			</Alert>
		) : units.isPending ? (
			<Skeleton className="h-5 w-4/5" aria-hidden="true" />
		) : remaining === undefined ? null : (
			<p id={`${formId}-count`} className="text-sm text-muted-foreground">
				{duplicateLine(toCreate, remaining)}
			</p>
		);

	const form = (
		<form
			id={formId}
			noValidate
			className="grid gap-(--space-3)"
			onSubmit={(event) => {
				event.preventDefault();
				if (!saving) submit();
			}}
		>
			{failed && (
				<Alert variant="destructive">
					<AlertDescription>
						{gone
							? duplicateGoneText(source.type, sourceName(source))
							: duplicate.error instanceof StaleCopyError
								? DUPLICATE_STALE
								: refused
									? DUPLICATE_REFUSED
									: DUPLICATE_FAILED}
					</AlertDescription>
				</Alert>
			)}
			{otherNames && (
				<Alert variant="destructive">
					<AlertDescription>
						{copiedUnitsTakenText(
							otherNames,
							otherNames.some((each) => renumbered.has(each)),
							towerName,
						)}
					</AlertDescription>
				</Alert>
			)}
			<Field data-invalid={!!error}>
				<FieldLabel htmlFor={`${formId}-name`}>Nome</FieldLabel>
				<Input
					ref={field}
					id={`${formId}-name`}
					autoComplete="off"
					enterKeyHint="done"
					autoFocus
					value={name}
					readOnly={saving}
					aria-invalid={!!error}
					aria-describedby={`${formId}-note`}
					className={cn(mono && "font-mono")}
					onFocus={(event) => event.currentTarget.select()}
					onChange={(event) => {
						setProblem(undefined);
						duplicate.reset();
						setName(event.target.value);
					}}
				/>
				{error ? (
					<FieldError id={`${formId}-note`}>{error}</FieldError>
				) : (
					<FieldDescription id={`${formId}-note`}>
						{uniqueHint(SCOPES[source.type])}
					</FieldDescription>
				)}
			</Field>
			{count}
			{tooLarge && (
				<Alert variant="destructive">
					<AlertDescription>
						{duplicateTooLargeText(locations)}
					</AlertDescription>
				</Alert>
			)}
		</form>
	);

	return (
		<>
			<NameDialogLayout
				desktop={desktop}
				title={title}
				formId={formId}
				form={form}
				saving={saving}
				submitLabel="Duplicar"
				pendingLabel="Duplicando…"
				SubmitIcon={Copy}
				submitDisabled={over || tooLarge}
				onCancel={onDone}
			/>
			{admin && project.data && (
				<ChangeReservationDialog
					project={project.data}
					open={reserving}
					onOpenChange={setReserving}
					returnFocus={alterReservation}
					onSaved={() => void units.refetch()}
				/>
			)}
		</>
	);
}

function locationOf(source: DuplicateSource): string {
	switch (source.type) {
		case "tower":
			return source.tower.id;
		case "floor":
			return source.floor.id;
		case "unit":
			return source.unit.id;
	}
}

export function DuplicateDialog({
	projectId,
	target,
	open,
	onOpenChange,
	returnFocus,
}: DuplicateDialogProps) {
	const structure = useQuery(structureQueryOptions(projectId));
	const field = useRef<HTMLInputElement>(null);
	const source =
		structure.data &&
		findDuplicateSource(structure.data, target.type, target.id);

	if (!source || !structure.data) return null;

	return (
		<NameDialogFrame
			open={open}
			onOpenChange={onOpenChange}
			returnFocus={returnFocus}
			field={field}
		>
			{(desktop) => (
				<DuplicateContent
					projectId={projectId}
					source={source}
					several={structure.data.towers.length > 1}
					suggestion={suggestedCopyName(source, structure.data)}
					desktop={desktop}
					field={field}
					onDone={() => onOpenChange(false)}
				/>
			)}
		</NameDialogFrame>
	);
}
