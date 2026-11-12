import type { LocationDetail } from "@bluprint/shared";
import { LayoutGrid, Undo2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useSessionDraft } from "@/features/auth";
import { useResetTypologyMutation } from "../api";
import { ChangeTypologyDialog } from "./ChangeTypologyDialog";
import { RoomsCard } from "./RoomsCard";
import { changesLabel } from "./typologyLine";

export function UnitBody({
	projectId,
	unit,
	editable,
}: {
	projectId: string;
	unit: LocationDetail;
	editable: boolean;
}) {
	const { typology, changes } = unit;
	const restoredType = useSessionDraft("change-typology", (variables) =>
		variables === null || typeof variables === "string" ? variables : undefined,
	);
	const [changingType, setChangingType] = useState(restoredType !== undefined);
	const reset = useResetTypologyMutation(projectId, unit.id);

	function returnToTypology() {
		reset.mutate(undefined, {
			onSuccess: () =>
				toast.success(
					`A unidade ${unit.name} voltou à tipologia ${typology?.name}.`,
				),
			onError: () =>
				toast.error(
					`Não foi possível voltar a unidade ${unit.name} à tipologia. Confira sua conexão e tente de novo.`,
				),
		});
	}

	return (
		<div className="grid gap-(--space-6) md:grid-cols-[320px_minmax(0,1fr)] md:items-start md:gap-(--space-8)">
			<section className="grid content-start gap-(--space-3)">
				<h2 className="text-lg font-semibold tracking-tight">Tipologia</h2>
				<div className="grid gap-(--space-3) rounded-xl bg-card p-(--space-4) shadow-(--ring-hairline)">
					<div className="flex flex-wrap items-center gap-(--space-2)">
						<span className="text-base font-semibold">
							{typology ? typology.name : "Sem tipologia"}
						</span>
						{changes > 0 && (
							<Badge variant="outline">{changesLabel(changes)}</Badge>
						)}
					</div>
					<p className="text-sm text-pretty text-muted-foreground">
						{typology
							? `Os cômodos acompanham a tipologia ${typology.name}. O que foi mudado só nesta unidade continua assim quando a tipologia muda.`
							: "Os cômodos desta unidade são só dela."}
					</p>
					{editable && (
						<div className="flex flex-wrap gap-(--space-2) max-md:*:flex-1">
							<Button
								type="button"
								variant="outline"
								onClick={() => setChangingType(true)}
							>
								<LayoutGrid aria-hidden="true" />
								Trocar tipologia
							</Button>
							{changes > 0 && (
								<Button
									type="button"
									variant="ghost"
									disabled={reset.isPending}
									onClick={returnToTypology}
								>
									{reset.isPending ? (
										<Spinner aria-hidden />
									) : (
										<Undo2 aria-hidden="true" />
									)}
									Voltar à tipologia
								</Button>
							)}
						</div>
					)}
				</div>
			</section>
			<RoomsCard projectId={projectId} location={unit} editable={editable} />
			{changingType && (
				<ChangeTypologyDialog
					projectId={projectId}
					unit={unit}
					onClose={() => setChangingType(false)}
				/>
			)}
		</div>
	);
}
