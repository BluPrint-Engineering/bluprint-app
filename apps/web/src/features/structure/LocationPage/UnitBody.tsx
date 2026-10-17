import type { LocationDetail } from "@bluprint/shared";
import { LayoutGrid, Undo2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useResetUnitTypeMutation } from "../api";
import { ChangeUnitTypeDialog } from "./ChangeUnitTypeDialog";
import { RoomsCard } from "./RoomsCard";
import { changesLabel } from "./unitTypeLine";

export function UnitBody({
	projectId,
	unit,
	editable,
}: {
	projectId: string;
	unit: LocationDetail;
	editable: boolean;
}) {
	const { unitType, changes } = unit;
	const [changingType, setChangingType] = useState(false);
	const reset = useResetUnitTypeMutation(projectId, unit.id);

	function returnToUnitType() {
		reset.mutate(undefined, {
			onSuccess: () =>
				toast.success(
					`A unidade ${unit.name} voltou à tipologia ${unitType?.name}.`,
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
							{unitType ? unitType.name : "Sem tipologia"}
						</span>
						{changes > 0 && (
							<Badge variant="outline">{changesLabel(changes)}</Badge>
						)}
					</div>
					<p className="text-sm text-pretty text-muted-foreground">
						{unitType
							? `Os cômodos acompanham a tipologia ${unitType.name}. O que foi mudado só nesta unidade continua assim quando a tipologia muda.`
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
									onClick={returnToUnitType}
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
				<ChangeUnitTypeDialog
					projectId={projectId}
					unit={unit}
					onClose={() => setChangingType(false)}
				/>
			)}
		</div>
	);
}
