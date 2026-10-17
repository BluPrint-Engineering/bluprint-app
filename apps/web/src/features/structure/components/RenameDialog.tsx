import type { LocationType } from "@bluprint/shared";
import { type RefObject, useId, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useIsDesktop } from "@/lib/useIsDesktop";
import { cn } from "@/lib/utils";
import { isProjectDelivered } from "../../projects/api";
import { namesTakenOf, useRenameLocationMutation } from "../api";
import {
	nameProblem,
	renameTitle,
	type Scope,
	takenText,
	uniqueHint,
} from "../naming";

export interface RenameTarget {
	id: string;
	type: LocationType;
	name: string;
	scope: Scope;
	towerName?: string | undefined;
}

const RENAME_FAILED =
	"Não foi possível renomear. Confira sua conexão e tente de novo.";

interface RenameDialogProps {
	projectId: string;
	target: RenameTarget;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	returnFocus: RefObject<HTMLElement | null>;
}

function RenameContent({
	projectId,
	target,
	desktop,
	field,
	onDone,
}: {
	projectId: string;
	target: RenameTarget;
	desktop: boolean;
	field: RefObject<HTMLInputElement | null>;
	onDone: () => void;
}) {
	const formId = useId();
	const rename = useRenameLocationMutation(projectId);
	const [name, setName] = useState(target.name);
	const [problem, setProblem] = useState<string>();
	const saving = rename.isPending;
	const mono = target.type === "unit";

	const taken = namesTakenOf(rename.error);
	const error =
		problem ??
		(taken === undefined
			? undefined
			: takenText(target.type, name.trim(), target.scope, target.towerName));
	const failed = rename.isError && taken === undefined;

	function submit() {
		const found = nameProblem(name);
		if (found) return setProblem(found);
		if (name.trim() === target.name) return onDone();
		rename.mutate(
			{ locationId: target.id, name },
			{
				onSuccess: onDone,
				onError: (failure) => {
					if (isProjectDelivered(failure)) onDone();
				},
			},
		);
	}

	const form = (
		<form
			id={formId}
			noValidate
			className="grid gap-(--space-3)"
			onSubmit={(event) => {
				event.preventDefault();
				if (!saving) submit();
			}}
		>
			{failed && (
				<Alert variant="destructive">
					<AlertDescription>{RENAME_FAILED}</AlertDescription>
				</Alert>
			)}
			<Field data-invalid={!!error}>
				<FieldLabel htmlFor={`${formId}-name`}>Nome</FieldLabel>
				<Input
					ref={field}
					id={`${formId}-name`}
					autoComplete="off"
					enterKeyHint="done"
					autoFocus
					value={name}
					readOnly={saving}
					aria-invalid={!!error}
					aria-describedby={`${formId}-note`}
					className={cn(mono && "font-mono")}
					onFocus={(event) => event.currentTarget.select()}
					onChange={(event) => {
						setProblem(undefined);
						rename.reset();
						setName(event.target.value);
					}}
				/>
				{error ? (
					<FieldError id={`${formId}-note`}>{error}</FieldError>
				) : (
					<FieldDescription id={`${formId}-note`}>
						{uniqueHint(target.scope)}
					</FieldDescription>
				)}
			</Field>
		</form>
	);

	const actions = (size: "default" | "lg", className?: string) => (
		<>
			<Button
				type="submit"
				form={formId}
				size={size}
				disabled={saving}
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
				onClick={onDone}
			>
				Cancelar
			</Button>
		</>
	);

	if (desktop) {
		return (
			<>
				<DialogHeader>
					<DialogTitle>{renameTitle(target.type)}</DialogTitle>
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
				<DrawerTitle>{renameTitle(target.type)}</DrawerTitle>
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

export function RenameDialog({
	projectId,
	target,
	open,
	onOpenChange,
	returnFocus,
}: RenameDialogProps) {
	const desktop = useIsDesktop();
	const field = useRef<HTMLInputElement>(null);

	function focusOpener(event: Event) {
		event.preventDefault();
		returnFocus.current?.focus();
	}

	const content = (
		<RenameContent
			projectId={projectId}
			target={target}
			desktop={desktop}
			field={field}
			onDone={() => onOpenChange(false)}
		/>
	);

	if (desktop) {
		return (
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent
					aria-describedby={undefined}
					onCloseAutoFocus={focusOpener}
				>
					{content}
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
				{content}
			</DrawerContent>
		</Drawer>
	);
}
