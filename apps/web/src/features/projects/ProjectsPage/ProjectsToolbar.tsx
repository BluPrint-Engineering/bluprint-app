import { projectSortSchema, projectSorts } from "@bluprint/shared";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, X } from "lucide-react";
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
import { projectManagersQueryOptions } from "../api";
import {
	ALL_MANAGERS,
	clearAllFilters,
	isNarrowed,
	managerChoice,
	type ProjectsFilters,
	withManager,
} from "./filters";
import { ProjectSearch } from "./ProjectSearch";
import { ProjectsFilterSheet } from "./ProjectsFilterSheet";
import { StatusFilter } from "./StatusFilter";
import { SORT_LABELS } from "./sortLabels";

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

export interface ProjectsToolbarProps {
	filters: ProjectsFilters;
	admin: boolean;
	onFiltersChange: (filters: ProjectsFilters) => void;
	total: number | undefined;
}

export function ProjectsToolbar({
	filters,
	admin,
	onFiltersChange,
}: ProjectsToolbarProps) {
	const { sort, status } = filters;
	const { data: managers } = useQuery(projectManagersQueryOptions(admin));
	const manager = managers?.find(({ id }) => id === filters.manager);
	return (
		<div className="flex flex-wrap items-center gap-(--space-3)">
			<ProjectSearch
				size="sm"
				value={filters.q}
				onChange={(q) => onFiltersChange({ ...filters, q })}
				className="w-65"
			/>
			<StatusFilter
				size="sm"
				aria-label="Status"
				value={status}
				onChange={(next) => onFiltersChange({ ...filters, status: next })}
			/>
			{admin && (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" size="sm" className="gap-1.5">
							<span className="text-muted-foreground">Gerente:</span>{" "}
							{filters.manager
								? (manager?.name ?? (managers ? "Desconhecido" : "…"))
								: "Todos"}
							<ChevronDown
								aria-hidden="true"
								className="text-muted-foreground"
							/>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-66">
						<DropdownMenuLabel className="text-sm text-muted-foreground">
							Gerente
						</DropdownMenuLabel>
						<DropdownMenuRadioGroup
							value={managerChoice(filters)}
							onValueChange={(choice) =>
								onFiltersChange(withManager(filters, choice))
							}
						>
							<DropdownMenuRadioItem value={ALL_MANAGERS}>
								Todos os gerentes
							</DropdownMenuRadioItem>
							{managers?.map(({ id, name }) => (
								<DropdownMenuRadioItem key={id} value={id}>
									{name}
								</DropdownMenuRadioItem>
							))}
						</DropdownMenuRadioGroup>
					</DropdownMenuContent>
				</DropdownMenu>
			)}
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
							onFiltersChange({
								...filters,
								sort: projectSortSchema.parse(value),
							})
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
			{isNarrowed(filters) && (
				<Button
					variant="ghost"
					size="sm"
					onClick={() => onFiltersChange(clearAllFilters(filters))}
				>
					<X aria-hidden="true" className="size-4" />
					Limpar filtros
				</Button>
			)}
		</div>
	);
}

export function ProjectsMobileToolbar({
	filters,
	admin,
	onFiltersChange,
	total,
}: ProjectsToolbarProps) {
	const stuck = useScrolledPast(STUCK_AFTER_PX);

	return (
		<div
			className={cn(
				"sticky top-0 z-20 -mx-(--page-pad) flex gap-(--space-2) border-b bg-background px-(--page-pad) py-(--space-2) transition-colors duration-(--duration) ease-standard",
				stuck ? "border-border" : "border-transparent",
			)}
		>
			<ProjectSearch
				size="md"
				value={filters.q}
				onChange={(q) => onFiltersChange({ ...filters, q })}
				className="flex-1"
			/>
			<ProjectsFilterSheet
				filters={filters}
				admin={admin}
				onApply={onFiltersChange}
				total={total}
			/>
		</div>
	);
}
