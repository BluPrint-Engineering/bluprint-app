import type { LucideIcon } from "lucide-react";
import type { ReactNode, RefObject } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Drawer,
	DrawerContent,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import { Spinner } from "@/components/ui/spinner";
import { useIsDesktop } from "@/lib/useIsDesktop";

export function NameDialogFrame({
	open,
	onOpenChange,
	returnFocus,
	field,
	children,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	returnFocus: RefObject<HTMLElement | null>;
	field: RefObject<HTMLInputElement | null>;
	children: (desktop: boolean) => ReactNode;
}) {
	const desktop = useIsDesktop();

	function focusOpener(event: Event) {
		event.preventDefault();
		returnFocus.current?.focus();
	}

	if (desktop) {
		return (
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent
					aria-describedby={undefined}
					onCloseAutoFocus={focusOpener}
				>
					{children(true)}
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerContent
				aria-describedby={undefined}
				onOpenAutoFocus={(event) => {
					event.preventDefault();
					field.current?.focus();
				}}
				onCloseAutoFocus={focusOpener}
			>
				{children(false)}
			</DrawerContent>
		</Drawer>
	);
}

export function NameDialogLayout({
	desktop,
	title,
	formId,
	form,
	saving,
	submitLabel,
	pendingLabel,
	SubmitIcon,
	submitDisabled = false,
	onCancel,
}: {
	desktop: boolean;
	title: string;
	formId: string;
	form: ReactNode;
	saving: boolean;
	submitLabel: string;
	pendingLabel: string;
	SubmitIcon?: LucideIcon;
	submitDisabled?: boolean;
	onCancel: () => void;
}) {
	const actions = (size: "default" | "lg", className?: string) => (
		<>
			<Button
				type="submit"
				form={formId}
				size={size}
				disabled={saving || submitDisabled}
				className={className}
			>
				{saving ? (
					<Spinner aria-hidden />
				) : (
					SubmitIcon && <SubmitIcon aria-hidden="true" />
				)}
				{saving ? pendingLabel : submitLabel}
			</Button>
			<Button
				type="button"
				variant="outline"
				size={size}
				disabled={saving}
				className={className}
				onClick={onCancel}
			>
				Cancelar
			</Button>
		</>
	);

	if (desktop) {
		return (
			<>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>
				{form}
				<DialogFooter className="flex-row-reverse justify-start">
					{actions("default")}
				</DialogFooter>
			</>
		);
	}

	return (
		<>
			<DrawerHeader>
				<DrawerTitle>{title}</DrawerTitle>
			</DrawerHeader>
			<div className="grid px-(--page-pad) pt-(--space-2) pb-(--space-5)">
				{form}
			</div>
			<DrawerFooter className="flex-col">
				{actions("lg", "w-full")}
			</DrawerFooter>
		</>
	);
}
