import type { ProjectSummary } from "@bluprint/shared";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ChangeReservationDialog } from "../../projects/components/ChangeReservationDialog";
import { projectUnitsQueryOptions } from "../api";
import { addUnitLine } from "../reserveText";
import { AddRow, type AddRowProps } from "./AddRow";

type AddUnitRowProps = Omit<
	AddRowProps,
	| "projectId"
	| "type"
	| "kind"
	| "label"
	| "hint"
	| "hintLoading"
	| "blocked"
	| "scope"
	| "buttonRef"
> & { project: ProjectSummary };

export function AddUnitRow({ project, ...row }: AddUnitRowProps) {
	const units = useQuery(projectUnitsQueryOptions(project.id));
	const admin = project.role === "admin";
	const [reserving, setReserving] = useState(false);
	const alterReservation = useRef<HTMLButtonElement>(null);
	const addButton = useRef<HTMLButtonElement>(null);
	const remaining = units.data?.remaining;
	const exhausted = remaining !== undefined && remaining <= 0;
	const wasExhausted = useRef(exhausted);
	useEffect(() => {
		const unblocked = wasExhausted.current && !exhausted;
		wasExhausted.current = exhausted;
		if (unblocked && document.activeElement === document.body) {
			addButton.current?.focus();
		}
	}, [exhausted]);

	return (
		<>
			<AddRow
				{...row}
				projectId={project.id}
				kind="floor-unit"
				type="unit"
				scope="tower"
				label="Adicionar unidade"
				hint={remaining === undefined ? undefined : addUnitLine(remaining)}
				hintLoading={units.isPending}
				buttonRef={addButton}
				blocked={
					exhausted ? (
						<>
							A reserva da obra acabou.{" "}
							{admin ? (
								<button
									ref={alterReservation}
									type="button"
									className="relative font-medium text-primary underline underline-offset-3 after:absolute after:-inset-y-3 after:inset-x-0"
									onClick={() => setReserving(true)}
								>
									Alterar reserva
								</button>
							) : (
								"Fale com o admin da construtora."
							)}
						</>
					) : undefined
				}
			/>
			{admin && (
				<ChangeReservationDialog
					project={project}
					open={reserving}
					onOpenChange={setReserving}
					returnFocus={exhausted ? alterReservation : addButton}
					onSaved={() => void units.refetch()}
				/>
			)}
		</>
	);
}
