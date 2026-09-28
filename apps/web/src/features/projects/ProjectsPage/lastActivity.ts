const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** `now` is epoch milliseconds; a `lastActivityAt` ahead of it (clock skew) reads as just now. */
export function formatLastActivity(
	lastActivityAt: string,
	now: number,
): string {
	const elapsed = Math.max(0, now - Date.parse(lastActivityAt));

	if (elapsed < MINUTE) return "Atividade agora";
	if (elapsed < HOUR) return `Atividade há ${Math.floor(elapsed / MINUTE)} min`;
	if (elapsed < DAY) return `Atividade há ${Math.floor(elapsed / HOUR)} h`;

	const days = Math.floor(elapsed / DAY);
	return `Atividade há ${days} ${days === 1 ? "dia" : "dias"}`;
}
