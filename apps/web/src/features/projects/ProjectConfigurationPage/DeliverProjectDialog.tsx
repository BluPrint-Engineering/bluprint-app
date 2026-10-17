import type { ProjectSummary } from "@bluprint/shared";
import { CircleCheck, Lock, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import { Field, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { useIsDesktop } from "@/lib/useIsDesktop";
import { isProjectDelivered, useDeliverProjectMutation } from "../api";

const DELIVER_FAILED =
	"Não foi possível entregar a obra. Confira sua conexão e tente de novo.";

const CONSEQUENCES = [
	{
		Icon: Lock,
		text: "Ninguém mais cria, altera ou exclui pins, fotos, plantas, estrutura, equipe, disciplinas, empresas executoras ou o nome da obra: nada mais na obra muda.",
	},
	{ Icon: X, text: "A obra não pode ser reaberta." },
	{
		Icon: CircleCheck,
		text: "Os relatórios continuam disponíveis para exportar.",
	},
];

interface DeliverProjectDialogProps {
	project: ProjectSummary;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function DeliverProjectDialog({
	project,
	open,
	onOpenChange,
}: DeliverProjectDialogProps) {
	const desktop = useIsDesktop();
	const acknowledgementId = useId();
	const acknowledgement = useRef<HTMLButtonElement>(null);
	const [acknowledged, setAcknowledged] = useState(false);
	const shown = useRef(open);
	useEffect(() => {
		shown.current = open;
		return () => {
			shown.current = false;
		};
	}, [open]);

	const deliver = useDeliverProjectMutation(project.id, {
		delivered: (delivered) => {
			toast.success(`Obra “${delivered.name}” entregue.`);
			if (shown.current) onOpenChange(false);
		},
		failed: (failure) => {
			if (isProjectDelivered(failure) && shown.current) onOpenChange(false);
		},
	});
	const sending = deliver.isPending;

	const { reset } = deliver;
	useEffect(() => {
		if (open || sending) return;
		setAcknowledged(false);
		reset();
	}, [open, sending, reset]);

	function handleOpenChange(next: boolean) {
		if (!sending) onOpenChange(next);
	}

	function focusAcknowledgement(event: Event) {
		event.preventDefault();
		acknowledgement.current?.focus();
	}

	const failed = deliver.isError && !isProjectDelivered(deliver.error);

	const consequences = (
		<div className="grid gap-(--space-4)">
			<p>A entrega fecha a obra de vez. Depois de confirmar:</p>
			<ul className="grid gap-(--space-2)">
				{CONSEQUENCES.map(({ Icon, text }) => (
					<li
						key={text}
						className="grid grid-cols-[18px_minmax(0,1fr)] gap-(--space-2)"
					>
						<Icon
							className="mt-px size-4.5 text-muted-foreground"
							aria-hidden
						/>
						<span className="text-pretty">{text}</span>
					</li>
				))}
			</ul>
		</div>
	);

	const confirmation = (
		<div className="grid gap-(--space-4)">
			<Field orientation="horizontal" className="items-start gap-(--space-3)">
				<Checkbox
					ref={acknowledgement}
					id={acknowledgementId}
					checked={acknowledged}
					disabled={sending}
					className="mt-0.5"
					onCheckedChange={(checked) => setAcknowledged(checked === true)}
				/>
				<FieldLabel htmlFor={acknowledgementId} className="text-sm">
					Entendi que a obra não poderá ser reaberta.
				</FieldLabel>
			</Field>
			{failed && (
				<Alert variant="destructive">
					<AlertDescription>{DELIVER_FAILED}</AlertDescription>
				</Alert>
			)}
		</div>
	);

	const action = (size: "default" | "lg", className?: string) => (
		<Button
			type="button"
			size={size}
			className={className}
			disabled={!acknowledged || sending}
			onClick={() => deliver.mutate()}
		>
			{sending ? (
				<Spinner aria-hidden />
			) : (
				<CircleCheck className="size-4.5" aria-hidden />
			)}
			{sending ? "Entregando obra…" : "Entregar obra"}
		</Button>
	);

	const title = `Entregar “${project.name}”?`;

	if (desktop) {
		return (
			<AlertDialog open={open} onOpenChange={handleOpenChange}>
				<AlertDialogContent
					onOpenAutoFocus={focusAcknowledgement}
					onOverlayClick={() => handleOpenChange(false)}
				>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription asChild>
						{consequences}
					</AlertDialogDescription>
					{confirmation}
					<AlertDialogFooter>
						<AlertDialogCancel asChild>
							<Button type="button" variant="outline" disabled={sending}>
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
		<Drawer open={open} onOpenChange={handleOpenChange} dismissible={!sending}>
			<DrawerContent role="alertdialog" onOpenAutoFocus={focusAcknowledgement}>
				<DrawerHeader>
					<DrawerTitle className="[overflow-wrap:anywhere]">
						{title}
					</DrawerTitle>
				</DrawerHeader>
				<div className="grid gap-(--space-4) px-(--page-pad) pt-(--space-2) pb-(--space-5) text-sm">
					<DrawerDescription asChild>{consequences}</DrawerDescription>
					{confirmation}
				</div>
				<DrawerFooter className="flex-col">
					{action("lg", "w-full")}
					<Button
						type="button"
						variant="outline"
						size="lg"
						className="w-full"
						disabled={sending}
						onClick={() => onOpenChange(false)}
					>
						Cancelar
					</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}
