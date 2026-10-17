import type { ProjectSummary } from "@bluprint/shared";
import { Pencil, SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { plural } from "../components/plural";
import { ChangeReservationDialog } from "./ChangeReservationDialog";
import { LockNote } from "./LockNote";
import { RenameProjectForm } from "./RenameProjectForm";
import { SECTION_ID } from "./sections";

function lockNote(project: ProjectSummary) {
	if (project.status === "delivered") {
		return "A obra foi entregue: o nome e a reserva não podem mais ser alterados.";
	}
	if (project.role === "assistant") {
		return "Só o gerente de obra ou o admin da construtora renomeia a obra.";
	}
	return null;
}

function unitsText({ status, units }: ProjectSummary) {
	if (status === "delivered") {
		return `Usou ${units.used} ${plural(units.used, "unidade", "unidades")}.`;
	}
	return `Usa ${units.used} de ${units.reserved} ${plural(units.reserved, "reservada", "reservadas")}`;
}

export function ProjectDetailsSection({
	project,
	reservationOpen,
	onReservationOpenChange,
}: {
	project: ProjectSummary;
	reservationOpen: boolean;
	onReservationOpenChange: (open: boolean) => void;
}) {
	const canChangeReservation =
		project.role === "admin" && project.status === "active";
	const note = lockNote(project);
	const [editing, setEditing] = useState(false);
	const renameButton = useRef<HTMLButtonElement>(null);
	const returnFocus = useRef(false);
	const reservationButton = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (!editing && returnFocus.current) {
			returnFocus.current = false;
			renameButton.current?.focus();
		}
	}, [editing]);

	return (
		<section
			id={SECTION_ID.details}
			aria-label="Dados da obra"
			className="scroll-mt-22"
		>
			<Card>
				<CardHeader>
					<CardTitle
						role="heading"
						aria-level={3}
						className="text-lg font-semibold tracking-tight"
					>
						Dados da obra
					</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-(--space-4)">
					{editing && !note ? (
						<RenameProjectForm
							project={project}
							onDone={() => {
								returnFocus.current = true;
								setEditing(false);
							}}
						/>
					) : (
						<div className="flex flex-wrap items-center justify-between gap-(--space-3)">
							<div className="grid min-w-0 flex-[1_1_14rem] gap-0.5">
								<span className="text-sm text-muted-foreground">
									Nome da obra
								</span>
								<span className="text-base font-medium [overflow-wrap:anywhere]">
									{project.name}
								</span>
							</div>
							{!note && (
								<Button
									ref={renameButton}
									variant="outline"
									onClick={() => setEditing(true)}
								>
									<Pencil className="size-4.5" aria-hidden />
									Renomear
								</Button>
							)}
						</div>
					)}
					<div className="flex flex-wrap items-center justify-between gap-(--space-3) border-t pt-(--space-4)">
						<div className="grid min-w-0 flex-[1_1_14rem] gap-0.5">
							<span className="text-sm text-muted-foreground">Unidades</span>
							<span className="text-base font-medium">
								{unitsText(project)}
							</span>
						</div>
						{canChangeReservation && (
							<Button
								ref={reservationButton}
								variant="outline"
								onClick={() => onReservationOpenChange(true)}
							>
								<SlidersHorizontal className="size-4.5" aria-hidden />
								Alterar reserva
							</Button>
						)}
					</div>
					{note && <LockNote>{note}</LockNote>}
				</CardContent>
			</Card>
			{canChangeReservation && (
				<ChangeReservationDialog
					project={project}
					open={reservationOpen}
					onOpenChange={onReservationOpenChange}
					returnFocus={reservationButton}
				/>
			)}
		</section>
	);
}
