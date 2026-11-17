import type { LocationDetail } from "@bluprint/shared";
import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { useClearSessionDraft, useSessionDraft } from "@/features/auth";
import { firstLoadState } from "@/lib/firstLoadState";
import { isProjectDelivered } from "../../projects/api";
import { typologiesQueryOptions, useChangeTypologyMutation } from "../api";
import { FormDialog } from "../components/FormDialog";
import { plural } from "../plural";
import { holderText } from "./holderText";
import type { RoomHolder } from "./roomNames";

const NONE = "none";

export function ChangeTypologyDialog({
	projectId,
	location,
	holder,
	onClose,
	returnFocus,
}: {
	projectId: string;
	location: LocationDetail;
	holder: RoomHolder;
	onClose: () => void;
	returnFocus: () => HTMLElement | null | undefined;
}) {
	const formId = useId();
	const typologies = useQuery(typologiesQueryOptions(projectId));
	const change = useChangeTypologyMutation(projectId, location.id);
	const text = holderText(holder);
	const current = location.typology?.id ?? NONE;
	const restored = useSessionDraft("change-typology", (variables) =>
		variables === null || typeof variables === "string" ? variables : undefined,
	);
	const clearDraft = useClearSessionDraft("change-typology");
	const [choice, setChoice] = useState(
		restored === null ? NONE : (restored ?? current),
	);
	const loadFailed =
		!typologies.data && firstLoadState(typologies) === "failed";

	function close() {
		clearDraft();
		onClose();
	}

	function submit() {
		if (choice === current) return close();
		change.mutate(choice === NONE ? null : choice, {
			onSuccess: (changed) => {
				toast.success(
					changed.typology
						? text.nowFollows(location.name, changed.typology.name)
						: text.leftWithoutTypology(location.name),
				);
				close();
			},
			onError: (failure) => {
				if (isProjectDelivered(failure)) close();
			},
		});
	}

	const saveFailed = change.isError && !isProjectDelivered(change.error);

	return (
		<FormDialog
			title={text.changeTypologyTitle(location.name)}
			description={text.changeTypologyDescription}
			submitLabel="Trocar"
			pendingLabel="Trocando…"
			pending={change.isPending}
			submitDisabled={!typologies.data || choice === current}
			formId={formId}
			onSubmit={submit}
			onClose={close}
			returnFocus={returnFocus}
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
						onClick={() => typologies.refetch()}
					>
						Tentar de novo
					</Button>
				</Alert>
			) : !typologies.data ? (
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
					{typologies.data.typologies
						.filter((type) => type.locationType === holder)
						.map((type) => (
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
								{text.ownRoomsOption}
							</span>
						</span>
					</RadioGroupItem>
				</RadioGroup>
			)}
		</FormDialog>
	);
}
