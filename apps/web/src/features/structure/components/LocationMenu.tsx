import {
	ArrowDown,
	ArrowUp,
	Copy,
	Ellipsis,
	Pencil,
	Trash2,
} from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMoveLocationMutation } from "../api";
import { duplicateMenuLabel } from "../duplicateText";
import { removeLabel, renameLabel } from "../naming";
import { type ChildCounts, hasChildren } from "../removeText";
import { useRemoveLocation } from "../useRemoveLocation";
import { DuplicateDialog, type DuplicateTarget } from "./DuplicateDialog";
import { RemoveLocationDialog } from "./RemoveLocationDialog";
import { RenameDialog, type RenameTarget } from "./RenameDialog";

export interface Removal {
	counts: ChildCounts;
	afterRemoval?: () => void | Promise<void>;
}

export function LocationMenu({
	projectId,
	target,
	label,
	duplicate,
	variant = "ghost",
	movable = false,
	removal,
	onCloseAutoFocus,
	children,
}: {
	projectId: string;
	target: RenameTarget;
	label: string;
	duplicate?: DuplicateTarget;
	variant?: "ghost" | "outline";
	movable?: boolean;
	removal: Removal;
	onCloseAutoFocus?: (event: Event) => void;
	children?: ReactNode;
}) {
	const [renaming, setRenaming] = useState(false);
	const [duplicating, setDuplicating] = useState(false);
	const [confirming, setConfirming] = useState(false);
	const trigger = useRef<HTMLButtonElement>(null);
	const move = useMoveLocationMutation(projectId);
	const remove = useRemoveLocation(projectId);
	const { id, type, name } = target;

	function removeNow(undoable: boolean) {
		return remove({
			id,
			type,
			name,
			undoable,
			afterRemoval: removal.afterRemoval,
		});
	}

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
						{renameLabel(type)}
					</DropdownMenuItem>
					{children}
					{movable && (
						<>
							<DropdownMenuItem
								onSelect={() =>
									move.mutate({ locationId: id, direction: "up" })
								}
							>
								<ArrowUp className="size-4.5" aria-hidden="true" />
								Mover para cima
							</DropdownMenuItem>
							<DropdownMenuItem
								onSelect={() =>
									move.mutate({ locationId: id, direction: "down" })
								}
							>
								<ArrowDown className="size-4.5" aria-hidden="true" />
								Mover para baixo
							</DropdownMenuItem>
						</>
					)}
					{duplicate && (
						<DropdownMenuItem onSelect={() => setDuplicating(true)}>
							<Copy className="size-4.5" aria-hidden="true" />
							{duplicateMenuLabel(duplicate.type)}
						</DropdownMenuItem>
					)}
					<DropdownMenuSeparator />
					<DropdownMenuItem
						variant="destructive"
						onSelect={() =>
							hasChildren(removal.counts)
								? setConfirming(true)
								: void removeNow(true).then((outcome) => {
										if (outcome === "confirm") setConfirming(true);
									})
						}
					>
						<Trash2 className="size-4.5" aria-hidden="true" />
						{removeLabel(type)}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<RenameDialog
				projectId={projectId}
				target={target}
				open={renaming}
				onOpenChange={setRenaming}
				returnFocus={trigger}
			/>
			{duplicate && (
				<DuplicateDialog
					projectId={projectId}
					target={duplicate}
					open={duplicating}
					onOpenChange={setDuplicating}
					returnFocus={trigger}
				/>
			)}
			<RemoveLocationDialog
				type={type}
				name={name}
				counts={removal.counts}
				open={confirming}
				onOpenChange={setConfirming}
				onConfirm={async () => {
					await removeNow(false);
				}}
				returnFocus={trigger}
			/>
		</>
	);
}
