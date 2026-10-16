import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LocationListItem {
	id: string;
	name: string;
	meta?: string | undefined;
}

export function LocationList({
	projectId,
	title,
	items,
	mono = false,
	empty,
}: {
	projectId: string;
	title: string;
	items: LocationListItem[];
	mono?: boolean;
	empty?: string;
}) {
	return (
		<section className="grid content-start gap-(--space-3)">
			<h2 className="text-lg font-semibold tracking-tight">{title}</h2>
			{items.length === 0 ? (
				<p className="text-sm text-muted-foreground">{empty}</p>
			) : (
				<ul className="overflow-hidden rounded-xl bg-card shadow-(--ring-hairline)">
					{items.map((item) => (
						<li
							key={item.id}
							className="border-t border-border first:border-t-0"
						>
							<Link
								to="/projects/$projectId/locations/$locationId"
								params={{ projectId, locationId: item.id }}
								className="flex min-h-14 items-center gap-(--space-2) py-(--space-2) pr-(--space-4) pl-(--space-4) outline-none hover:bg-muted focus-visible:shadow-[inset_0_0_0_2px_var(--ring)]"
							>
								<span className="grid min-w-0 flex-1">
									<span
										className={cn(
											"text-base font-medium [overflow-wrap:anywhere]",
											mono && "font-mono",
										)}
									>
										{item.name}
									</span>
									{item.meta && (
										<span className="text-sm text-muted-foreground">
											{item.meta}
										</span>
									)}
								</span>
								<ChevronRight
									className="size-5 shrink-0 text-muted-foreground"
									aria-hidden="true"
								/>
							</Link>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
