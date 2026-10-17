import { Lock } from "lucide-react";

export function LockNote({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex items-start gap-(--space-2) border-t pt-(--space-4) text-sm text-pretty text-muted-foreground">
			<Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
			<span>{children}</span>
		</div>
	);
}
