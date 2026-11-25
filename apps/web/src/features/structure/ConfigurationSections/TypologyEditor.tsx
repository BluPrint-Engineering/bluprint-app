import {
	MAX_ROOMS_PER_TYPOLOGY,
	sameRoomName,
	type Typology,
} from "@bluprint/shared";
import { CircleAlert, RefreshCw } from "lucide-react";
import { type Ref, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useClearSessionDraft, useSessionDraft } from "@/features/auth";
import { uuidV7 } from "@/lib/uuidV7";
import { isProjectDelivered } from "../../projects/api";
import {
	isTypologyChanged,
	isTypologyGone,
	roomNamesTakenOf,
	useRoomNames,
	useTypologyNow,
	useUpdateTypologyMutation,
} from "../api";
import { RoomList } from "../components/RoomList";
import { RoomSuggestField } from "../components/RoomSuggestField";
import {
	CHANGED_TEXT,
	changedTitleText,
	deletedByOtherText,
	savedText,
	saveFailedText,
	unitsChangedText,
} from "./typologySaveText";

interface DraftRoom {
	id: string;
	name: string;
}

interface RestoredEdit {
	version: number;
	rooms: DraftRoom[];
}

function restoredEdit(
	variables: unknown,
	typologyId: string,
): RestoredEdit | undefined {
	if (typeof variables !== "object" || variables === null) return undefined;
	if (!("typologyId" in variables) || variables.typologyId !== typologyId) {
		return undefined;
	}
	if (!("version" in variables) || typeof variables.version !== "number") {
		return undefined;
	}
	if (!("rooms" in variables) || !Array.isArray(variables.rooms))
		return undefined;
	const rooms: DraftRoom[] = [];
	for (const room of variables.rooms) {
		if (typeof room !== "object" || room === null) return undefined;
		if (!("id" in room) || !("name" in room)) return undefined;
		if (typeof room.id !== "string" || typeof room.name !== "string") {
			return undefined;
		}
		rooms.push({ id: room.id, name: room.name });
	}
	return { version: variables.version, rooms };
}

function sameRooms(a: DraftRoom[], b: DraftRoom[]) {
	return (
		a.length === b.length &&
		a.every(
			(room, index) => room.id === b[index]?.id && room.name === b[index]?.name,
		)
	);
}

function roomsTakenText(names: string[]) {
	const single = names.length === 1;
	return `A tipologia não pode ter ${single ? "o cômodo" : "os cômodos"} ${names.join(", ")}: uma unidade já tem ${single ? "um cômodo com esse nome" : "cômodos com esses nomes"}. Renomeie ${single ? "o cômodo" : "os cômodos"} na unidade e tente de novo.`;
}

export function TypologyEditor({
	projectId,
	typology,
	fieldRef,
	onClose,
}: {
	projectId: string;
	typology: Typology;
	fieldRef: Ref<HTMLInputElement>;
	onClose: () => void;
}) {
	const update = useUpdateTypologyMutation(projectId, (gone) =>
		toast(deletedByOtherText(gone)),
	);
	const now = useTypologyNow(projectId);
	const restored = useSessionDraft("update-typology", (variables) =>
		restoredEdit(variables, typology.id),
	);
	const clearDraft = useClearSessionDraft("update-typology");
	const [rooms, setRooms] = useState<DraftRoom[]>(
		restored?.rooms ?? typology.rooms,
	);
	const [version, setVersion] = useState(restored?.version ?? typology.version);
	const [changed, setChanged] = useState(false);
	const [typed, setTyped] = useState("");
	const usedNames = useRoomNames(projectId);
	const stored = new Set(typology.rooms.map(({ id }) => id));
	const saving = update.isPending;
	const failure =
		update.isError &&
		!isProjectDelivered(update.error) &&
		!isTypologyChanged(update.error) &&
		!isTypologyGone(update.error)
			? update.error
			: undefined;
	const roomsTaken = failure && roomNamesTakenOf(failure);
	const retry = failure !== undefined && roomsTaken === undefined;

	function addRoom(name: string) {
		const taken = typology.rooms.find((room) => sameRoomName(room.name, name));
		const brought = taken && !rooms.some((room) => room.id === taken.id);
		setRooms((current) => [
			...current,
			brought ? taken : { id: uuidV7(), name },
		]);
		setTyped("");
	}

	function cancel() {
		clearDraft();
		onClose();
	}

	function seeCurrent() {
		update.reset();
		setChanged(false);
		setRooms(typology.rooms);
	}

	function save() {
		if (!update.isError && sameRooms(rooms, typology.rooms)) return cancel();
		setChanged(false);
		update.mutate(
			{ typologyId: typology.id, version, rooms },
			{
				onSuccess: ({ updatedLocationCount }) => {
					toast.success(savedText(typology, updatedLocationCount));
					onClose();
				},
				onError: (error) => {
					if (isTypologyGone(error)) return cancel();
					if (!isTypologyChanged(error)) return;
					const latest = now(typology.id);
					if (!latest) return;
					if (sameRooms(rooms, latest.rooms)) {
						toast.success(savedText(latest, 0));
						return cancel();
					}
					setVersion(latest.version);
					setChanged(true);
				},
			},
		);
	}

	return (
		<div className="grid gap-(--space-3) p-(--space-4)">
			<span className="text-base font-semibold [overflow-wrap:anywhere]">
				{typology.name}
			</span>
			<RoomList
				rooms={rooms.map((room) => ({
					...room,
					isNew: !stored.has(room.id),
				}))}
				disabled={saving}
				onRemove={(index) =>
					setRooms((current) => current.filter((_, i) => i !== index))
				}
			/>
			<RoomSuggestField
				ariaLabel={`Novo cômodo da ${typology.name}`}
				value={typed}
				onValueChange={setTyped}
				onAdd={addRoom}
				used={usedNames}
				present={rooms.map(({ name }) => name)}
				presentLabel="Já está nesta tipologia"
				duplicateMessage="Esse cômodo já está na tipologia."
				maxItems={MAX_ROOMS_PER_TYPOLOGY}
				maxMessage={`A tipologia pode ter até ${MAX_ROOMS_PER_TYPOLOGY} cômodos.`}
				disabled={saving}
				inputRef={fieldRef}
			/>
			<Alert>
				<AlertDescription>{unitsChangedText(typology)}</AlertDescription>
			</Alert>
			{changed && !saving && (
				<Alert variant="destructive">
					<CircleAlert aria-hidden="true" />
					<AlertTitle>{changedTitleText(typology)}</AlertTitle>
					<AlertDescription>{CHANGED_TEXT}</AlertDescription>
					<div className="col-start-2 pt-(--space-2)">
						<Button type="button" variant="outline" onClick={seeCurrent}>
							Ver a lista atual
						</Button>
					</div>
				</Alert>
			)}
			{failure !== undefined && (
				<Alert variant="destructive">
					<CircleAlert aria-hidden="true" />
					<AlertTitle>Não foi possível salvar</AlertTitle>
					<AlertDescription>
						{roomsTaken ? roomsTakenText(roomsTaken) : saveFailedText(typology)}
					</AlertDescription>
				</Alert>
			)}
			<div className="flex gap-(--space-2) max-md:*:flex-1">
				<Button type="button" disabled={saving} onClick={save}>
					{saving ? (
						<Spinner aria-hidden />
					) : (
						retry && <RefreshCw className="size-4.5" aria-hidden="true" />
					)}
					{saving ? "Salvando…" : retry ? "Tentar de novo" : "Salvar"}
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
		</div>
	);
}
