import { onlineManager } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { Spinner } from "@/components/ui/spinner";

/** Shown while the session is checked, so no protected — or login — content flashes first. */
export function SessionSplash() {
	// paused, not failed, while offline: the check resumes by itself when the connection returns
	const online = useSyncExternalStore(
		onlineManager.subscribe.bind(onlineManager),
		() => onlineManager.isOnline(),
	);

	return (
		<div className="grid min-h-dvh place-items-center gap-(--space-3) bg-background">
			<div className="grid justify-items-center gap-(--space-4) text-muted-foreground">
				<img src="/brand/logo-mark.svg" alt="" className="h-12" />
				<div className="grid justify-items-center gap-(--space-1) text-center">
					<span className="flex items-center gap-(--space-2) text-sm">
						<Spinner className="size-4.5" />
						{online ? "Verificando sua sessão…" : "Sem conexão."}
					</span>
					{!online && (
						<p className="text-sm">Continuamos assim que a internet voltar.</p>
					)}
				</div>
			</div>
		</div>
	);
}
