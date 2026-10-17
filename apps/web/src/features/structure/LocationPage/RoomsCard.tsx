import type { DroppedRoom, LocationDetail, Room } from "@bluprint/shared";
import { Ellipsis, Pencil, Plus, Trash2, Undo2 } from "lucide-react";
import { type ReactNode, useId, useState } from "react";
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
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { uuidV7 } from "@/lib/uuidV7";
import {
	isRoomNameTaken,
	useAddRoomMutation,
	useGiveRoomBackMutation,
	useRemoveRoomMutation,
} from "../api";
import { plural } from "../plural";
import { RenameRoomDialog } from "./RenameRoomDialog";
import { type RoomHolder, roomNameError, roomNameTakenText } from "./roomNames";

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
	const fieldId = useId();
	const add = useAddRoomMutation(projectId, location.id);
	const [adding, setAdding] = useState(false);
	const [name, setName] = useState("");
	const [error, setError] = useState<string>();
	const [attempt, setAttempt] = useState(() => uuidV7());

	function close() {
		setAdding(false);
		setName("");
		setError(undefined);
		add.reset();
	}

	function submit() {
		const invalid = roomNameError(name);
		if (invalid) return setError(invalid);
		const trimmed = name.trim();

		add.mutate(
			{ id: attempt, name: trimmed },
			{
				onSuccess: () => {
					setAttempt(uuidV7());
					close();
				},
				onError: (failure) => {
					if (isRoomNameTaken(failure)) {
						setError(roomNameTakenText(holder, trimmed));
						setAttempt(uuidV7());
					}
				},
			},
		);
	}

	if (!adding) {
		return (
			<li className="border-t border-border py-(--space-1) pl-(--space-2) first:border-t-0">
				<Button
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
				onSubmit={(event) => {
					event.preventDefault();
					submit();
				}}
				onKeyDown={(event) => {
					if (event.key === "Escape" && !add.isPending) close();
				}}
			>
				<Field data-invalid={!!error || failed}>
					<FieldLabel htmlFor={fieldId}>Adicionar cômodo</FieldLabel>
					<Input
						id={fieldId}
						autoFocus
						autoComplete="off"
						enterKeyHint="done"
						value={name}
						disabled={add.isPending}
						aria-invalid={!!error || failed}
						aria-describedby={error || failed ? `${fieldId}-error` : undefined}
						onChange={(event) => {
							setError(undefined);
							setName(event.target.value);
						}}
					/>
					{(error || failed) && (
						<FieldError id={`${fieldId}-error`}>
							{error ??
								"Não foi possível adicionar o cômodo. Confira sua conexão e tente de novo."}
						</FieldError>
					)}
				</Field>
				<div className="flex gap-(--space-2) max-md:*:flex-1">
					<Button type="submit" disabled={add.isPending}>
						{add.isPending && <Spinner aria-hidden />}
						{add.isPending ? "Adicionando…" : "Adicionar"}
					</Button>
					<Button
						type="button"
						variant="outline"
						disabled={add.isPending}
						onClick={close}
					>
						Cancelar
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
}: {
	room: Room;
	removeLabel: string;
	onRename: () => void;
	onRemove: () => void;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
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
	const { rooms, droppedRooms, unitType } = location;
	const holder: RoomHolder = location.type === "unit" ? "unit" : "common_area";
	const [renaming, setRenaming] = useState<Room>();
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
		giveBack.mutate(dropped.unitTypeRoomId, {
			onError: (failure) =>
				toast.error(
					isRoomNameTaken(failure)
						? `Não foi possível devolver o cômodo ${dropped.name}: ${roomNameTakenText(holder, dropped.name)}`
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
								unitType && room.unitTypeRoomId === null
									? "Só desta unidade"
									: undefined
							}
							action={
								editable && (
									<RoomMenu
										room={room}
										removeLabel={
											room.unitTypeRoomId === null
												? "Remover cômodo"
												: "Remover desta unidade"
										}
										onRename={() => setRenaming(room)}
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
			{unitType && droppedRooms.length > 0 && (
				<div className="grid gap-(--space-2)">
					<h3 className="text-sm font-semibold text-muted-foreground">
						Tirados desta unidade
					</h3>
					<RoomList label="Tirados desta unidade">
						{droppedRooms.map((dropped) => (
							<RoomRow
								key={dropped.unitTypeRoomId}
								name={dropped.name}
								meta={`Da tipologia ${unitType.name}`}
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
					onClose={() => setRenaming(undefined)}
				/>
			)}
		</section>
	);
}
