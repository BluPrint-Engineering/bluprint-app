import { useRouter } from "@tanstack/react-router";
import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/** The session could not be verified, so the visitor is neither let in nor sent to the login. */
export function SessionCheckFailed() {
	const router = useRouter();

	return (
		<div className="grid min-h-dvh place-items-center bg-background px-(--page-pad)">
			<div className="grid justify-items-center gap-(--space-4) text-center">
				<img src="/brand/logo-mark.svg" alt="" className="h-12" />
				<CircleAlert
					className="size-6 text-muted-foreground"
					aria-hidden="true"
				/>
				<div className="grid gap-(--space-1)">
					<h1 className="text-lg font-semibold">
						Não foi possível verificar sua sessão
					</h1>
					<p className="text-sm text-muted-foreground">
						Confira sua conexão e tente de novo.
					</p>
				</div>
				<Button size="lg" onClick={() => router.invalidate()}>
					Tentar de novo
				</Button>
			</div>
		</div>
	);
}
