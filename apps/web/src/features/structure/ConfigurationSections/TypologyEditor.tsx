import {
	MAX_ROOMS_PER_TYPOLOGY,
	sameLocationName,
	type Typology,
} from "@bluprint/shared";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useClearSessionDraft, useSessionDraft } from "@/features/auth";
import { uuidV7 } from "@/lib/uuidV7";
import { roomNamesTakenOf, useUpdateTypologyMutation } from "../api";
import { AddTag, Tags } from "../components/Tags";
import { savedText, unitsChangedText } from "./typologySaveText";

interface DraftRoom {
	id: string;
	name: string;
}

function restoredRooms(
	variables: unknown,
	typologyId: string,
): DraftRoom[] | undefined {
	if (typeof variables !== "object" || variables === null) return undefined;
	if (!("typologyId" in variables) || variables.typologyId !== typologyId) {
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
	return rooms;
}

function sameRooms(a: DraftRoom[], b: DraftRoom[]) {
	return (
		a.length === b.length &&
		a.every(
			(room, index) => room.id === b[index]?.id && room.name === b[index]?.name,
		)
	);
}

function failureText(error: unknown) {
	const names = roomNamesTakenOf(error);
	if (names === undefined) {
		return "Não foi possível salvar a tipologia. Confira sua conexão e tente de novo.";
	}
	const single = names.length === 1;
	return `A tipologia não pode ter ${single ? "o cômodo" : "os cômodos"} ${names.join(", ")}: uma unidade já tem ${single ? "um cômodo com esse nome" : "cômodos com esses nomes"}. Renomeie ${single ? "o cômodo" : "os cômodos"} na unidade e tente de novo.`;
}

export function TypologyEditor({
	projectId,
	typology,
	onClose,
}: {
	projectId: string;
	typology: Typology;
	onClose: () => void;
}) {
	const update = useUpdateTypologyMutation(projectId);
	const restored = useSessionDraft("update-typology", (variables) =>
		restoredRooms(variables, typology.id),
	);
	const clearDraft = useClearSessionDraft("update-typology");
	const [rooms, setRooms] = useState<DraftRoom[]>(restored ?? typology.rooms);
	const stored = new Set(typology.rooms.map(({ id }) => id));
	const isNew = (name: string) =>
		rooms.some((room) => room.name === name && !stored.has(room.id));

	function addRoom(name: string) {
		const taken = typology.rooms.find((room) =>
			sameLocationName(room.name, name),
		);
		const brought = taken && !rooms.some((room) => room.id === taken.id);
		setRooms((current) => [
			...current,
			brought ? taken : { id: uuidV7(), name },
		]);
		return true;
	}

	function close() {
		clearDraft();
		onClose();
	}

	function save() {
		if (sameRooms(rooms, typology.rooms)) return close();
		update.mutate(
			{ typologyId: typology.id, rooms },
			{
				onSuccess: ({ updatedUnitCount }) => {
					toast.success(savedText(typology.name, updatedUnitCount));
					onClose();
				},
			},
		);
	}

	return (
		<div className="grid gap-(--space-3) p-(--space-4)">
			<span className="font-semibold">{typology.name}</span>
			<Tags
				items={rooms.map(({ name }) => name)}
				isNew={isNew}
				onRemove={(index) =>
					setRooms((current) => current.filter((_, i) => i !== index))
				}
			/>
			<AddTag
				label="Novo cômodo"
				placeholder="Novo cômodo"
				existing={rooms.map(({ name }) => name)}
				duplicateMessage="Esta tipologia já tem esse cômodo."
				maxItems={MAX_ROOMS_PER_TYPOLOGY}
				maxMessage={`A tipologia pode ter até ${MAX_ROOMS_PER_TYPOLOGY} cômodos.`}
				onAdd={addRoom}
			/>
			{update.isError && (
				<Alert variant="destructive">
					<AlertDescription>{failureText(update.error)}</AlertDescription>
				</Alert>
			)}
			<Alert>
				<AlertDescription>{unitsChangedText(typology)}</AlertDescription>
			</Alert>
			<div className="flex gap-(--space-2) max-md:*:flex-1">
				<Button type="button" disabled={update.isPending} onClick={save}>
					{update.isPending && <Spinner aria-hidden />}
					{update.isPending ? "Salvando…" : "Salvar"}
				</Button>
				<Button
					type="button"
					variant="outline"
					disabled={update.isPending}
					onClick={close}
				>
					Cancelar
				</Button>
			</div>
		</div>
	);
}
