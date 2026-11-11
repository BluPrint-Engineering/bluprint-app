import { SESSION_CACHE_SECONDS } from "@bluprint/shared";
import { onlineManager, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { discardSession, sessionQueryOptions } from "./api";
import { screenPath } from "./sessionDraft";

type Phase = "shown" | "checking" | "failed";

export function useReturnSessionCheck() {
	const [phase, setPhase] = useState<Phase>("shown");
	const hiddenAt = useRef<number | null>(null);
	const waitingForNetwork = useRef(false);
	const router = useRouter();
	const queryClient = useQueryClient();

	const recheck = useCallback(async () => {
		setPhase("checking");
		if (!onlineManager.isOnline()) {
			waitingForNetwork.current = true;
			return;
		}
		waitingForNetwork.current = false;
		try {
			const session = await queryClient.fetchQuery({
				...sessionQueryOptions,
				staleTime: 0,
			});
			if (!session) {
				discardSession(queryClient);
				await router.navigate({
					to: "/login",
					search: { redirect: screenPath(router.state.location) },
				});
				return;
			}
			setPhase("shown");
		} catch {
			if (!onlineManager.isOnline()) {
				waitingForNetwork.current = true;
				setPhase("checking");
				return;
			}
			setPhase("failed");
		}
	}, [queryClient, router]);

	useEffect(() => {
		return onlineManager.subscribe((online) => {
			if (online && waitingForNetwork.current) void recheck();
		});
	}, [recheck]);

	useEffect(() => {
		function onVisibility() {
			if (document.visibilityState === "hidden") {
				hiddenAt.current = Date.now();
				return;
			}
			const left = hiddenAt.current;
			hiddenAt.current = null;
			if (left === null) return;
			if (Date.now() - left <= SESSION_CACHE_SECONDS * 1000) return;
			void recheck();
		}
		document.addEventListener("visibilitychange", onVisibility);
		return () => document.removeEventListener("visibilitychange", onVisibility);
	}, [recheck]);

	return {
		phase,
		retry() {
			void recheck();
		},
	};
}
