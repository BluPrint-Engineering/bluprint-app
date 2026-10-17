import {
	MAX_ROOMS_PER_UNIT_TYPE,
	sameLocationName,
	type UnitType,
} from "@bluprint/shared";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { uuidV7 } from "@/lib/uuidV7";
import { roomNamesTakenOf, useUpdateUnitTypeMutation } from "../api";
import { AddTag, Tags } from "../components/Tags";
import { savedText, unitsChangedText } from "./unitTypeSaveText";

interface DraftRoom {
	id: string;
	name: string;
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

export function UnitTypeEditor({
	projectId,
	unitType,
	onClose,
}: {
	projectId: string;
	unitType: UnitType;
	onClose: () => void;
}) {
	const update = useUpdateUnitTypeMutation(projectId);
	const [rooms, setRooms] = useState<DraftRoom[]>(unitType.rooms);
	const stored = new Set(unitType.rooms.map(({ id }) => id));
	const isNew = (name: string) =>
		rooms.some((room) => room.name === name && !stored.has(room.id));

	function addRoom(name: string) {
		const taken = unitType.rooms.find((room) =>
			sameLocationName(room.name, name),
		);
		const brought = taken && !rooms.some((room) => room.id === taken.id);
		setRooms((current) => [
			...current,
			brought ? taken : { id: uuidV7(), name },
		]);
		return true;
	}

	function save() {
		if (sameRooms(rooms, unitType.rooms)) return onClose();
		update.mutate(
			{ unitTypeId: unitType.id, rooms },
			{
				onSuccess: ({ updatedUnitCount }) => {
					toast.success(savedText(unitType.name, updatedUnitCount));
					onClose();
				},
			},
		);
	}

	return (
		<div className="grid gap-(--space-3) p-(--space-4)">
			<span className="font-semibold">{unitType.name}</span>
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
				maxItems={MAX_ROOMS_PER_UNIT_TYPE}
				maxMessage={`A tipologia pode ter até ${MAX_ROOMS_PER_UNIT_TYPE} cômodos.`}
				onAdd={addRoom}
			/>
			{update.isError && (
				<Alert variant="destructive">
					<AlertDescription>{failureText(update.error)}</AlertDescription>
				</Alert>
			)}
			<Alert>
				<AlertDescription>{unitsChangedText(unitType)}</AlertDescription>
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
					onClick={onClose}
				>
					Cancelar
				</Button>
			</div>
		</div>
	);
}
