import type { Typology } from "@bluprint/shared";
import { TYPOLOGY_NAME_MAX_LENGTH } from "@bluprint/shared";
import { useId, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useClearSessionDraft, useSessionDraft } from "@/features/auth";
import { uuidV7 } from "@/lib/uuidV7";
import { isProjectDelivered } from "../../projects/api";
import {
	typologyNamesTakenOf,
	useCreateTypologyMutation,
	useUpdateTypologyMutation,
} from "../api";
import { FormDialog } from "../components/FormDialog";
import { typologyNameError, typologyNameTakenText } from "./typologyNames";

function typologyName(
	variables: unknown,
	target: NameDialogTarget,
): string | undefined {
	if (typeof variables !== "object" || variables === null) return undefined;
	if (!("name" in variables) || typeof variables.name !== "string") {
		return undefined;
	}
	if (
		"rooms" in variables &&
		Array.isArray(variables.rooms) &&
		variables.rooms.length > 0
	) {
		return undefined;
	}
	if (target.mode === "create") return variables.name;
	if (
		!("typologyId" in variables) ||
		variables.typologyId !== target.typology.id
	) {
		return undefined;
	}
	return variables.name;
}

export type NameDialogTarget =
	| { mode: "create" }
	| { mode: "rename"; typology: Typology };

export function TypologyNameDialog({
	projectId,
	target,
	onClose,
	onCreated,
}: {
	projectId: string;
	target: NameDialogTarget;
	onClose: () => void;
	onCreated: (typology: Typology) => void;
}) {
	const fieldId = useId();
	const create = useCreateTypologyMutation(projectId);
	const update = useUpdateTypologyMutation(projectId);
	const [newId] = useState(uuidV7);
	const draftKind =
		target.mode === "create" ? "create-typology" : "update-typology";
	const restored = useSessionDraft(draftKind, (variables) =>
		typologyName(variables, target),
	);
	const clearDraft = useClearSessionDraft(draftKind);
	const current = target.mode === "rename" ? target.typology.name : "";
	const [name, setName] = useState(restored ?? current);
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
		if (target.mode === "rename" && trimmed === current) return close();

		const handlers = {
			onError: (failure: unknown) => {
				if (typologyNamesTakenOf(failure)) {
					setError(typologyNameTakenText(trimmed));
				} else if (isProjectDelivered(failure)) {
					close();
				}
			},
		};
		if (target.mode === "create") {
			create.mutate(
				{ id: newId, name: trimmed, rooms: [] },
				{
					...handlers,
					onSuccess: (created) => {
						close();
						onCreated(created);
					},
				},
			);
		} else {
			update.mutate(
				{ typologyId: target.typology.id, name: trimmed },
				{ ...handlers, onSuccess: close },
			);
		}
	}

	const failed =
		mutation.isError &&
		!typologyNamesTakenOf(mutation.error) &&
		!isProjectDelivered(mutation.error);

	return (
		<FormDialog
			title={
				target.mode === "create" ? "Nova tipologia" : "Renomear a tipologia"
			}
			description={
				target.mode === "create"
					? "Dê um nome. Os cômodos entram depois."
					: "O nome novo vale em todas as unidades da tipologia."
			}
			submitLabel={target.mode === "create" ? "Criar" : "Salvar"}
			pendingLabel={target.mode === "create" ? "Criando…" : "Salvando…"}
			pending={mutation.isPending}
			formId={fieldId}
			onSubmit={submit}
			onClose={close}
		>
			{failed && (
				<Alert variant="destructive">
					<AlertDescription>
						Não foi possível salvar a tipologia. Confira sua conexão e tente de
						novo.
					</AlertDescription>
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
				{error && <FieldError>{error}</FieldError>}
			</Field>
		</FormDialog>
	);
}
