import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { signedUnits, type UnitsTotals } from "./reservationDrafts";

function Figure({
	label,
	value,
	was,
	negative = false,
}: {
	label: string;
	value: string | undefined;
	was: string | undefined;
	negative?: boolean;
}) {
	return (
		<Card
			size="sm"
			className="gap-0 md:data-[size=sm]:[--card-spacing:--spacing(4)]"
		>
			<CardContent className="grid gap-(--space-1) px-3 md:px-4">
				<span className="text-sm text-muted-foreground">{label}</span>
				{value === undefined ? (
					<Skeleton className="h-7 w-14 md:h-8 md:w-20" />
				) : (
					<span
						className={cn(
							"font-mono text-xl leading-7 font-semibold tabular-nums md:text-2xl md:leading-8",
							negative && "text-destructive",
						)}
					>
						{value}
					</span>
				)}
				<span className="h-4 text-xs leading-4 text-muted-foreground tabular-nums">
					{was !== undefined && `Antes: ${was}`}
				</span>
			</CardContent>
		</Card>
	);
}

export function UnitFigures({
	contracted,
	totals,
}: {
	contracted: number | undefined;
	totals: UnitsTotals | undefined;
}) {
	return (
		<section
			aria-label="Unidades da construtora"
			aria-live="polite"
			className="grid grid-cols-3 gap-(--space-2) md:gap-(--space-3)"
		>
			<Figure
				label="Contratadas"
				value={contracted?.toLocaleString("pt-BR")}
				was={undefined}
			/>
			<Figure
				label="Reservadas"
				value={totals?.reserved.toLocaleString("pt-BR")}
				was={
					totals && totals.reserved !== totals.savedReserved
						? totals.savedReserved.toLocaleString("pt-BR")
						: undefined
				}
			/>
			<Figure
				label="Livres"
				value={totals && signedUnits(totals.free)}
				was={
					totals && totals.free !== totals.savedFree
						? signedUnits(totals.savedFree)
						: undefined
				}
				negative={totals !== undefined && totals.free < 0}
			/>
		</section>
	);
}
