import type { LocationDetail } from "@bluprint/shared";
import { LayoutGrid, Undo2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useSessionDraft } from "@/features/auth";
import { useResetTypologyMutation } from "../api";
import { ChangeTypologyDialog } from "./ChangeTypologyDialog";
import { holderText } from "./holderText";
import type { RoomHolder } from "./roomNames";
import { changesLabel } from "./typologyLine";

export function TypologyCard({
	projectId,
	location,
	holder,
	editable,
}: {
	projectId: string;
	location: LocationDetail;
	holder: RoomHolder;
	editable: boolean;
}) {
	const { typology, changes } = location;
	const text = holderText(holder);
	const restoredType = useSessionDraft("change-typology", (variables) =>
		variables === null || typeof variables === "string" ? variables : undefined,
	);
	const [changingType, setChangingType] = useState(restoredType !== undefined);
	const changeTypeButton = useRef<HTMLButtonElement>(null);
	const reset = useResetTypologyMutation(projectId, location.id);

	function returnToTypology() {
		reset.mutate(undefined, {
			onSuccess: () =>
				toast.success(
					text.returnedToTypology(location.name, typology?.name ?? ""),
				),
			onError: () => toast.error(text.returnFailed(location.name)),
		});
	}

	return (
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
					{typology ? text.followsTypology(typology.name) : text.ownRoomsOnly}
				</p>
				{editable && (
					<div className="flex flex-wrap gap-(--space-2) max-md:*:flex-1">
						<Button
							ref={changeTypeButton}
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
			{changingType && (
				<ChangeTypologyDialog
					projectId={projectId}
					location={location}
					holder={holder}
					onClose={() => setChangingType(false)}
					returnFocus={() => changeTypeButton.current}
				/>
			)}
		</section>
	);
}
