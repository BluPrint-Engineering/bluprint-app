import { projectSortSchema, projectSorts } from "@bluprint/shared";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
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
import { projectManagersQueryOptions, projectsTotalQueryOptions } from "../api";
import {
	ALL_MANAGERS,
	clearFilters,
	countActiveFilters,
	managerChoice,
	type ProjectsFilters,
	sameFilters,
	withManager,
} from "./filters";
import { StatusFilter } from "./StatusFilter";
import { SORT_LABELS } from "./sortLabels";

export interface ProjectsFilterSheetProps {
	/** The filters the list behind shows. */
	filters: ProjectsFilters;
	/** The caller is the organization's admin, the only one who filters by manager. */
	admin: boolean;
	onApply: (filters: ProjectsFilters) => void;
	/** Projects `filters` leave, `undefined` while the list loads. */
	total: number | undefined;
}

function filterCountText(count: number) {
	if (count === 0) return "Nenhum filtro ativo";
	return count === 1 ? "1 filtro ativo" : `${count} filtros ativos`;
}

/**
 * The phone's filters: the "Filtros" button and the bottom sheet it opens. A choice in the sheet is a
 * draft until "Ver N obras" applies it; closing the sheet any other way discards it.
 */
export function ProjectsFilterSheet({
	filters,
	admin,
	onApply,
	total,
}: ProjectsFilterSheetProps) {
	const [open, setOpen] = useState(false);
	const [chosen, setChosen] = useState(filters);
	const statusLabelId = useId();
	const sortLabelId = useId();
	const managerLabelId = useId();
	const { data: managers } = useQuery(projectManagersQueryOptions(admin));

	// the search is not the sheet's: it follows the address, so a search that lands while the sheet is open is neither reverted nor left out of the count
	const draft = { ...chosen, q: filters.q };
	const setDraft = setChosen;

	const pending = !sameFilters(draft, filters);
	const preview = useQuery({
		...projectsTotalQueryOptions(draft),
		enabled: open && pending,
		// the count on the button stays while the next choice's loads
		placeholderData: keepPreviousData,
	});
	const shown = pending ? preview.data : total;

	const activeCount = countActiveFilters(filters);
	const draftActiveCount = countActiveFilters(draft);

	return (
		<Drawer
			open={open}
			onOpenChange={(next) => {
				if (next) setDraft(filters);
				setOpen(next);
			}}
		>
			<DrawerTrigger asChild>
				<Button
					variant="outline"
					aria-label={
						activeCount > 0
							? `Filtros, ${activeCount} ${activeCount === 1 ? "ativo" : "ativos"}`
							: "Filtros"
					}
					className="gap-(--space-2) px-(--space-3)"
				>
					<SlidersHorizontal aria-hidden="true" className="size-5" />
					Filtros
					{activeCount > 0 && (
						<Badge variant="count" aria-hidden="true">
							{activeCount}
						</Badge>
					)}
				</Button>
			</DrawerTrigger>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle>Filtros</DrawerTitle>
					<DrawerDescription>
						{filterCountText(draftActiveCount)}
					</DrawerDescription>
				</DrawerHeader>
				<DrawerBody>
					{admin && (
						<div className="grid gap-(--space-1)">
							<span id={managerLabelId} className="text-sm font-medium">
								Gerente
							</span>
							<RadioGroup
								aria-labelledby={managerLabelId}
								value={managerChoice(draft)}
								onValueChange={(choice) => setDraft(withManager(draft, choice))}
								// rows bleed into the padding so their labels line up with the section title
								className="-mx-(--space-3) w-auto"
							>
								<RadioGroupItem value={ALL_MANAGERS}>
									Todos os gerentes
								</RadioGroupItem>
								{managers?.map(({ id, name }) => (
									<RadioGroupItem key={id} value={id}>
										{name}
									</RadioGroupItem>
								))}
							</RadioGroup>
						</div>
					)}
					<div className="grid gap-(--space-1)">
						<span id={statusLabelId} className="text-sm font-medium">
							Status
						</span>
						<StatusFilter
							aria-labelledby={statusLabelId}
							value={draft.status}
							onChange={(status) => setDraft({ ...draft, status })}
						/>
					</div>
					<div className="grid gap-(--space-1)">
						<span id={sortLabelId} className="text-sm font-medium">
							Ordenar
						</span>
						<RadioGroup
							aria-labelledby={sortLabelId}
							value={draft.sort}
							onValueChange={(value) =>
								setDraft({ ...draft, sort: projectSortSchema.parse(value) })
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
						disabled={draftActiveCount === 0}
						onClick={() => setDraft(clearFilters(draft))}
					>
						Limpar filtros
					</Button>
					<Button
						className="flex-1"
						onClick={() => {
							if (pending) onApply(draft);
							setOpen(false);
						}}
					>
						{shown === undefined
							? "Ver obras"
							: `Ver ${shown} ${shown === 1 ? "obra" : "obras"}`}
					</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}
