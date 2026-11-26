import { LOCATION_NOT_FOUND } from "@bluprint/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { locationQueryOptions } from "../api";
import { createdToast, floorsAddedToast } from "../reserveText";
import { buildPlan } from "./buildPlan";
import type { StructureDraft } from "./structureDraftStore";
import { initialDraft, restoreWizardDraft } from "./wizardDraft";

export function UnusableAttemptGate({
	projectId,
	towerId,
	towerName,
	storageKey,
	stored,
	onMissing,
}: {
	projectId: string;
	towerId?: string | undefined;
	towerName?: string | undefined;
	storageKey: string;
	stored: StructureDraft;
	onMissing: () => void;
}) {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const [state, setState] = useState<"checking" | "uncertain">("checking");
	const [noConnection, setNoConnection] = useState(false);
	const [stale, setStale] = useState(false);
	const staleRef = useRef(false);
	const started = useRef(false);
	useEffect(() => {
		function changed(event: StorageEvent) {
			if (event.key === storageKey) {
				staleRef.current = true;
				setStale(true);
			}
		}
		window.addEventListener("storage", changed);
		return () => window.removeEventListener("storage", changed);
	}, [storageKey]);
	async function check(edit = false) {
		if (!stored.attempt) return;
		setState("checking");
		setNoConnection(false);
		try {
			await queryClient.fetchQuery({
				...locationQueryOptions(projectId, stored.attempt.firstLocationId),
				staleTime: 0,
				retry: false,
			});
			if (staleRef.current) return;
			const base = initialDraft();
			const start = towerId
				? {
						...base,
						extend: {
							towerId,
							towerName: "",
							named: false,
							takenFloors: [],
							takenUnits: [],
							lead: "",
						},
					}
				: undefined;
			const draft = restoreWizardDraft(stored.draft, start);
			if (!draft) throw new Error("Invalid draft");
			const counts = buildPlan(draft, (key) => key).counts;
			localStorage.removeItem(storageKey);
			void queryClient.invalidateQueries({
				queryKey: ["structure", projectId],
			});
			toast.success(
				towerId
					? floorsAddedToast(counts.floors, towerName)
					: createdToast(counts.towers, counts.units),
			);
			void navigate(
				towerId && towerName
					? {
							to: "/projects/$projectId/locations/$locationId",
							params: { projectId, locationId: towerId },
							replace: true,
						}
					: {
							to: "/projects/$projectId",
							params: { projectId },
							replace: true,
						},
			);
		} catch (error) {
			if (staleRef.current) return;
			if (
				error instanceof ApiError &&
				error.status === 404 &&
				error.problem?.code === LOCATION_NOT_FOUND
			) {
				localStorage.removeItem(storageKey);
				onMissing();
			} else {
				setNoConnection(edit);
				setState("uncertain");
			}
		}
	}
	useEffect(() => {
		if (started.current) return;
		started.current = true;
		void check();
	});
	if (stale)
		return (
			<Alert>
				<AlertTitle>Este rascunho mudou em outra aba</AlertTitle>
				<AlertDescription>
					<p>Continue a partir da versão mais recente para não perder nada.</p>
					<Button type="button" onClick={() => window.location.reload()}>
						Carregar a versão mais recente
					</Button>
				</AlertDescription>
			</Alert>
		);
	if (state === "checking")
		return (
			<p role="status">
				{towerId
					? "Conferindo se os andares foram adicionados…"
					: "Conferindo se a estrutura foi criada…"}
			</p>
		);
	return (
		<Alert variant="destructive">
			<AlertTitle>Não foi possível confirmar</AlertTitle>
			<AlertDescription>
				<p>
					A conexão caiu antes da resposta. Tente de novo: nada é criado duas
					vezes.
				</p>
				{noConnection && (
					<p>
						Ainda sem conexão. Para editar, o app precisa confirmar antes que
						nada foi criado.
					</p>
				)}
				<div className="flex flex-wrap gap-2">
					<Button type="button" onClick={() => void check()}>
						Tentar de novo
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={() => void check(true)}
					>
						Voltar a editar
					</Button>
				</div>
			</AlertDescription>
		</Alert>
	);
}
