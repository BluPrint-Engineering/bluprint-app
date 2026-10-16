import type { StructureTower } from "@bluprint/shared";
import { Link } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { floorLabel, isNumberedFloor } from "../floorLabel";

const SKELETON_ROWS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const CHIP =
	"flex min-h-(--tap-min) min-w-0 items-center justify-center rounded-md px-(--space-2) text-sm outline-none focus-visible:shadow-(--shadow-focus)";

export function Facade({
	projectId,
	tower,
	label,
}: {
	projectId: string;
	tower: StructureTower;
	label: string;
}) {
	const floors = [...tower.floors].reverse();
	const widest = Math.max(1, ...floors.map((floor) => floor.units.length));

	return (
		<ul
			aria-label={label}
			style={{ "--units": widest } as React.CSSProperties}
			className="grid gap-1.5 md:max-w-[calc(88px+var(--units)*138px+126px)]"
		>
			{floors.map((floor) => {
				const short = floorLabel(floor.name);
				const areas = floor.commonAreas.map((area) => (
					<Link
						key={area.id}
						to="/projects/$projectId/locations/$locationId"
						params={{ projectId, locationId: area.id }}
						title={area.name}
						className={cn(
							CHIP,
							"justify-start bg-muted text-xs text-muted-foreground hover:bg-secondary hover:text-foreground",
						)}
					>
						<span className="truncate">{area.name}</span>
					</Link>
				));

				return (
					<li
						key={floor.id}
						className="grid grid-cols-[52px_repeat(var(--units),minmax(0,1fr))_64px] items-start gap-x-1.5 md:grid-cols-[88px_repeat(var(--units),minmax(0,132px))_120px]"
					>
						<Link
							to="/projects/$projectId/locations/$locationId"
							params={{ projectId, locationId: floor.id }}
							aria-label={floor.name}
							className={cn(
								CHIP,
								"justify-start font-semibold text-muted-foreground hover:bg-muted hover:text-foreground",
								isNumberedFloor(short) && "font-mono",
							)}
						>
							<span className="truncate">{short}</span>
						</Link>
						{floor.units.map((unit) => (
							<Link
								key={unit.id}
								to="/projects/$projectId/locations/$locationId"
								params={{ projectId, locationId: unit.id }}
								aria-label={`Unidade ${unit.name}`}
								className={cn(
									CHIP,
									"border border-input bg-card font-mono font-medium hover:bg-muted",
								)}
							>
								<span className="truncate">{unit.name}</span>
							</Link>
						))}
						{areas.length > 0 &&
							(floor.units.length > 0 ? (
								<div className="col-start-[calc(var(--units)+2)] grid min-w-0 gap-1">
									{areas}
								</div>
							) : (
								<div className="col-[2/-1] flex min-w-0 gap-1 *:flex-1">
									{areas}
								</div>
							))}
					</li>
				);
			})}
		</ul>
	);
}

export function FacadeCard({ children }: { children: React.ReactNode }) {
	return (
		<div className="rounded-xl bg-card p-(--space-3) shadow-(--ring-hairline) md:p-(--space-5)">
			{children}
		</div>
	);
}

export function FacadeSkeleton() {
	return (
		<div
			role="status"
			aria-label="Carregando estrutura"
			aria-busy="true"
			className="grid gap-1.5 rounded-xl bg-card p-(--space-3) shadow-(--ring-hairline) md:p-(--space-5)"
		>
			{SKELETON_ROWS.map((row) => (
				<div key={row} className="flex items-center gap-(--space-3)">
					<Skeleton className="h-5 w-9 shrink-0" />
					<Skeleton className="h-11 flex-1" />
				</div>
			))}
		</div>
	);
}
