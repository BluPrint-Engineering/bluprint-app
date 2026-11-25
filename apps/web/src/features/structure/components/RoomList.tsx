import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface RoomListItem {
	id: string;
	name: string;
	isNew?: boolean;
}

export function RoomList({
	rooms,
	onRemove,
	disabled = false,
}: {
	rooms: RoomListItem[];
	onRemove?: (index: number) => void;
	disabled?: boolean;
}) {
	if (rooms.length === 0) {
		return <p className="text-sm text-muted-foreground">Sem cômodo.</p>;
	}
	return (
		<ul className="overflow-hidden rounded-lg bg-card shadow-(--ring-hairline)">
			{rooms.map((room, index) => (
				<li
					key={room.id}
					className={cn(
						"flex min-h-(--tap-min) items-center justify-between gap-(--space-2) border-t border-border text-base first:border-t-0",
						onRemove ? "pr-(--space-1) pl-(--space-3)" : "px-(--space-3)",
					)}
				>
					<span className="flex min-w-0 flex-wrap items-center gap-(--space-2) py-(--space-2)">
						<span className="[overflow-wrap:anywhere]">{room.name}</span>
						{room.isNew && <Badge variant="outline">Novo</Badge>}
					</span>
					{onRemove && (
						<Button
							type="button"
							variant="ghost"
							size="icon"
							aria-label={`Tirar ${room.name}`}
							disabled={disabled}
							onClick={() => onRemove(index)}
							className="text-muted-foreground"
						>
							<X className="size-4.5" aria-hidden="true" />
						</Button>
					)}
				</li>
			))}
		</ul>
	);
}
