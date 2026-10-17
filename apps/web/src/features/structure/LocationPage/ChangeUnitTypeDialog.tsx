import type { LocationDetail } from "@bluprint/shared";
import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { firstLoadState } from "@/lib/firstLoadState";
import { isProjectDelivered } from "../../projects/api";
import { unitTypesQueryOptions, useChangeUnitTypeMutation } from "../api";
import { FormDialog } from "../components/FormDialog";
import { plural } from "../plural";

const NONE = "none";

export function ChangeUnitTypeDialog({
	projectId,
	unit,
	onClose,
}: {
	projectId: string;
	unit: LocationDetail;
	onClose: () => void;
}) {
	const formId = useId();
	const unitTypes = useQuery(unitTypesQueryOptions(projectId));
	const change = useChangeUnitTypeMutation(projectId, unit.id);
	const current = unit.unitType?.id ?? NONE;
	const [choice, setChoice] = useState(current);
	const loadFailed = !unitTypes.data && firstLoadState(unitTypes) === "failed";

	function submit() {
		if (choice === current) return onClose();
		change.mutate(choice === NONE ? null : choice, {
			onSuccess: (changed) => {
				toast.success(
					changed.unitType
						? `A unidade ${unit.name} agora segue a tipologia ${changed.unitType.name}.`
						: `A unidade ${unit.name} ficou sem tipologia.`,
				);
				onClose();
			},
			onError: (failure) => {
				if (isProjectDelivered(failure)) onClose();
			},
		});
	}

	const saveFailed = change.isError && !isProjectDelivered(change.error);

	return (
		<FormDialog
			title={`Trocar a tipologia da ${unit.name}`}
			description="Os cômodos passam a ser os da tipologia escolhida. Cômodo com pins continua na unidade."
			submitLabel="Trocar"
			pendingLabel="Trocando…"
			pending={change.isPending}
			submitDisabled={!unitTypes.data || choice === current}
			formId={formId}
			onSubmit={submit}
			onClose={onClose}
		>
			{saveFailed && (
				<Alert variant="destructive">
					<AlertDescription>
						Não foi possível trocar a tipologia. Confira sua conexão e tente de
						novo.
					</AlertDescription>
				</Alert>
			)}
			{loadFailed ? (
				<Alert variant="destructive">
					<AlertDescription>
						Não foi possível carregar as tipologias. Confira sua conexão e tente
						de novo.
					</AlertDescription>
					<Button
						type="button"
						variant="outline"
						className="mt-(--space-2) justify-self-start"
						onClick={() => unitTypes.refetch()}
					>
						Tentar de novo
					</Button>
				</Alert>
			) : !unitTypes.data ? (
				<div
					role="status"
					aria-label="Carregando tipologias"
					className="grid gap-(--space-2)"
				>
					<Skeleton className="h-11" />
					<Skeleton className="h-11" />
				</div>
			) : (
				<RadioGroup
					aria-label="Tipologia"
					value={choice}
					disabled={change.isPending}
					onValueChange={setChoice}
				>
					{unitTypes.data.unitTypes.map((type) => (
						<RadioGroupItem key={type.id} value={type.id}>
							<span className="grid">
								<span>{type.name}</span>
								<span className="text-sm text-muted-foreground">
									{plural(type.rooms.length, "cômodo", "cômodos")}
								</span>
							</span>
						</RadioGroupItem>
					))}
					<RadioGroupItem value={NONE}>
						<span className="grid">
							<span>Sem tipologia</span>
							<span className="text-sm text-muted-foreground">
								Cômodos só desta unidade
							</span>
						</span>
					</RadioGroupItem>
				</RadioGroup>
			)}
		</FormDialog>
	);
}
