import type { Typology, TypologyLocationType } from "@bluprint/shared";
import { sameRoomName, TYPOLOGY_NAME_MAX_LENGTH } from "@bluprint/shared";
import { CircleAlert } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useClearSessionDraft, useSessionDraft } from "@/features/auth";
import { uuidV7 } from "@/lib/uuidV7";
import { isProjectDelivered } from "../../projects/api";
import {
	isTypologyChanged,
	isTypologyGone,
	typologyNamesTakenOf,
	useCreateTypologyMutation,
	useTypologyNow,
	useUpdateTypologyMutation,
} from "../api";
import { FormDialog } from "../components/FormDialog";
import { TYPOLOGY_NAME_TAKEN_TEXT, typologyNameError } from "./typologyNames";
import {
	CHANGED_TEXT,
	changedTitleText,
	deletedByOtherText,
} from "./typologySaveText";

export type NameDialogTarget =
	| { mode: "create"; locationType: TypologyLocationType }
	| { mode: "rename"; typology: Typology };

const CREATE_TEXT = {
	unit: { title: "Nova tipologia", example: "Ex.: Tipologia D, Garden." },
	common_area: {
		title: "Nova tipologia de área comum",
		example: "Ex.: Hall, Corredor, Garagem.",
	},
} as const satisfies Record<TypologyLocationType, object>;

interface RestoredName {
	name: string;
	version?: number;
}

function restoredName(
	variables: unknown,
	target: NameDialogTarget,
): RestoredName | undefined {
	if (typeof variables !== "object" || variables === null) return undefined;
	if (!("name" in variables) || typeof variables.name !== "string") {
		return undefined;
	}
	if (target.mode === "create") {
		return "locationType" in variables &&
			variables.locationType === target.locationType
			? { name: variables.name }
			: undefined;
	}
	if (
		!("typologyId" in variables) ||
		variables.typologyId !== target.typology.id ||
		!("version" in variables) ||
		typeof variables.version !== "number"
	) {
		return undefined;
	}
	return { name: variables.name, version: variables.version };
}

export function TypologyNameDialog({
	projectId,
	target,
	typologies,
	onClose,
	onCreated,
	returnFocus,
}: {
	projectId: string;
	target: NameDialogTarget;
	typologies: Typology[];
	onClose: () => void;
	onCreated: (typology: Typology) => void;
	returnFocus: () => HTMLElement | null | undefined;
}) {
	const fieldId = useId();
	const create = useCreateTypologyMutation(projectId);
	const update = useUpdateTypologyMutation(projectId, (gone) =>
		toast(deletedByOtherText(gone)),
	);
	const now = useTypologyNow(projectId);
	const [newId] = useState(uuidV7);
	const draftKind =
		target.mode === "create" ? "create-typology" : "update-typology";
	const restored = useSessionDraft(draftKind, (variables) =>
		restoredName(variables, target),
	);
	const clearDraft = useClearSessionDraft(draftKind);
	const live =
		target.mode === "rename"
			? (typologies.find(({ id }) => id === target.typology.id) ??
				target.typology)
			: undefined;
	const current = live?.name ?? "";
	const [name, setName] = useState(restored?.name ?? current);
	const [version, setVersion] = useState(
		restored?.version ??
			(target.mode === "rename" ? target.typology.version : 0),
	);
	const [changed, setChanged] = useState(false);
	const [error, setError] = useState<string>();
	const mutation = target.mode === "create" ? create : update;

	function close() {
		clearDraft();
		onClose();
	}

	function submit() {
		const invalid = typologyNameError(name);
		if (invalid) return setError(invalid);
		const trimmed = name.trim();
		if (target.mode === "rename" && trimmed === current && !mutation.isError) {
			return close();
		}
		if (
			typologies.some(
				(item) =>
					(target.mode !== "rename" || item.id !== target.typology.id) &&
					sameRoomName(item.name, trimmed),
			)
		)
			return setError(TYPOLOGY_NAME_TAKEN_TEXT);

		setChanged(false);
		const handlers = {
			onError: (failure: unknown) => {
				if (typologyNamesTakenOf(failure)) {
					setError(TYPOLOGY_NAME_TAKEN_TEXT);
				} else if (isProjectDelivered(failure) || isTypologyGone(failure)) {
					close();
				} else if (isTypologyChanged(failure) && target.mode === "rename") {
					const latest = now(target.typology.id);
					if (!latest || sameRoomName(latest.name, trimmed)) return close();
					setVersion(latest.version);
					setChanged(true);
				}
			},
		};
		if (target.mode === "create") {
			create.mutate(
				{
					id: newId,
					name: trimmed,
					locationType: target.locationType,
					rooms: [],
				},
				{
					...handlers,
					onSuccess: (created) => {
						onCreated(created);
						close();
					},
				},
			);
		} else {
			update.mutate(
				{ typologyId: target.typology.id, version, name: trimmed },
				{ ...handlers, onSuccess: close },
			);
		}
	}

	const failed =
		mutation.isError &&
		!typologyNamesTakenOf(mutation.error) &&
		!isProjectDelivered(mutation.error) &&
		!isTypologyChanged(mutation.error) &&
		!isTypologyGone(mutation.error);
	const creating = target.mode === "create" && CREATE_TEXT[target.locationType];

	return (
		<FormDialog
			title={creating ? creating.title : "Renomear a tipologia"}
			{...(!creating && {
				description: "O nome novo vale em todos os locais da tipologia.",
			})}
			submitLabel={creating ? "Criar" : "Salvar"}
			pendingLabel={creating ? "Criando…" : "Salvando…"}
			pending={mutation.isPending}
			formId={fieldId}
			onSubmit={submit}
			onClose={close}
			returnFocus={returnFocus}
		>
			{failed && (
				<Alert variant="destructive">
					<AlertDescription>
						Não foi possível salvar a tipologia. Confira sua conexão e tente de
						novo.
					</AlertDescription>
				</Alert>
			)}
			{changed && !mutation.isPending && live && (
				<Alert variant="destructive">
					<CircleAlert aria-hidden="true" />
					<AlertTitle>{changedTitleText(live)}</AlertTitle>
					<AlertDescription>{CHANGED_TEXT}</AlertDescription>
				</Alert>
			)}
			<Field data-invalid={!!error}>
				<FieldLabel htmlFor={`${fieldId}-name`}>Nome</FieldLabel>
				<Input
					id={`${fieldId}-name`}
					autoFocus
					autoComplete="off"
					enterKeyHint="done"
					maxLength={TYPOLOGY_NAME_MAX_LENGTH + 20}
					value={name}
					disabled={mutation.isPending}
					aria-invalid={!!error}
					onFocus={(event) => event.currentTarget.select()}
					onChange={(event) => {
						setError(undefined);
						setName(event.target.value);
					}}
				/>
				{error ? (
					<FieldError>{error}</FieldError>
				) : (
					creating && <FieldDescription>{creating.example}</FieldDescription>
				)}
			</Field>
			{creating && (
				<p className="text-sm text-pretty text-muted-foreground">
					Os cômodos entram depois, no cartão da tipologia.
				</p>
			)}
		</FormDialog>
	);
}
