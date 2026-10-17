import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function SectionSkeleton({ label }: { label: string }) {
	return (
		<div role="status" aria-label={label} className="grid gap-(--space-2)">
			<Skeleton aria-hidden className="h-5 w-3/4" />
			<Skeleton aria-hidden className="h-11 w-40" />
		</div>
	);
}

export function SectionFailure({
	state,
	what,
	onRetry,
}: {
	state: "failed" | "offline";
	what: string;
	onRetry: () => void;
}) {
	if (state === "offline") {
		return (
			<p role="status" className="text-sm text-muted-foreground">
				Sem conexão. Continuamos assim que a internet voltar.
			</p>
		);
	}
	return (
		<div role="alert" className="grid justify-items-start gap-(--space-2)">
			<p className="text-sm text-muted-foreground">
				Não foi possível carregar {what}. Confira sua conexão e tente de novo.
			</p>
			<Button type="button" variant="outline" onClick={onRetry}>
				Tentar de novo
			</Button>
		</div>
	);
}
