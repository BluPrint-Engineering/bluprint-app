import { cn } from "@/lib/utils";
import { GROUND_FLOOR, type PlanTower } from "./buildPlan";

const BLOCK =
	"grid h-[34px] min-w-0 place-items-center overflow-hidden rounded-lg px-1 md:h-[22px] md:rounded-[4px] md:px-0.5";

export function PlanFacade({ tower }: { tower: PlanTower }) {
	if (!tower.valid) {
		return (
			<p className="text-sm text-destructive">
				Confira os andares desta torre.
			</p>
		);
	}

	const floors = [...tower.floors].reverse();
	const widest = Math.max(1, ...floors.map((floor) => floor.units.length));

	return (
		<div className="min-w-0 overflow-x-auto overscroll-x-contain md:overflow-visible">
			<ul
				aria-label={`Fachada da ${tower.name}`}
				style={{ "--units": widest } as React.CSSProperties}
				className="grid min-w-[calc(44px+var(--units)*52px+72px)] gap-1 md:min-w-0 md:gap-[3px]"
			>
				{floors.map((floor) => (
					<li
						key={floor.label}
						className="grid grid-cols-[44px_repeat(var(--units),minmax(48px,1fr))_72px] items-start gap-1 md:grid-cols-[40px_repeat(var(--units),minmax(0,1fr))_48px] md:gap-[3px]"
					>
						<span
							className={cn(
								"sticky left-0 z-10 bg-background text-[13px] leading-[34px] whitespace-nowrap text-muted-foreground md:static md:bg-transparent md:text-[10px] md:leading-[22px]",
								floor.label !== GROUND_FLOOR && "font-mono",
							)}
						>
							{floor.label}
						</span>
						{floor.units.map((unit) => (
							<span
								key={unit.name}
								title={unit.unitType ?? "Sem tipologia"}
								className={cn(
									BLOCK,
									"border border-input font-mono text-[13px] font-medium md:text-[10px] md:font-normal",
								)}
							>
								{unit.name}
							</span>
						))}
						{floor.units.length > 0 ? (
							<span className="col-start-[calc(var(--units)+2)] grid min-w-0 gap-1 md:gap-[3px]">
								{floor.areas.map((area) => (
									<AreaTag key={area.key}>{area.name}</AreaTag>
								))}
							</span>
						) : (
							<span className="col-[2/-1] flex min-w-0 gap-1 md:gap-[3px]">
								{floor.areas.map((area) => (
									<AreaTag key={area.key} grow>
										{area.name}
									</AreaTag>
								))}
							</span>
						)}
					</li>
				))}
			</ul>
		</div>
	);
}

function AreaTag({ children, grow }: { children: string; grow?: boolean }) {
	return (
		<span
			title={children}
			className={cn(
				BLOCK,
				"truncate bg-muted text-xs text-muted-foreground md:text-[10px]",
				grow && "flex-1",
			)}
		>
			{children}
		</span>
	);
}
