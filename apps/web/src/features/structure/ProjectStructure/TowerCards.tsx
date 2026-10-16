import type { StructureTower } from "@bluprint/shared";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { towerFacts } from "./towerFacts";

export function TowerCards({
	projectId,
	towers,
}: {
	projectId: string;
	towers: StructureTower[];
}) {
	return (
		<ul className="grid grid-cols-1 gap-(--space-3) md:grid-cols-3">
			{towers.map((tower) => (
				<li key={tower.id} className="grid min-w-0">
					<Link
						to="/projects/$projectId/locations/$locationId"
						params={{ projectId, locationId: tower.id }}
						className="grid content-start gap-(--space-4) rounded-xl bg-card p-(--space-5) text-left shadow-(--ring-hairline) outline-none transition-shadow hover:shadow-[var(--ring-hairline),var(--shadow-sm)] focus-visible:shadow-(--shadow-focus)"
					>
						<span className="flex items-start justify-between gap-(--space-3)">
							<span className="text-lg font-semibold [overflow-wrap:anywhere]">
								{tower.name}
							</span>
							<ChevronRight
								className="size-5 shrink-0 text-muted-foreground"
								aria-hidden="true"
							/>
						</span>
						<dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-(--space-4) gap-y-(--space-2) rounded-lg bg-muted px-(--space-4) py-(--space-3) text-sm">
							{towerFacts(tower).map(([term, value]) => (
								<div key={term} className="contents">
									<dt className="text-muted-foreground">{term}</dt>
									<dd className="m-0 [overflow-wrap:anywhere]">{value}</dd>
								</div>
							))}
						</dl>
					</Link>
				</li>
			))}
		</ul>
	);
}
