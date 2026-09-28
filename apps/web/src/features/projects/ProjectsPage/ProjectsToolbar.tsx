import { projectSortSchema, projectSorts } from "@bluprint/shared";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
	ProjectsFilterSheet,
	type ProjectsFilterSheetProps,
} from "./ProjectsFilterSheet";
import { SORT_LABELS } from "./sortLabels";

/** Past this, the phone's sticky row draws its bottom border so the cards don't run into it. */
const STUCK_AFTER_PX = 64;

function useScrolledPast(offset: number) {
	const [past, setPast] = useState(false);
	useEffect(() => {
		const update = () => setPast(window.scrollY > offset);
		update();
		window.addEventListener("scroll", update, { passive: true });
		return () => window.removeEventListener("scroll", update);
	}, [offset]);
	return past;
}

/** The desktop's controls, inline above the grid. */
export function ProjectsToolbar({
	sort,
	onSortChange,
}: ProjectsFilterSheetProps) {
	return (
		<div className="flex flex-wrap items-center gap-(--space-3)">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="outline" size="sm" className="gap-1.5">
						<span className="text-muted-foreground">Ordenar:</span>{" "}
						{SORT_LABELS[sort]}
						<ChevronDown aria-hidden="true" className="text-muted-foreground" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start" className="w-66">
					<DropdownMenuLabel className="text-sm text-muted-foreground">
						Ordenar
					</DropdownMenuLabel>
					<DropdownMenuRadioGroup
						value={sort}
						onValueChange={(value) =>
							onSortChange(projectSortSchema.parse(value))
						}
					>
						{projectSorts.map((option) => (
							<DropdownMenuRadioItem key={option} value={option}>
								{SORT_LABELS[option]}
							</DropdownMenuRadioItem>
						))}
					</DropdownMenuRadioGroup>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}

/** The phone's controls: a row that sticks to the top as the list scrolls, its "Filtros" opening a sheet. */
export function ProjectsMobileToolbar(props: ProjectsFilterSheetProps) {
	const stuck = useScrolledPast(STUCK_AFTER_PX);

	return (
		<div
			className={cn(
				// bleeds over the page padding so the border spans the screen
				"sticky top-0 z-20 -mx-(--page-pad) flex gap-(--space-2) border-b bg-background px-(--page-pad) py-(--space-2) transition-colors duration-(--duration) ease-standard",
				stuck ? "border-border" : "border-transparent",
			)}
		>
			<ProjectsFilterSheet {...props} />
		</div>
	);
}
