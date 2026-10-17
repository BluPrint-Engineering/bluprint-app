import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface LocationListItem {
	id: string;
	name: string;
	meta?: string | undefined;
	menu?: ReactNode;
}

export function ListCard({ children }: { children: ReactNode }) {
	return (
		<ul className="overflow-hidden rounded-xl bg-card shadow-(--ring-hairline)">
			{children}
		</ul>
	);
}

export function ListRow({ children }: { children: ReactNode }) {
	return (
		<li className="border-t border-border first:border-t-0">{children}</li>
	);
}

export function LocationList({
	projectId,
	title,
	items,
	mono = false,
	empty,
	footer,
}: {
	projectId: string;
	title: string;
	items: LocationListItem[];
	mono?: boolean;
	empty?: string;
	footer?: ReactNode;
}) {
	return (
		<section className="grid content-start gap-(--space-3)">
			<h2 className="text-lg font-semibold tracking-tight">{title}</h2>
			{items.length === 0 && !footer ? (
				<p className="text-sm text-muted-foreground">{empty}</p>
			) : (
				<ListCard>
					{items.map((item) => (
						<ListRow key={item.id}>
							<div className="flex min-h-14 items-center">
								<Link
									to="/projects/$projectId/locations/$locationId"
									params={{ projectId, locationId: item.id }}
									className={cn(
										"flex min-h-14 min-w-0 flex-1 items-center py-(--space-2) pl-(--space-4) outline-none hover:bg-muted focus-visible:shadow-[inset_0_0_0_2px_var(--ring)]",
										item.menu ? "pr-(--space-2)" : "pr-(--space-4)",
									)}
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
									{!item.menu && (
										<ChevronRight
											className="size-5 shrink-0 text-muted-foreground"
											aria-hidden="true"
										/>
									)}
								</Link>
								{item.menu && (
									<>
										{item.menu}
										<ChevronRight
											className="mr-(--space-4) ml-(--space-2) size-5 shrink-0 text-muted-foreground"
											aria-hidden="true"
										/>
									</>
								)}
							</div>
						</ListRow>
					))}
					{footer && <ListRow>{footer}</ListRow>}
				</ListCard>
			)}
		</section>
	);
}
