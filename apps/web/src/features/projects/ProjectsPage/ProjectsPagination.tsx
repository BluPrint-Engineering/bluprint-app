import { PROJECT_PAGE_SIZE } from "@bluprint/shared";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";
import { Spinner } from "@/components/ui/spinner";
import { pageItems } from "./pageItems";

interface ProjectsPaginationProps {
	/** The page on screen. */
	page: number;
	/** The page being fetched; every control locks until it lands. */
	loadingPage: number | undefined;
	total: number;
	onPageChange: (page: number) => void;
}

/** Desktop only: on the phone the list shows its first page. */
export function ProjectsPagination({
	page,
	loadingPage,
	total,
	onPageChange,
}: ProjectsPaginationProps) {
	const pageCount = Math.ceil(total / PROJECT_PAGE_SIZE);
	const busy = loadingPage !== undefined;
	const current = loadingPage ?? page;
	const first = (page - 1) * PROJECT_PAGE_SIZE + 1;
	const last = Math.min(page * PROJECT_PAGE_SIZE, total);

	return (
		<div className="hidden flex-wrap items-center justify-between gap-(--space-4) pt-(--space-2) md:flex">
			<span className="text-sm text-muted-foreground tabular-nums">
				Mostrando {first}–{last} de {total}
			</span>
			{pageCount > 1 && (
				<Pagination aria-label="Páginas de obras">
					<PaginationContent>
						<PaginationItem>
							<PaginationPrevious
								disabled={busy || page <= 1}
								onClick={() => onPageChange(page - 1)}
							/>
						</PaginationItem>
						{pageItems(current, pageCount).map((item) =>
							typeof item === "number" ? (
								<PaginationItem key={item}>
									<PaginationLink
										isActive={item === current}
										aria-label={`Página ${item}`}
										aria-busy={item === loadingPage || undefined}
										disabled={busy}
										onClick={() => item !== page && onPageChange(item)}
									>
										{item === loadingPage ? (
											<Spinner className="size-3.5" aria-hidden="true" />
										) : (
											item
										)}
									</PaginationLink>
								</PaginationItem>
							) : (
								<PaginationItem key={item}>
									<PaginationEllipsis />
								</PaginationItem>
							),
						)}
						<PaginationItem>
							<PaginationNext
								disabled={busy || page >= pageCount}
								onClick={() => onPageChange(page + 1)}
							/>
						</PaginationItem>
					</PaginationContent>
				</Pagination>
			)}
		</div>
	);
}
