import type { ProjectSummary } from "@bluprint/shared";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useSessionDraft } from "@/features/auth";
import { reservationDraft } from "../../projects/api";
import { ChangeReservationDialog } from "../../projects/components/ChangeReservationDialog";
import { projectUnitsQueryOptions } from "../api";
import { addOneLine } from "../reserveText";
import { AddRow, type AddRowProps } from "./AddRow";

type AddReservedRowProps = Omit<
	AddRowProps,
	"projectId" | "type" | "hint" | "hintLoading" | "blocked" | "buttonRef"
> & {
	project: ProjectSummary;
	type: "unit" | "common_area";
	reopensReservation?: boolean;
};

export function AddReservedRow({
	project,
	reopensReservation = false,
	...row
}: AddReservedRowProps) {
	const units = useQuery(projectUnitsQueryOptions(project.id));
	const admin = project.role === "admin";
	const restoredReservation = useSessionDraft(
		"change-reservation",
		(variables) => {
			const draft = reservationDraft(variables);
			const ours =
				draft?.opener === undefined
					? reopensReservation
					: draft.opener === row.kind;
			return ours ? draft : undefined;
		},
	);
	const [reserving, setReserving] = useState(
		admin && restoredReservation !== undefined,
	);
	const alterReservation = useRef<HTMLButtonElement>(null);
	const addButton = useRef<HTMLButtonElement>(null);
	const remaining = units.data?.remaining;
	const exhausted = remaining !== undefined && remaining <= 0;
	const savedAt = useRef<number>(undefined);
	const updatedAt = units.dataUpdatedAt;
	useEffect(() => {
		if (savedAt.current === undefined || updatedAt < savedAt.current) return;
		savedAt.current = undefined;
		if (!exhausted && document.activeElement === document.body) {
			addButton.current?.focus();
		}
	}, [exhausted, updatedAt]);

	return (
		<>
			<AddRow
				{...row}
				projectId={project.id}
				hint={remaining === undefined ? undefined : addOneLine(remaining)}
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
					onSaved={() => {
						savedAt.current = Date.now();
						void units.refetch().then((result) => {
							if (result.isError) savedAt.current = undefined;
						});
					}}
					opener={row.kind}
				/>
			)}
		</>
	);
}
