import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { StructureDraft } from "../structureDraftStore";
import {
	CheckingStatus,
	StaleDraftAlert,
	UncertainAlert,
} from "./AttemptAlerts";
import {
	attemptOutcome,
	type CheckAction,
	useFinishAttempt,
} from "./attemptCheck";
import { buildPlan } from "./buildPlan";
import { initialDraft, restoreWizardDraft } from "./wizardDraft";

export function UnusableAttemptGate({
	projectId,
	towerId,
	towerName,
	storageKey,
	stored,
	onReopen,
	onMissing,
}: {
	projectId: string;
	towerId?: string | undefined;
	towerName?: string | undefined;
	storageKey: string;
	stored: StructureDraft;
	onReopen: () => void;
	onMissing: () => void;
}) {
	const queryClient = useQueryClient();
	const finish = useFinishAttempt(projectId, storageKey);
	const [checking, setChecking] = useState<CheckAction | undefined>("open");
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
	async function check(action: CheckAction) {
		if (!stored.attempt) return;
		setChecking(action);
		setNoConnection(false);
		const outcome = await attemptOutcome(
			queryClient,
			projectId,
			stored.attempt.firstLocationId,
		);
		if (outcome === "created") {
			const start = towerId
				? {
						...initialDraft(),
						extend: { towerId },
					}
				: undefined;
			const draft = restoreWizardDraft(stored.draft, start);
			finish(
				buildPlan(draft, (key) => key).counts,
				towerId === undefined ? undefined : { id: towerId, name: towerName },
			);
			return;
		}
		if (staleRef.current) {
			setChecking(undefined);
			return;
		}
		if (outcome === "missing") {
			localStorage.removeItem(storageKey);
			onMissing();
		} else {
			setNoConnection(action === "edit");
			setChecking(undefined);
		}
	}
	useEffect(() => {
		if (started.current) return;
		started.current = true;
		void check("open");
	});
	if (stale)
		return (
			<StaleDraftAlert waiting={checking !== undefined} onLoad={onReopen} />
		);
	if (checking === "open")
		return <CheckingStatus extending={towerId !== undefined} />;
	return (
		<UncertainAlert
			checking={checking}
			noConnection={noConnection}
			onRetry={() => void check("retry")}
			onEdit={() => void check("edit")}
		/>
	);
}
