import type { Typology } from "@bluprint/shared";
import { ChevronDown, Ellipsis, Pencil, Trash2 } from "lucide-react";
import type { Ref } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { RoomList } from "../components/RoomList";
import { plural } from "../plural";
import { followersText } from "./typologySaveText";

export function TypologyRow({
	typology,
	expanded,
	onToggle,
	actions,
}: {
	typology: Typology;
	expanded: boolean;
	onToggle: () => void;
	actions?: {
		editRoomsDisabled: boolean;
		onEditRooms: () => void;
		onRename: () => void;
		onDelete: () => void;
		triggerRef: Ref<HTMLButtonElement>;
	};
}) {
	const inUse = typology.locationCount > 0;
	const rooms = plural(typology.rooms.length, "cômodo", "cômodos");

	return (
		<>
			<div
				className={cn(
					"flex min-h-14 items-stretch gap-(--space-2)",
					actions ? "pr-(--space-2)" : "pr-(--space-4)",
				)}
			>
				<button
					type="button"
					aria-expanded={expanded}
					onClick={onToggle}
					className="grid min-w-0 flex-1 content-center gap-0.5 py-(--space-2) pl-(--space-4) text-left outline-none hover:bg-muted focus-visible:shadow-[inset_0_0_0_2px_var(--ring)]"
				>
					<span className="flex items-center gap-(--space-2)">
						<span className="text-base font-medium [overflow-wrap:anywhere]">
							{typology.name}
						</span>
						<ChevronDown
							aria-hidden="true"
							className={cn(
								"size-4.5 shrink-0 text-muted-foreground transition-transform duration-150 motion-reduce:transition-none",
								expanded && "rotate-180",
							)}
						/>
					</span>
					{inUse ? (
						<span className="text-sm text-muted-foreground">
							{rooms} ·{" "}
							{followersText(typology.locationType, typology.locationCount)}
						</span>
					) : (
						<span className="flex flex-wrap items-center gap-(--space-2) text-sm text-muted-foreground">
							<span>{rooms} ·</span>
							<Badge variant="outline">Sem uso</Badge>
						</span>
					)}
				</button>
				{actions && (
					<span className="flex items-center">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									ref={actions.triggerRef}
									type="button"
									variant="ghost"
									size="icon"
									aria-label={`Ações da ${typology.name}`}
								>
									<Ellipsis className="size-5" aria-hidden="true" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-60">
								<DropdownMenuItem
									disabled={actions.editRoomsDisabled}
									onSelect={actions.onEditRooms}
								>
									<Pencil className="size-4.5" aria-hidden="true" />
									Editar cômodos
								</DropdownMenuItem>
								<DropdownMenuItem onSelect={actions.onRename}>
									<Pencil className="size-4.5" aria-hidden="true" />
									Renomear
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									variant="destructive"
									disabled={inUse}
									onSelect={actions.onDelete}
								>
									<Trash2 className="size-4.5" aria-hidden="true" />
									{inUse ? "Excluir (só sem uso)" : "Excluir tipologia"}
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</span>
				)}
			</div>
			{expanded && (
				<div className="max-w-104 px-(--space-4) pb-(--space-4)">
					<RoomList rooms={typology.rooms} />
				</div>
			)}
		</>
	);
}
