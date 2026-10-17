import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { plural } from "../plural";
import type { Plan } from "./buildPlan";
import { PlanFacade } from "./PlanFacade";

export type UnitsLine =
	| { state: "loading" }
	| { state: "unknown" }
	| { state: "ready"; text: string };

export function PreviewSummary({
	plan,
	units,
}: {
	plan: Plan;
	units: UnitsLine;
}) {
	const { floors, units: unitCount, commonAreas } = plan.counts;
	const towers = plan.towers.length;
	const perType = [
		...plan.unitTypeCounts.map(({ name, units: count }) => `${name}: ${count}`),
		...(plan.untyped > 0 ? [`Sem tipologia: ${plan.untyped}`] : []),
	];
	return (
		<div className="grid gap-(--space-1)">
			<span className="font-semibold">
				{[
					plural(towers, "torre", "torres"),
					plural(floors, "andar", "andares"),
					plural(unitCount, "unidade", "unidades"),
				].join(" · ")}
			</span>
			<span className="text-sm text-muted-foreground">
				{[plural(commonAreas, "área comum", "áreas comuns"), ...perType].join(
					" · ",
				)}
			</span>
			{units.state === "loading" && (
				<Skeleton aria-hidden className="mt-(--space-1) h-3.5 w-4/5" />
			)}
			{units.state === "ready" && (
				<span className="mt-(--space-1) text-sm text-pretty">{units.text}</span>
			)}
		</div>
	);
}

export function UntypedAlert({ plan }: { plan: Plan }) {
	if (plan.untyped === 0) return null;
	return (
		<Alert>
			<AlertDescription>
				{plural(plan.untyped, "unidade fica", "unidades ficam")} sem tipologia.
				Os cômodos delas se cadastram em cada uma.
			</AlertDescription>
		</Alert>
	);
}

export function PreviewTowers({ plan }: { plan: Plan }) {
	return (
		<div className="grid content-start gap-(--space-4)">
			{plan.towers.map((tower) => (
				<div key={tower.key} className="grid min-w-0 gap-(--space-2)">
					<span className="text-sm font-semibold">{tower.name}</span>
					<PlanFacade tower={tower} />
				</div>
			))}
		</div>
	);
}
