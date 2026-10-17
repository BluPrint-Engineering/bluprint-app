import { ROOM_NAME_MAX_LENGTH, type Room } from "@bluprint/shared";
import { useId, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { isProjectDelivered } from "../../projects/api";
import { isRoomNameTaken, useRenameRoomMutation } from "../api";
import { FormDialog } from "../components/FormDialog";
import { type RoomHolder, roomNameError, roomNameTakenText } from "./roomNames";

export function RenameRoomDialog({
	projectId,
	locationId,
	holder,
	room,
	onClose,
}: {
	projectId: string;
	locationId: string;
	holder: RoomHolder;
	room: Room;
	onClose: () => void;
}) {
	const fieldId = useId();
	const rename = useRenameRoomMutation(projectId, locationId);
	const [name, setName] = useState(room.name);
	const [error, setError] = useState<string>();

	function submit() {
		const invalid = roomNameError(name);
		if (invalid) return setError(invalid);
		const trimmed = name.trim();
		if (trimmed === room.name) return onClose();

		rename.mutate(
			{ roomId: room.id, name: trimmed },
			{
				onSuccess: onClose,
				onError: (failure) => {
					if (isRoomNameTaken(failure)) {
						setError(roomNameTakenText(holder, trimmed));
					} else if (isProjectDelivered(failure)) {
						onClose();
					}
				},
			},
		);
	}

	const failed =
		rename.isError &&
		!isRoomNameTaken(rename.error) &&
		!isProjectDelivered(rename.error);

	return (
		<FormDialog
			title="Renomear o cômodo"
			description={
				room.unitTypeRoomId === null
					? "O nome novo vale em todo lugar onde o cômodo aparece."
					: "Muda só nesta unidade. A tipologia continua com o nome dela."
			}
			submitLabel="Salvar"
			pendingLabel="Salvando…"
			pending={rename.isPending}
			formId={fieldId}
			onSubmit={submit}
			onClose={onClose}
		>
			{failed && (
				<Alert variant="destructive">
					<AlertDescription>
						Não foi possível salvar o nome. Confira sua conexão e tente de novo.
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
					maxLength={ROOM_NAME_MAX_LENGTH + 20}
					value={name}
					disabled={rename.isPending}
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
