import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SectionCard({
	id,
	title,
	children,
}: {
	id: string;
	title: string;
	children: ReactNode;
}) {
	return (
		<section id={id} aria-label={title} className="scroll-mt-22">
			<Card>
				<CardHeader>
					<CardTitle
						role="heading"
						aria-level={3}
						className="text-lg font-semibold tracking-tight"
					>
						{title}
					</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-(--space-4)">{children}</CardContent>
			</Card>
		</section>
	);
}

export function SectionNote({ children }: { children: ReactNode }) {
	return (
		<p className="text-sm text-pretty text-muted-foreground">{children}</p>
	);
}
