import type { FormEvent, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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

interface FormDialogProps {
	title: string;
	description: string;
	submitLabel: string;
	pendingLabel: string;
	pending: boolean;
	submitDisabled?: boolean;
	formId: string;
	onSubmit: () => void;
	onClose: () => void;
	children: ReactNode;
}

export function FormDialog({
	title,
	description,
	submitLabel,
	pendingLabel,
	pending,
	submitDisabled = false,
	formId,
	onSubmit,
	onClose,
	children,
}: FormDialogProps) {
	const desktop = useIsDesktop();

	const form = (
		<form
			id={formId}
			noValidate
			className="grid gap-(--space-4)"
			onSubmit={(event: FormEvent) => {
				event.preventDefault();
				onSubmit();
			}}
		>
			{children}
		</form>
	);

	const actions = (size: "default" | "lg", className?: string) => (
		<>
			<Button
				type="submit"
				form={formId}
				size={size}
				disabled={pending || submitDisabled}
				className={className}
			>
				{pending && <Spinner aria-hidden />}
				{pending ? pendingLabel : submitLabel}
			</Button>
			<Button
				type="button"
				variant="outline"
				size={size}
				disabled={pending}
				className={className}
				onClick={onClose}
			>
				Cancelar
			</Button>
		</>
	);

	function handleOpenChange(open: boolean) {
		if (!open && !pending) onClose();
	}

	if (desktop) {
		return (
			<Dialog open onOpenChange={handleOpenChange}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
						<DialogDescription>{description}</DialogDescription>
					</DialogHeader>
					{form}
					<DialogFooter className="flex-row-reverse justify-start">
						{actions("default")}
					</DialogFooter>
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Drawer open onOpenChange={handleOpenChange} dismissible={!pending}>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle>{title}</DrawerTitle>
					<DrawerDescription>{description}</DrawerDescription>
				</DrawerHeader>
				<div className="grid px-(--page-pad) pt-(--space-2) pb-(--space-5)">
					{form}
				</div>
				<DrawerFooter className="flex-col">
					{actions("lg", "w-full")}
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}
