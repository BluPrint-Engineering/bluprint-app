import type { Typology } from "@bluprint/shared";
import { Ellipsis, Pencil, Trash2 } from "lucide-react";
import type { Ref } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { plural } from "../plural";
import { deleteBlockedText, followersText } from "./typologySaveText";

export function TypologyRow({
	typology,
	editable,
	onEditRooms,
	onRename,
	onDelete,
	triggerRef,
}: {
	typology: Typology;
	editable: boolean;
	onEditRooms: () => void;
	onRename: () => void;
	onDelete: () => void;
	triggerRef: Ref<HTMLButtonElement>;
}) {
	const inUse = typology.locationCount > 0;

	return (
		<div className="flex min-h-14 items-center gap-(--space-2) py-(--space-2) pr-(--space-2) pl-(--space-4)">
			<span className="grid min-w-0 flex-1">
				<span className="text-base font-medium [overflow-wrap:anywhere]">
					{typology.name}
				</span>
				<span className="text-sm text-muted-foreground">
					{plural(typology.rooms.length, "cômodo", "cômodos")} ·{" "}
					{followersText(typology.locationType, typology.locationCount)}
				</span>
			</span>
			{editable && (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							ref={triggerRef}
							type="button"
							variant="ghost"
							size="icon"
							aria-label={`Ações da ${typology.name}`}
						>
							<Ellipsis aria-hidden="true" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onSelect={onEditRooms}>
							<Pencil aria-hidden="true" />
							Editar cômodos
						</DropdownMenuItem>
						<DropdownMenuItem onSelect={onRename}>
							<Pencil aria-hidden="true" />
							Renomear
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							variant="destructive"
							disabled={inUse}
							onSelect={onDelete}
						>
							<Trash2 aria-hidden="true" />
							{inUse
								? deleteBlockedText(typology.locationType)
								: "Excluir tipologia"}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			)}
		</div>
	);
}
