import type { OrganizationReservations } from "@bluprint/shared";
import { plural } from "../../projects/components/plural";

export const RESERVATION_MAX_DIGITS = 5;

export const EMPTY_RESERVATION = "Informe quantas unidades reservar.";

export type Drafts = Readonly<Record<string, string>>;
export type Touched = Readonly<Record<string, true>>;

export interface ReservationRowView {
	projectId: string;
	name: string;
	used: number;
	saved: number;
	typed: string;
	value: number | undefined;
	changed: boolean;
	remaining: number | undefined;
	problem: string | undefined;
}

export interface UnitsTotals {
	reserved: number;
	free: number;
	savedReserved: number;
	savedFree: number;
}

export function digitsOnly(typed: string) {
	return typed.replace(/\D/g, "").slice(0, RESERVATION_MAX_DIGITS);
}

export function belowUsedMessage(used: number) {
	return `A obra já usa ${used.toLocaleString("pt-BR")} ${plural(used, "unidade", "unidades")}. A reserva não pode ficar abaixo disso.`;
}

export function overContractedMessage(excess: number) {
	return `As reservas passam das unidades contratadas em ${excess.toLocaleString("pt-BR")}. Baixe alguma reserva ou fale com a BluPrint.`;
}

export function deliveredLine(projects: number, used: number) {
	const units = used.toLocaleString("pt-BR");
	return `${projects} ${plural(projects, "obra entregue usou", "obras entregues usaram")} ${units} ${plural(used, "unidade", "unidades")}.`;
}

export function reservationRows(
	items: OrganizationReservations["items"],
	drafts: Drafts,
): ReservationRowView[] {
	return items.map(({ projectId, name, reserved, used }) => {
		const typed = drafts[projectId] ?? String(reserved);
		const value = typed === "" ? undefined : Number(typed);
		return {
			projectId,
			name,
			used,
			saved: reserved,
			typed,
			value,
			changed: value !== reserved,
			remaining: value === undefined ? undefined : value - used,
			problem:
				value === undefined
					? EMPTY_RESERVATION
					: value < used
						? belowUsedMessage(used)
						: undefined,
		};
	});
}

export function unitsTotals(
	rows: ReservationRowView[],
	deliveredUsed: number,
	contracted: number,
): UnitsTotals {
	const reserved =
		rows.reduce((sum, row) => sum + (row.value ?? 0), 0) + deliveredUsed;
	const savedReserved =
		rows.reduce((sum, row) => sum + row.saved, 0) + deliveredUsed;
	return {
		reserved,
		free: contracted - reserved,
		savedReserved,
		savedFree: contracted - savedReserved,
	};
}

export function signedUnits(count: number) {
	return `${count < 0 ? "−" : ""}${Math.abs(count).toLocaleString("pt-BR")}`;
}

export function changedLine(count: number) {
	return `${count} ${plural(count, "reserva alterada", "reservas alteradas")}`;
}
