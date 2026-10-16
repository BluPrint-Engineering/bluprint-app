import type { LocationDetail } from "@bluprint/shared";
import { Badge } from "@/components/ui/badge";
import { RoomsCard } from "./RoomsCard";
import { changesLabel } from "./unitTypeLine";

export function UnitBody({ unit }: { unit: LocationDetail }) {
	const { unitType, changes } = unit;

	return (
		<div className="grid gap-(--space-6) md:grid-cols-[320px_minmax(0,1fr)] md:items-start md:gap-(--space-8)">
			<section className="grid content-start gap-(--space-3)">
				<h2 className="text-lg font-semibold tracking-tight">Tipologia</h2>
				<div className="grid gap-(--space-3) rounded-xl bg-card p-(--space-4) shadow-(--ring-hairline)">
					<div className="flex flex-wrap items-center gap-(--space-2)">
						<span className="text-base font-semibold">
							{unitType ? unitType.name : "Sem tipologia"}
						</span>
						{changes > 0 && (
							<Badge variant="outline">{changesLabel(changes)}</Badge>
						)}
					</div>
					<p className="text-sm text-pretty text-muted-foreground">
						{unitType
							? `Os cômodos acompanham a ${unitType.name}. O que foi mudado só nesta unidade continua assim quando a tipologia muda.`
							: "Os cômodos desta unidade são só dela."}
					</p>
				</div>
			</section>
			<RoomsCard
				rooms={unit.rooms}
				droppedRooms={unit.droppedRooms}
				unitType={unitType}
			/>
		</div>
	);
}
