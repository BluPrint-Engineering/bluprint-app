import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { plural } from "../plural";
import {
	INCOMPLETE_RESERVE,
	type ReserveMode,
	reserveDetail,
	reserveLine,
} from "../reserveText";
import { type Plan, reserveUsed } from "./buildPlan";
import { PlanFacade } from "./PlanFacade";

export type ReserveBalance =
	| { state: "loading" }
	| { state: "unknown" }
	| { state: "ready"; reserved: number; remaining: number };

const RESERVE_BOX =
	"grid gap-(--space-1) rounded-lg bg-muted px-(--space-4) py-(--space-3) text-sm text-pretty";

export function ReserveBox({
	plan,
	balance,
	mode,
}: {
	plan: Plan;
	balance: ReserveBalance;
	mode: ReserveMode;
}) {
	if (balance.state === "loading") {
		return <Skeleton aria-hidden className="h-16 w-full rounded-lg" />;
	}
	if (balance.state === "unknown") return null;
	if (!plan.complete) {
		return (
			<p className={`${RESERVE_BOX} text-muted-foreground`}>
				{INCOMPLETE_RESERVE}
			</p>
		);
	}
	const detail = reserveDetail(plan.spend);
	return (
		<div className={RESERVE_BOX}>
			<span className="font-semibold">
				{reserveLine(
					reserveUsed(plan.spend),
					balance.reserved,
					balance.remaining,
					mode,
				)}
			</span>
			{detail && <span className="text-muted-foreground">{detail}</span>}
		</div>
	);
}

export function PreviewSummary({
	plan,
	heading,
}: {
	plan: Plan;
	heading?: string | undefined;
}) {
	const { floors, units: unitCount, commonAreas } = plan.counts;
	const towers = plan.towers.length;
	const perType = [
		...plan.typologyCounts.map(({ name, units: count }) => `${name}: ${count}`),
		...(plan.untyped > 0 ? [`Sem tipologia: ${plan.untyped}`] : []),
	];
	return (
		<div className="grid gap-(--space-1)">
			<span className="font-semibold">
				{heading ??
					[
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

export function PreviewTowers({
	plan,
	extending,
}: {
	plan: Plan;
	extending: boolean;
}) {
	const single = !extending && plan.towers.length === 1;
	return (
		<div className="grid content-start gap-(--space-4)">
			{plan.towers.map((tower) => (
				<div key={tower.key} className="grid min-w-0 gap-(--space-2)">
					<span className="text-sm font-semibold">
						{single ? "Torre única" : tower.name}
					</span>
					<PlanFacade tower={tower} />
				</div>
			))}
		</div>
	);
}
