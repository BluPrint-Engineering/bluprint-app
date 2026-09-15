import { Spinner } from "@/components/ui/spinner";

/** Shown while the session is checked, so no protected — or login — content flashes first. */
export function SessionSplash() {
	return (
		<div className="grid min-h-dvh place-items-center gap-(--space-3) bg-background">
			<div className="grid justify-items-center gap-(--space-4) text-muted-foreground">
				<img src="/brand/logo-mark.svg" alt="" className="h-12" />
				<span className="flex items-center gap-(--space-2) text-sm">
					<Spinner className="size-4.5" /> Verificando sua sessão…
				</span>
			</div>
		</div>
	);
}
