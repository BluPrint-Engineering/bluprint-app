import type { ProjectSummary } from "@bluprint/shared";
import { useQuery } from "@tanstack/react-query";
import { type RefObject, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { firstLoadState } from "@/lib/firstLoadState";
import { useIsDesktop } from "@/lib/useIsDesktop";
import { organizationUnitsQueryOptions } from "../../account/api";
import {
	availableUnitsOf,
	isProjectDelivered,
	isReservationRefusal,
	useChangeReservationMutation,
	usedUnitsOf,
} from "../api";
import { plural } from "./plural";
import {
	aboveFreeMessage,
	belowUsedMessage,
	freeAfter,
	parseUnits,
	remainingIn,
	reservationError,
} from "./reservationForm";

const SAVE_FAILED =
	"Não foi possível salvar a reserva. Confira sua conexão e tente de novo.";
const NOT_CHANGED = "A reserva não foi alterada.";
const UNITS_FAILED =
	"Não foi possível carregar as unidades livres. Confira sua conexão e tente de novo.";

function refusalMessage(failure: Error) {
	const floor = usedUnitsOf(failure);
	if (floor !== undefined) return belowUsedMessage(floor);
	const available = availableUnitsOf(failure);
	if (available !== undefined) return aboveFreeMessage(available);
	return undefined;
}

interface ChangeReservationDialogProps {
	project: ProjectSummary;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	returnFocus: RefObject<HTMLElement | null>;
	onSaved?: () => void;
}

function Figure({
	label,
	value,
	before,
}: {
	label: string;
	value: number | undefined;
	before: number | undefined;
}) {
	return (
		<Card size="sm" className="gap-0.5 px-(--card-spacing)">
			<span className="text-sm text-muted-foreground">{label}</span>
			<span className="font-mono text-lg font-semibold tabular-nums">
				{value ?? "–"}
			</span>
			<span className="min-h-4 text-xs text-muted-foreground">
				{before !== undefined && `Antes: ${before}`}
			</span>
		</Card>
	);
}

export function ChangeReservationDialog({
	project,
	open,
	onOpenChange,
	returnFocus,
	onSaved,
}: ChangeReservationDialogProps) {
	const desktop = useIsDesktop();
	const units = useQuery({ ...organizationUnitsQueryOptions, enabled: open });
	const { used, reserved } = project.units;
	const formId = useId();
	const [typed, setTyped] = useState(String(reserved));
	const [touched, setTouched] = useState(false);
	const [refused, setRefused] = useState<string>();
	const shown = useRef(open);
	useEffect(() => {
		shown.current = open;
		return () => {
			shown.current = false;
		};
	}, [open]);
	const change = useChangeReservationMutation(project.id, {
		saved: (saved) => {
			const { reserved: now } = saved.units;
			toast.success(
				`Reserva da ${saved.name}: ${now} ${plural(now, "unidade", "unidades")}.`,
			);
			onSaved?.();
			if (shown.current) onOpenChange(false);
		},
		failed: (failure) => {
			if (isProjectDelivered(failure)) {
				if (shown.current) onOpenChange(false);
				return;
			}
			const refusal = refusalMessage(failure);
			if (shown.current) setRefused(refusal);
			else toast.error(refusal ? `${NOT_CHANGED} ${refusal}` : SAVE_FAILED);
		},
	});
	const free = units.data?.free;
	const unitsFailed = free === undefined && firstLoadState(units) === "failed";
	const figures = { used, reserved, free };
	const saving = change.isPending;

	const { reset } = change;
	useEffect(() => {
		if (open || saving) return;
		setTyped(String(reserved));
		setTouched(false);
		setRefused(undefined);
		reset();
	}, [open, saving, reserved, reset]);

	const wanted = parseUnits(typed);
	const invalid = reservationError(figures, wanted);
	const blocked = wanted === undefined || free === undefined || !!invalid;
	const error = refused ?? (touched ? invalid : undefined);
	const changed = wanted !== undefined && wanted !== reserved;

	function focusOpener(event: Event) {
		event.preventDefault();
		returnFocus.current?.focus();
	}

	function handleOpenChange(next: boolean) {
		if (!saving) onOpenChange(next);
	}

	function submit() {
		setTouched(true);
		if (blocked || wanted === undefined) return;
		change.mutate(wanted);
	}

	const context =
		free === undefined
			? !unitsFailed && <Skeleton aria-hidden className="h-4 w-4/5" />
			: `A obra usa ${used} ${plural(used, "unidade", "unidades")}. A construtora tem ${free} ${plural(free, "livre", "livres")}.`;

	const form = (
		<form
			id={formId}
			noValidate
			className="grid gap-(--space-4)"
			onSubmit={(event) => {
				event.preventDefault();
				submit();
			}}
		>
			{unitsFailed && (
				<Alert variant="destructive">
					<AlertDescription>{UNITS_FAILED}</AlertDescription>
					<Button
						type="button"
						variant="outline"
						className="mt-(--space-2) justify-self-start"
						onClick={() => units.refetch()}
					>
						Tentar de novo
					</Button>
				</Alert>
			)}
			{change.isError && !isReservationRefusal(change.error) && (
				<Alert variant="destructive">
					<AlertDescription>{SAVE_FAILED}</AlertDescription>
				</Alert>
			)}
			<Field data-invalid={!!error}>
				<FieldLabel htmlFor={`${formId}-units`}>Unidades reservadas</FieldLabel>
				<Input
					id={`${formId}-units`}
					inputMode="numeric"
					autoComplete="off"
					enterKeyHint="done"
					autoFocus
					value={typed}
					disabled={saving}
					aria-invalid={!!error}
					onFocus={(event) => event.currentTarget.select()}
					onChange={(event) => {
						setRefused(undefined);
						setTyped(event.target.value.replace(/\D/g, ""));
					}}
					onBlur={() => setTouched(true)}
					onKeyDown={(event) => {
						if (event.key === "Enter") setTouched(true);
					}}
				/>
				{error && <FieldError>{error}</FieldError>}
			</Field>
			<div
				aria-live="polite"
				className="grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-(--space-2)"
			>
				<Figure
					label="Restam na obra"
					value={remainingIn(figures, wanted)}
					before={changed ? reserved - used : undefined}
				/>
				<Figure
					label="Livres na construtora"
					value={freeAfter(figures, wanted)}
					before={changed ? free : undefined}
				/>
			</div>
		</form>
	);

	const actions = (size: "default" | "lg", className?: string) => (
		<>
			<Button
				type="submit"
				form={formId}
				size={size}
				disabled={saving || blocked}
				className={className}
			>
				{saving && <Spinner aria-hidden />}
				{saving ? "Salvando…" : "Salvar"}
			</Button>
			<Button
				type="button"
				variant="outline"
				size={size}
				disabled={saving}
				className={className}
				onClick={() => onOpenChange(false)}
			>
				Cancelar
			</Button>
		</>
	);

	if (desktop) {
		return (
			<Dialog open={open} onOpenChange={handleOpenChange}>
				<DialogContent onCloseAutoFocus={focusOpener}>
					<DialogHeader>
						<DialogTitle>Alterar reserva</DialogTitle>
						<DialogDescription asChild>
							<div>{context}</div>
						</DialogDescription>
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
		<Drawer open={open} onOpenChange={handleOpenChange} dismissible={!saving}>
			<DrawerContent onCloseAutoFocus={focusOpener}>
				<DrawerHeader>
					<DrawerTitle>Alterar reserva</DrawerTitle>
					<DrawerDescription asChild>
						<div>{context}</div>
					</DrawerDescription>
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
