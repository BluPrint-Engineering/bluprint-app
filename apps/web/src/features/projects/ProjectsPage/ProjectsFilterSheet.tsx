import {
	type ProjectSort,
	projectSortSchema,
	projectSorts,
} from "@bluprint/shared";
import { SlidersHorizontal } from "lucide-react";
import { useId, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Drawer,
	DrawerBody,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SORT_LABELS } from "./sortLabels";

export interface ProjectsFilterSheetProps {
	sort: ProjectSort;
	onSortChange: (sort: ProjectSort) => void;
	/** Controls that hide projects; the sort only reorders them and never counts. */
	activeFilterCount: number;
	onClearFilters: () => void;
	/** Projects the current filters leave, `undefined` while the list loads. */
	total: number | undefined;
}

/** The phone's filters: the "Filtros" button and the bottom sheet it opens. Changes apply at once. */
export function ProjectsFilterSheet({
	sort,
	onSortChange,
	activeFilterCount,
	onClearFilters,
	total,
}: ProjectsFilterSheetProps) {
	const [open, setOpen] = useState(false);
	const sortLabelId = useId();

	return (
		<Drawer open={open} onOpenChange={setOpen}>
			<DrawerTrigger asChild>
				<Button
					variant="outline"
					aria-label={
						activeFilterCount > 0
							? `Filtros, ${activeFilterCount} ${activeFilterCount === 1 ? "ativo" : "ativos"}`
							: "Filtros"
					}
					className="gap-(--space-2) px-(--space-3)"
				>
					<SlidersHorizontal aria-hidden="true" className="size-5" />
					Filtros
					{activeFilterCount > 0 && (
						<Badge variant="count" aria-hidden="true">
							{activeFilterCount}
						</Badge>
					)}
				</Button>
			</DrawerTrigger>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle>Filtros</DrawerTitle>
					<DrawerDescription>
						{activeFilterCount === 0
							? "Nenhum filtro ativo"
							: `${activeFilterCount} ${activeFilterCount === 1 ? "filtro ativo" : "filtros ativos"}`}
					</DrawerDescription>
				</DrawerHeader>
				<DrawerBody>
					<div className="grid gap-(--space-1)">
						<span id={sortLabelId} className="text-sm font-medium">
							Ordenar
						</span>
						<RadioGroup
							aria-labelledby={sortLabelId}
							value={sort}
							onValueChange={(value) =>
								onSortChange(projectSortSchema.parse(value))
							}
							// rows bleed into the padding so their labels line up with the section title
							className="-mx-(--space-3) w-auto"
						>
							{projectSorts.map((option) => (
								<RadioGroupItem key={option} value={option}>
									{SORT_LABELS[option]}
								</RadioGroupItem>
							))}
						</RadioGroup>
					</div>
				</DrawerBody>
				<DrawerFooter>
					<Button
						variant="outline"
						disabled={activeFilterCount === 0}
						onClick={onClearFilters}
					>
						Limpar filtros
					</Button>
					<Button className="flex-1" onClick={() => setOpen(false)}>
						{total === undefined
							? "Ver obras"
							: `Ver ${total} ${total === 1 ? "obra" : "obras"}`}
					</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}
