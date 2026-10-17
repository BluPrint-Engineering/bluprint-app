import { Ellipsis, Pencil } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { renameLabel } from "../naming";
import { RenameDialog, type RenameTarget } from "./RenameDialog";

export function LocationMenu({
	projectId,
	target,
	label,
	variant = "ghost",
	onCloseAutoFocus,
	children,
}: {
	projectId: string;
	target: RenameTarget;
	label: string;
	variant?: "ghost" | "outline";
	onCloseAutoFocus?: (event: Event) => void;
	children?: ReactNode;
}) {
	const [renaming, setRenaming] = useState(false);
	const trigger = useRef<HTMLButtonElement>(null);

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						ref={trigger}
						variant={variant}
						size="icon"
						aria-label={label}
					>
						<Ellipsis className="size-5" aria-hidden="true" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					align="end"
					className="w-60"
					onCloseAutoFocus={onCloseAutoFocus}
				>
					<DropdownMenuItem onSelect={() => setRenaming(true)}>
						<Pencil className="size-4.5" aria-hidden="true" />
						{renameLabel(target.type)}
					</DropdownMenuItem>
					{children}
				</DropdownMenuContent>
			</DropdownMenu>
			<RenameDialog
				projectId={projectId}
				target={target}
				open={renaming}
				onOpenChange={setRenaming}
				returnFocus={trigger}
			/>
		</>
	);
}
