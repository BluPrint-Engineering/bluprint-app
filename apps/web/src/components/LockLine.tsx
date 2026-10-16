import { Lock } from "lucide-react";

export function LockLine({ children }: { children: React.ReactNode }) {
	return (
		<p className="flex items-center gap-(--space-2) text-sm text-muted-foreground">
			<Lock className="size-4 shrink-0" aria-hidden="true" />
			{children}
		</p>
	);
}
