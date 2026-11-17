import type { LocationType } from "@bluprint/shared";
import { Plus } from "lucide-react";
import {
	type ReactNode,
	type RefObject,
	useEffect,
	useRef,
	useState,
} from "react";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useClearSessionDraft, useSessionDraft } from "@/features/auth";
import { cn } from "@/lib/utils";
import { uuidV7 } from "@/lib/uuidV7";
import { availableUnitsOf } from "../../projects/api";
import { namesTakenOf, useCreateStructureMutation } from "../api";
import { nameProblem, type Scope, takenText } from "../naming";
import {
	type Adding,
	type AddKind,
	type AddOpener,
	useFocusOnClose,
} from "./useAdding";

const ADD_FAILED =
	"Não foi possível adicionar. Confira sua conexão e tente de novo.";
const RESERVE_OVER = "A reserva da obra acabou.";

export interface AddRowProps {
	projectId: string;
	adding: Adding;
	kind: AddKind;
	type: Exclude<LocationType, "floor">;
	parentId: string | null;
	label: string;
	fieldLabel?: string;
	suggestion: string;
	scope: Scope;
	towerName?: string | undefined;
	hint?: string | undefined;
	hintLoading?: boolean;
	blocked?: ReactNode;
	buttonRef?: RefObject<HTMLButtonElement | null>;
	menuButton?: RefObject<HTMLElement | null>;
}

function AddForm({
	projectId,
	adding,
	type,
	parentId,
	label,
	fieldLabel,
	suggestion,
	scope,
	towerName,
	hint,
	hintLoading,
}: AddRowProps) {
	const create = useCreateStructureMutation(projectId);
	const restored = useSessionDraft(
		"create-structure",
		(variables) => restoredAdd(variables, parentId, type)?.name,
	);
	const clearDraft = useClearSessionDraft("create-structure");
	const id = useRef(uuidV7());
	const [name, setName] = useState(restored ?? suggestion);
	const [problem, setProblem] = useState<string>();
	const field = useRef<HTMLInputElement>(null);
	const saving = create.isPending;
	const mono = type === "unit";
	const hintId = `add-${id.current}-note`;

	useEffect(() => {
		const timer = setTimeout(() => field.current?.focus(), 0);
		return () => clearTimeout(timer);
	}, []);

	const taken = namesTakenOf(create.error);
	const left = availableUnitsOf(create.error);
	const refusal =
		taken !== undefined
			? takenText(type, name.trim(), scope, towerName)
			: left !== undefined
				? RESERVE_OVER
				: create.isError
					? ADD_FAILED
					: undefined;
	const error = problem ?? refusal;

	function cancel() {
		clearDraft();
		adding.close();
	}

	function submit() {
		const found = nameProblem(name);
		if (found) return setProblem(found);
		create.mutate(
			{
				typologies: [],
				locations: [{ id: id.current, parentId, type, name: name.trim() }],
				...(adding.openedFrom === "menu" && { opener: "menu" as const }),
			},
			{ onSuccess: adding.close },
		);
	}

	return (
		<form
			noValidate
			className="grid items-start gap-(--space-3) px-(--space-4) pt-(--space-3) pb-(--space-4)"
			onSubmit={(event) => {
				event.preventDefault();
				if (!saving) submit();
			}}
			onKeyDown={(event) => {
				if (event.key === "Escape" && !saving) {
					event.stopPropagation();
					cancel();
				}
			}}
		>
			<Field data-invalid={!!error}>
				<FieldLabel htmlFor={`add-${id.current}`}>
					{fieldLabel ?? label}
				</FieldLabel>
				<Input
					ref={field}
					id={`add-${id.current}`}
					autoComplete="off"
					enterKeyHint="done"
					autoFocus
					value={name}
					readOnly={saving}
					aria-invalid={!!error}
					aria-describedby={hintId}
					className={cn(mono && "font-mono")}
					onFocus={(event) => event.currentTarget.select()}
					onChange={(event) => {
						setProblem(undefined);
						create.reset();
						setName(event.target.value);
					}}
				/>
				{error ? (
					<FieldError id={hintId}>{error}</FieldError>
				) : hintLoading ? (
					<Skeleton aria-hidden className="h-3.5 w-4/5" />
				) : hint ? (
					<FieldDescription id={hintId}>{hint}</FieldDescription>
				) : null}
			</Field>
			<div className="flex gap-(--space-2) max-md:*:flex-1">
				<Button type="submit" disabled={saving}>
					{saving && <Spinner aria-hidden />}
					{saving ? "Adicionando…" : "Adicionar"}
				</Button>
				<Button
					type="button"
					variant="outline"
					disabled={saving}
					onClick={cancel}
				>
					Cancelar
				</Button>
			</div>
		</form>
	);
}

function restoredAdd(
	variables: unknown,
	parentId: string | null,
	type: AddRowProps["type"],
): { name: string; from: AddOpener } | undefined {
	if (typeof variables !== "object" || variables === null) return undefined;
	if ("draft" in variables) return undefined;
	if (!("locations" in variables) || !Array.isArray(variables.locations)) {
		return undefined;
	}
	if (variables.locations.length !== 1) return undefined;
	const location = variables.locations[0];
	if (typeof location !== "object" || location === null) return undefined;
	if (
		!("parentId" in location) ||
		!("type" in location) ||
		!("name" in location)
	) {
		return undefined;
	}
	if (location.parentId !== parentId || location.type !== type)
		return undefined;
	if (typeof location.name !== "string") return undefined;
	const from =
		"opener" in variables && variables.opener === "menu" ? "menu" : "row";
	return { name: location.name, from };
}

export function useReopenRestoredAdd(
	adding: Adding,
	kind: AddKind,
	parentId: string | null,
	type: AddRowProps["type"],
) {
	const restored = useSessionDraft("create-structure", (variables) =>
		restoredAdd(variables, parentId, type),
	);
	const reopened = useRef(false);
	useEffect(() => {
		if (reopened.current || restored === undefined) return;
		reopened.current = true;
		adding.open(kind, restored.from);
	}, [adding, kind, restored]);
}

export function AddRow(props: AddRowProps) {
	const { adding, kind, label, blocked, buttonRef, menuButton } = props;
	useReopenRestoredAdd(adding, kind, props.parentId, props.type);
	const open = adding.is(kind);
	const openedFrom = useRef<AddOpener>("row");
	useEffect(() => {
		if (open) openedFrom.current = adding.openedFrom;
	}, [open, adding.openedFrom]);
	const button = useFocusOnClose(open, buttonRef, () =>
		openedFrom.current === "menu" ? menuButton?.current : undefined,
	);

	if (open) return <AddForm {...props} />;

	if (blocked) {
		const noteId = `add-${kind}-blocked`;
		return (
			<div className="grid justify-items-start pt-1.5 pr-(--space-4) pb-(--space-3) pl-(--space-2)">
				<Button
					ref={button}
					variant="ghost"
					aria-disabled
					aria-describedby={noteId}
					className="text-primary aria-disabled:pointer-events-none aria-disabled:opacity-50"
				>
					<Plus className="size-4.5" aria-hidden="true" />
					{label}
				</Button>
				<p
					id={noteId}
					className="pl-(--space-4) text-sm text-pretty text-muted-foreground"
				>
					{blocked}
				</p>
			</div>
		);
	}

	return (
		<div className="py-1.5 pl-(--space-2)">
			<Button
				ref={button}
				variant="ghost"
				className="text-primary"
				onClick={() => adding.open(kind)}
			>
				<Plus className="size-4.5" aria-hidden="true" />
				{label}
			</Button>
		</div>
	);
}
