function foldForSearch(text: string): string {
	return text
		.normalize("NFD")
		.replace(/\p{M}/gu, "")
		.toLowerCase()
		.replace(/\s+/g, " ")
		.trim();
}

export function matchesSearch(text: string, search: string): boolean {
	return foldForSearch(text).includes(foldForSearch(search));
}
