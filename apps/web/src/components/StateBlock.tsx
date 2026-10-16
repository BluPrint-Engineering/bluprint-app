import type { LucideIcon } from "lucide-react";
import type * as React from "react";

interface StateBlockProps {
	icon: LucideIcon;
	title: string;
	description: string;
	role?: "status" | "alert";
	children?: React.ReactNode;
}

export function StateBlock({
	icon: Icon,
	title,
	description,
	role = "status",
	children,
}: StateBlockProps) {
	return (
		<div
			role={role}
			className="mx-auto grid w-full max-w-(--content-max) justify-items-center gap-(--space-4) py-(--space-12) text-center text-muted-foreground md:py-(--space-16)"
		>
			<Icon className="size-6" aria-hidden="true" />
			<div className="grid gap-(--space-1)">
				<h2 className="text-lg leading-snug font-semibold tracking-tight text-foreground">
					{title}
				</h2>
				<p className="text-sm leading-normal text-pretty">{description}</p>
			</div>
			{children}
		</div>
	);
}
