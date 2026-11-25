import {
	type DroppedRoom,
	type LocationDetail,
	MAX_ROOMS_PER_LOCATION,
	type Room,
} from "@bluprint/shared";
import { Ellipsis, Pencil, Plus, Trash2, Undo2 } from "lucide-react";
import { type ReactNode, type Ref, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useClearSessionDraft, useSessionDraft } from "@/features/auth";
import { uuidV7 } from "@/lib/uuidV7";
import {
	isRoomNameTaken,
	useAddRoomMutation,
	useGiveRoomBackMutation,
	useRemoveRoomMutation,
	useRoomNames,
} from "../api";
import { RoomSuggestField } from "../components/RoomSuggestField";
import { useFocusOnClose } from "../components/useAdding";
import { plural } from "../plural";
import { holderText } from "./holderText";
import { RenameRoomDialog } from "./RenameRoomDialog";
import { type RoomHolder, roomLimitText, roomNameTakenText } from "./roomNames";

function RoomRow({
	name,
	meta,
	badge,
	action,
}: {
	name: string;
	meta?: string | undefined;
	badge?: string | undefined;
	action?: ReactNode;
}) {
	return (
		<li className="flex min-h-14 items-center gap-(--space-3) border-t border-border py-(--space-2) pr-(--space-2) pl-(--space-4) first:border-t-0">
			<span className="grid min-w-0 flex-1">
				<span className="text-base font-medium [overflow-wrap:anywhere]">
					{name}
				</span>
				{meta && <span className="text-sm text-muted-foreground">{meta}</span>}
			</span>
			{badge && <Badge variant="outline">{badge}</Badge>}
			{action}
		</li>
	);
}

function RoomList({ label, children }: { label: string; children: ReactNode }) {
	return (
		<ul
			aria-label={label}
			className="overflow-hidden rounded-xl bg-card shadow-(--ring-hairline)"
		>
			{children}
		</ul>
	);
}

function AddRoomRow({
	projectId,
	location,
	holder,
}: {
	projectId: string;
	location: LocationDetail;
	holder: RoomHolder;
}) {
	const add = useAddRoomMutation(projectId, location.id);
	const usedNames = useRoomNames(projectId);
	const restored = useSessionDraft("add-room", (variables) => {
		if (typeof variables !== "object" || variables === null) return undefined;
		if (!("name" in variables) || typeof variables.name !== "string") {
			return undefined;
		}
		return variables.name;
	});
	const clearDraft = useClearSessionDraft("add-room");
	const [adding, setAdding] = useState(restored !== undefined);
	const addButton = useFocusOnClose<HTMLButtonElement>(adding);
	const [name, setName] = useState(restored ?? "");
	const [error, setError] = useState<string>();
	const attempt = useRef<{ id: string; name: string }>(undefined);

	function close() {
		clearDraft();
		setAdding(false);
		setName("");
		setError(undefined);
		attempt.current = undefined;
		add.reset();
	}

	function submit(chosen: string) {
		if (attempt.current?.name !== chosen) {
			attempt.current = { id: uuidV7(), name: chosen };
		}

		add.mutate(
			{ id: attempt.current.id, name: chosen },
			{
				onSuccess: () => {
					clearDraft();
					setName("");
					setError(undefined);
					attempt.current = undefined;
					add.reset();
				},
				onError: (failure) => {
					if (isRoomNameTaken(failure)) {
						setError(roomNameTakenText(holder));
						attempt.current = undefined;
					}
				},
			},
		);
	}

	if (!adding) {
		return (
			<li className="border-t border-border py-(--space-1) pl-(--space-2) first:border-t-0">
				<Button
					ref={addButton}
					type="button"
					variant="ghost"
					className="text-primary"
					onClick={() => setAdding(true)}
				>
					<Plus aria-hidden="true" />
					Adicionar cômodo
				</Button>
			</li>
		);
	}

	const failed = add.isError && !isRoomNameTaken(add.error);

	return (
		<li className="border-t border-border first:border-t-0">
			<form
				noValidate
				className="grid gap-(--space-3) px-(--space-4) pt-(--space-3) pb-(--space-4)"
				onSubmit={(event) => event.preventDefault()}
				onKeyDown={(event) => {
					if (event.key === "Escape" && !add.isPending) close();
				}}
			>
				<RoomSuggestField
					label="Adicionar cômodo"
					autoFocus
					value={name}
					onValueChange={(next) => {
						setError(undefined);
						setName(next);
					}}
					onAdd={submit}
					used={usedNames}
					present={location.rooms.map((room) => room.name)}
					presentLabel="Já está aqui"
					duplicateMessage={roomNameTakenText(holder)}
					maxItems={MAX_ROOMS_PER_LOCATION}
					maxMessage={roomLimitText(holder)}
					pending={add.isPending}
					error={
						error ??
						(failed
							? "Não foi possível adicionar o cômodo. Confira sua conexão e tente de novo."
							: undefined)
					}
				/>
				<div className="flex gap-(--space-2) max-md:*:flex-1">
					<Button
						type="button"
						variant="outline"
						disabled={add.isPending}
						onClick={close}
					>
						Fechar
					</Button>
				</div>
			</form>
		</li>
	);
}

