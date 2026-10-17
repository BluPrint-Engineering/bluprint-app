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
import { cn } from "@/lib/utils";
import { uuidV7 } from "@/lib/uuidV7";
import { availableUnitsOf } from "../../projects/api";
import { namesTakenOf, useCreateStructureMutation } from "../api";
import { nameProblem, type Scope, takenText } from "../naming";
import { plural } from "../plural";
import { type Adding, type AddKind, useFocusOnClose } from "./useAdding";

const ADD_FAILED =
	"Não foi possível adicionar. Confira sua conexão e tente de novo.";
const RESERVE_OVER = "A reserva da obra acabou.";

export interface AddRowProps {
	projectId: string;
	adding: Adding;
	kind: AddKind;
	type: Exclude<LocationType, "floor">;
	parentId: string | null;
	position: number;
	label: string;
	fieldLabel?: string;
	suggestion: string;
	scope: Scope;
	towerName?: string | undefined;
	hint?: string | undefined;
	hintLoading?: boolean;
	blocked?: ReactNode;
	buttonRef?: RefObject<HTMLButtonElement | null>;
}

function AddForm({
	projectId,
	adding,
	type,
	parentId,
	position,
	label,
	fieldLabel,
	suggestion,
	scope,
	towerName,
	hint,
	hintLoading,
}: AddRowProps) {
	const create = useCreateStructureMutation(projectId);
	const id = useRef(uuidV7());
	const [name, setName] = useState(suggestion);
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
			: left === undefined
				? create.isError
					? ADD_FAILED
					: undefined
				: left <= 0
					? RESERVE_OVER
					: `Restam só ${plural(left, "unidade", "unidades")} nesta obra.`;
	const error = problem ?? refusal;

	function submit() {
		const found = nameProblem(name);
		if (found) return setProblem(found);
		create.mutate(
			{
				locations: [
					{ id: id.current, parentId, type, name: name.trim(), position },
				],
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
					adding.close();
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
					disabled={saving}
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
					onClick={adding.close}
				>
					Cancelar
				</Button>
			</div>
		</form>
	);
}

export function AddRow(props: AddRowProps) {
	const { adding, kind, label, blocked, buttonRef } = props;
	const open = adding.is(kind);
	const button = useFocusOnClose(open, buttonRef);

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
		<div className="pl-(--space-2)">
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
