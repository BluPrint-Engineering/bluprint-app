import type { Typology } from "@bluprint/shared";
import { Ellipsis, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { plural } from "../plural";

export function TypologyRow({
	typology,
	editable,
	onEditRooms,
	onRename,
	onDelete,
}: {
	typology: Typology;
	editable: boolean;
	onEditRooms: () => void;
	onRename: () => void;
	onDelete: () => void;
}) {
	const inUse = typology.unitCount > 0;

	return (
		<div className="flex min-h-14 items-center gap-(--space-2) py-(--space-2) pr-(--space-2) pl-(--space-4)">
			<span className="grid min-w-0 flex-1">
				<span className="text-base font-medium [overflow-wrap:anywhere]">
					{typology.name}
				</span>
				<span className="text-sm text-muted-foreground">
					{plural(typology.rooms.length, "cômodo", "cômodos")} ·{" "}
					{plural(typology.unitCount, "unidade", "unidades")}
				</span>
			</span>
			{editable && (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
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
							{inUse ? "Excluir (só sem unidades)" : "Excluir tipologia"}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			)}
		</div>
	);
}
