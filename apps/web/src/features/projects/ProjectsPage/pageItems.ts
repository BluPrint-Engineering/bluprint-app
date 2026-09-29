export type PageItem = number | "gap-start" | "gap-end";

export function pageItems(page: number, pageCount: number): PageItem[] {
	if (pageCount <= 7) {
		return Array.from({ length: pageCount }, (_, i) => i + 1);
	}

	let from = Math.max(2, page - 1);
	let to = Math.min(pageCount - 1, page + 1);
	if (page <= 3) [from, to] = [2, 5];
	if (page >= pageCount - 2) [from, to] = [pageCount - 4, pageCount - 1];

	const items: PageItem[] = [1];
	if (from > 2) items.push("gap-start");
	for (let p = from; p <= to; p++) items.push(p);
	if (to < pageCount - 1) items.push("gap-end");
	items.push(pageCount);
	return items;
}