function RoomMenu({
	room,
	removeLabel,
	onRename,
	onRemove,
	triggerRef,
}: {
	room: Room;
	removeLabel: string;
	onRename: () => void;
	onRemove: () => void;
	triggerRef: Ref<HTMLButtonElement>;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					ref={triggerRef}
					type="button"
					variant="ghost"
					size="icon"
					aria-label={`Ações do cômodo ${room.name}`}
				>
					<Ellipsis aria-hidden="true" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onSelect={onRename}>
					<Pencil aria-hidden="true" />
					Renomear
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem variant="destructive" onSelect={onRemove}>
					<Trash2 aria-hidden="true" />
					{removeLabel}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export function RoomsCard({
	projectId,
	location,
	editable,
}: {
	projectId: string;
	location: LocationDetail;
	editable: boolean;
}) {
	const { rooms, droppedRooms, typology } = location;
	const holder: RoomHolder = location.type === "unit" ? "unit" : "common_area";
	const text = holderText(holder);
	const restoredRename = useSessionDraft("rename-room", (variables) => {
		if (typeof variables !== "object" || variables === null) return undefined;
		if (!("roomId" in variables) || typeof variables.roomId !== "string") {
			return undefined;
		}
		return variables.roomId;
	});
	const [renaming, setRenaming] = useState<Room>();
	const roomTriggers = useRef(new Map<string, HTMLButtonElement>());
	const openedRename = useRef(false);
	useEffect(() => {
		if (openedRename.current || !restoredRename) return;
		const room = location.rooms.find((item) => item.id === restoredRename);
		if (!room) return;
		openedRename.current = true;
		setRenaming(room);
	}, [location.rooms, restoredRename]);
	const remove = useRemoveRoomMutation(projectId, location.id);
	const giveBack = useGiveRoomBackMutation(projectId, location.id);

	function removeRoom(room: Room) {
		remove.mutate(room.id, {
			onError: () =>
				toast.error(
					`Não foi possível remover o cômodo ${room.name}. Confira sua conexão e tente de novo.`,
				),
		});
	}

	function giveRoomBack(dropped: DroppedRoom) {
		giveBack.mutate(dropped.typologyRoomId, {
			onError: (failure) =>
				toast.error(
					isRoomNameTaken(failure)
						? `Não foi possível devolver o cômodo ${dropped.name}. ${roomNameTakenText(holder)}`
						: `Não foi possível devolver o cômodo ${dropped.name}. Confira sua conexão e tente de novo.`,
				),
		});
	}

	return (
		<section className="grid content-start gap-(--space-3)">
			<div className="flex items-baseline justify-between gap-(--space-3)">
				<h2 className="text-lg font-semibold tracking-tight">Cômodos</h2>
				<span className="text-sm text-muted-foreground">
					{plural(rooms.length, "cômodo", "cômodos")}
				</span>
			</div>
			{rooms.length === 0 && !editable ? (
				<p className="text-sm text-muted-foreground">
					Nenhum cômodo cadastrado.
				</p>
			) : (
				<RoomList label="Cômodos">
					{rooms.map((room) => (
						<RoomRow
							key={room.id}
							name={room.name}
							badge={
								typology && room.typologyRoomId === null
									? text.ownRoomBadge
									: undefined
							}
							action={
								editable && (
									<RoomMenu
										room={room}
										removeLabel={
											room.typologyRoomId === null
												? "Remover cômodo"
												: text.removeTypologyRoom
										}
										onRename={() => setRenaming(room)}
										triggerRef={(trigger) => {
											if (trigger) roomTriggers.current.set(room.id, trigger);
											else roomTriggers.current.delete(room.id);
										}}
										onRemove={() => removeRoom(room)}
									/>
								)
							}
						/>
					))}
					{editable && (
						<AddRoomRow
							projectId={projectId}
							location={location}
							holder={holder}
						/>
					)}
				</RoomList>
			)}
			{typology && droppedRooms.length > 0 && (
				<div className="grid gap-(--space-2)">
					<h3 className="text-sm font-semibold text-muted-foreground">
						{text.droppedRooms}
					</h3>
					<RoomList label={text.droppedRooms}>
						{droppedRooms.map((dropped) => (
							<RoomRow
								key={dropped.typologyRoomId}
								name={dropped.name}
								meta={`Da tipologia ${typology.name}`}
								action={
									editable && (
										<Button
											type="button"
											variant="ghost"
											size="sm"
											aria-label={`Devolver o cômodo ${dropped.name}`}
											disabled={giveBack.isPending}
											onClick={() => giveRoomBack(dropped)}
										>
											<Undo2 aria-hidden="true" />
											Devolver
										</Button>
									)
								}
							/>
						))}
					</RoomList>
				</div>
			)}
			{renaming && (
				<RenameRoomDialog
					key={renaming.id}
					projectId={projectId}
					locationId={location.id}
					holder={holder}
					room={renaming}
					rooms={rooms}
					onClose={() => setRenaming(undefined)}
					returnFocus={() => roomTriggers.current.get(renaming.id)}
				/>
			)}
		</section>
	);
}
