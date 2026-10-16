import type { DroppedRoom, Room, UnitTypeRef } from "@bluprint/shared";
import { Badge } from "@/components/ui/badge";
import { plural } from "./plural";

function RoomRow({
	name,
	meta,
	badge,
}: {
	name: string;
	meta?: string | undefined;
	badge?: string | undefined;
}) {
	return (
		<li className="flex min-h-14 items-center gap-(--space-3) border-t border-border py-(--space-2) pr-(--space-4) pl-(--space-4) first:border-t-0">
			<span className="grid min-w-0 flex-1">
				<span className="text-base font-medium [overflow-wrap:anywhere]">
					{name}
				</span>
				{meta && <span className="text-sm text-muted-foreground">{meta}</span>}
			</span>
			{badge && <Badge variant="outline">{badge}</Badge>}
		</li>
	);
}

function RoomList({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<ul
			aria-label={label}
			className="overflow-hidden rounded-xl bg-card shadow-(--ring-hairline)"
		>
			{children}
		</ul>
	);
}

export function RoomsCard({
	rooms,
	droppedRooms = [],
	unitType = null,
}: {
	rooms: Room[];
	droppedRooms?: DroppedRoom[];
	unitType?: UnitTypeRef | null;
}) {
	return (
		<section className="grid content-start gap-(--space-3)">
			<div className="flex items-baseline justify-between gap-(--space-3)">
				<h2 className="text-lg font-semibold tracking-tight">Cômodos</h2>
				<span className="text-sm text-muted-foreground">
					{plural(rooms.length, "cômodo", "cômodos")}
				</span>
			</div>
			{rooms.length === 0 ? (
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
						/>
					))}
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
								meta={`Da ${unitType.name}`}
							/>
						))}
					</RoomList>
				</div>
			)}
		</section>
	);
}
