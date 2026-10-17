import { plural } from "../components/plural";

export interface ReservationFigures {
	used: number;
	reserved: number;
	free: number | undefined;
}

export function parseUnits(typed: string) {
	return typed === "" ? undefined : Number(typed);
}

export function remainingIn(
	{ used }: ReservationFigures,
	units: number | undefined,
) {
	return units !== undefined && units >= used ? units - used : undefined;
}

export function freeAfter(
	{ reserved, free }: ReservationFigures,
	units: number | undefined,
) {
	if (units === undefined || free === undefined) return undefined;
	return units <= reserved + free ? reserved + free - units : undefined;
}

export function belowUsedMessage(used: number) {
	return `A obra já usa ${used} ${plural(used, "unidade", "unidades")}. A reserva não pode ficar abaixo disso.`;
}

export function aboveFreeMessage(free: number) {
	if (free === 0) return "Não há unidades livres.";
	return `Só ${plural(free, "há 1 unidade livre", `há ${free} unidades livres`)}.`;
}

export function reservationError(
	figures: ReservationFigures,
	units: number | undefined,
) {
	if (units === undefined) return undefined;
	if (units < figures.used) return belowUsedMessage(figures.used);
	if (figures.free !== undefined && units > figures.reserved + figures.free) {
		return aboveFreeMessage(figures.free);
	}
	return undefined;
}
