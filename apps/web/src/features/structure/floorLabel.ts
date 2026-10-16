export function floorLabel(name: string): string {
	return name.replace(/\s+andar$/i, "");
}

export function isNumberedFloor(label: string): boolean {
	return /^\d+º$/.test(label);
}

function numberOf(name: string): number | undefined {
	const label = floorLabel(name);
	return isNumberedFloor(label) ? Number.parseInt(label, 10) : undefined;
}

/** `["Térreo", "1º andar", "2º andar", "3º andar", "Cobertura"]` reads "Térreo, 1º ao 3º e Cobertura". */
export function floorSummary(names: string[]): string {
	const parts: string[] = [];
	let run: number[] = [];

	const flushRun = () => {
		const [first] = run;
		const last = run.at(-1);
		if (first === undefined || last === undefined) return;
		parts.push(first === last ? `${first}º` : `${first}º ao ${last}º`);
		run = [];
	};

	for (const name of names) {
		const number = numberOf(name);
		if (number === undefined) {
			flushRun();
			parts.push(name);
			continue;
		}
		const last = run.at(-1);
		if (last !== undefined && number !== last + 1) flushRun();
		run.push(number);
	}
	flushRun();

	const last = parts.at(-1);
	if (last === undefined) return "nenhum";
	if (parts.length === 1) return last;
	return `${parts.slice(0, -1).join(", ")} e ${last}`;
}
