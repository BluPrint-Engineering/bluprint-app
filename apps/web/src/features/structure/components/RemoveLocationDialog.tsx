import type { LocationType } from "@bluprint/shared";
import { Trash2 } from "lucide-react";
import { type RefObject, useState } from "react";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import { Spinner } from "@/components/ui/spinner";
import { useIsDesktop } from "@/lib/useIsDesktop";
import {
	type ChildCounts,
	confirmParagraphs,
	confirmTitle,
} from "../removeText";

interface RemoveLocationDialogProps {
	type: LocationType;
	name: string;
	counts: ChildCounts;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => Promise<void>;
	returnFocus: RefObject<HTMLElement | null>;
}

export function RemoveLocationDialog({
	type,
	name,
	counts,
	open,
	onOpenChange,
	onConfirm,
	returnFocus,
}: RemoveLocationDialogProps) {
	const desktop = useIsDesktop();
	const [removing, setRemoving] = useState(false);

	function handleOpenChange(next: boolean) {
		if (!removing) onOpenChange(next);
	}

	async function confirm() {
		setRemoving(true);
		try {
			await onConfirm();
		} finally {
			setRemoving(false);
			onOpenChange(false);
		}
	}

	function focusOpener(event: Event) {
		event.preventDefault();
		returnFocus.current?.focus();
	}

	const title = confirmTitle(type, name);
	const body = (
		<div className="grid gap-(--space-3)">
			{confirmParagraphs(type, name, counts).map((paragraph) => (
				<p key={paragraph} className="text-pretty">
					{paragraph}
				</p>
			))}
		</div>
	);

	const action = (size: "default" | "lg", className?: string) => (
		<Button
			type="button"
			variant="destructive"
			size={size}
			className={className}
			disabled={removing}
			onClick={() => void confirm()}
		>
			{removing ? (
				<Spinner aria-hidden />
			) : (
				<Trash2 className="size-4.5" aria-hidden="true" />
			)}
			{removing ? "Excluindo…" : "Excluir"}
		</Button>
	);

	if (desktop) {
		return (
			<AlertDialog open={open} onOpenChange={handleOpenChange}>
				<AlertDialogContent
					onOverlayClick={() => handleOpenChange(false)}
					onCloseAutoFocus={focusOpener}
				>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription asChild>{body}</AlertDialogDescription>
					<AlertDialogFooter>
						<AlertDialogCancel asChild>
							<Button type="button" variant="outline" disabled={removing}>
								Cancelar
							</Button>
						</AlertDialogCancel>
						{action("default")}
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		);
	}

	return (
		<Drawer open={open} onOpenChange={handleOpenChange} dismissible={!removing}>
			<DrawerContent role="alertdialog" onCloseAutoFocus={focusOpener}>
				<DrawerHeader>
					<DrawerTitle className="[overflow-wrap:anywhere]">
						{title}
					</DrawerTitle>
				</DrawerHeader>
				<div className="grid px-(--page-pad) pt-(--space-2) pb-(--space-5) text-sm">
					<DrawerDescription asChild>{body}</DrawerDescription>
				</div>
				<DrawerFooter className="flex-col">
					{action("lg", "w-full")}
					<Button
						type="button"
						variant="outline"
						size="lg"
						className="w-full"
						disabled={removing}
						onClick={() => onOpenChange(false)}
					>
						Cancelar
					</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}
