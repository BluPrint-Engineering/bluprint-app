import { sameRoomName, TYPOLOGY_NAME_MAX_LENGTH } from "@bluprint/shared";
import { CircleAlert } from "lucide-react";
import { useId, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { isProjectDelivered } from "../../projects/api";
import { typologyNamesTakenOf } from "../api";
import { plural } from "../plural";
import { copiedTypologyName } from "./copiedTypologyName";
import { FormDialog } from "./FormDialog";
import { RoomList, type RoomListItem } from "./RoomList";
import { TYPOLOGY_NAME_TAKEN_TEXT, typologyNameError } from "./typologyNames";

export function CopyTypologyDialog({
	name,
	rooms,
	takenNames,
	initialName,
	onConfirm,
	onClose,
	returnFocus,
}: {
	name: string;
	rooms: RoomListItem[];
	takenNames: readonly string[];
	initialName?: string;
	onConfirm: (copyName: string) => Promise<unknown>;
	onClose: () => void;
	returnFocus: () => HTMLElement | null | undefined;
}) {
	const fieldId = useId();
	const [copyName, setCopyName] = useState(
		() => initialName ?? copiedTypologyName(name, takenNames),
	);
	const [error, setError] = useState<string>();
	const [pending, setPending] = useState(false);
	const [failed, setFailed] = useState(false);

	function submit() {
		const invalid = typologyNameError(copyName);
		if (invalid) return setError(invalid);
		const trimmed = copyName.trim();
		if (takenNames.some((taken) => sameRoomName(taken, trimmed))) {
			return setError(TYPOLOGY_NAME_TAKEN_TEXT);
		}
		setFailed(false);
		setPending(true);
		onConfirm(trimmed).catch((failure: unknown) => {
			setPending(false);
			if (typologyNamesTakenOf(failure)) setError(TYPOLOGY_NAME_TAKEN_TEXT);
			else if (isProjectDelivered(failure)) onClose();
			else setFailed(true);
		});
	}

	return (
		<FormDialog
			title={`Copiar ${name}`}
			submitLabel="Copiar"
			pendingLabel="Copiando…"
			pending={pending}
			formId={fieldId}
			onSubmit={submit}
			onClose={onClose}
			returnFocus={returnFocus}
		>
			{failed && (
				<Alert variant="destructive">
					<CircleAlert aria-hidden="true" />
					<AlertTitle>Não foi possível copiar</AlertTitle>
					<AlertDescription>
						A cópia não foi criada. Confira a conexão e tente de novo.
					</AlertDescription>
				</Alert>
			)}
			<Field data-invalid={!!error}>
				<FieldLabel htmlFor={`${fieldId}-name`}>Nome da cópia</FieldLabel>
				<Input
					id={`${fieldId}-name`}
					autoFocus
					autoComplete="off"
					enterKeyHint="done"
					maxLength={TYPOLOGY_NAME_MAX_LENGTH + 20}
					value={copyName}
					disabled={pending}
					aria-invalid={!!error}
					onFocus={(event) => event.currentTarget.select()}
					onChange={(event) => {
						setError(undefined);
						setCopyName(event.target.value);
					}}
				/>
				{error ? (
					<FieldError>{error}</FieldError>
				) : (
					<FieldDescription>
						Único na obra, entre as tipologias de unidade e de área comum.
					</FieldDescription>
				)}
			</Field>
			<div className="grid gap-(--space-2)">
				<p className="text-sm font-medium">
					Leva {plural(rooms.length, "cômodo", "cômodos")}
				</p>
				<div className="md:max-h-60 md:overflow-y-auto">
					<RoomList rooms={rooms} />
				</div>
			</div>
			<p className="text-sm text-pretty text-muted-foreground">
				Depois de copiar, as duas mudam separadas. As disciplinas ficam em cada
				local, não na tipologia.
			</p>
		</FormDialog>
	);
}
