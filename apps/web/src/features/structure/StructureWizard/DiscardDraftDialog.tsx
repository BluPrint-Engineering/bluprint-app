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
import { useIsDesktop } from "@/lib/useIsDesktop";

export function DiscardDraftDialog({
	open,
	extending,
	onCancel,
	onDiscard,
}: {
	open: boolean;
	extending: boolean;
	onCancel: () => void;
	onDiscard: () => void;
}) {
	const desktop = useIsDesktop();
	const title = "Descartar o que você montou?";
	const description = extending
		? "Nada foi salvo ainda. Os andares e as regras deste rascunho são apagados."
		: "Nada foi salvo ainda. As torres, as tipologias e as regras deste rascunho são apagadas.";
	if (desktop)
		return (
			<AlertDialog
				open={open}
				onOpenChange={(value) => {
					if (!value) onCancel();
				}}
			>
				<AlertDialogContent onOverlayClick={onCancel}>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
					<AlertDialogFooter>
						<AlertDialogCancel asChild>
							<Button variant="outline">Continuar montando</Button>
						</AlertDialogCancel>
						<Button variant="destructive" onClick={onDiscard}>
							Descartar
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		);
	return (
		<Drawer
			open={open}
			onOpenChange={(value) => {
				if (!value) onCancel();
			}}
		>
			<DrawerContent role="alertdialog">
				<DrawerHeader>
					<DrawerTitle>{title}</DrawerTitle>
					<DrawerDescription>{description}</DrawerDescription>
				</DrawerHeader>
				<DrawerFooter className="flex-col">
					<Button variant="destructive" size="lg" onClick={onDiscard}>
						Descartar
					</Button>
					<Button variant="outline" size="lg" onClick={onCancel}>
						Continuar montando
					</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}
