import type { ProjectSummary, Structure } from "@bluprint/shared";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronRight, ListPlus } from "lucide-react";
import { LockNote } from "@/components/LockNote";
import { Button } from "@/components/ui/button";
import { firstLoadState } from "@/lib/firstLoadState";
import { isBlankStructure, structureQueryOptions } from "../api";
import { STRUCTURE_LOCKED } from "../lockedText";
import { plural } from "../plural";
import { SectionCard, SectionNote } from "./SectionCard";
import { SectionFailure, SectionSkeleton } from "./SectionLoad";
import { STRUCTURE_SECTION_ID } from "./sectionIds";

function countLine({ counts }: Structure) {
	return [
		plural(counts.towers, "torre", "torres"),
		plural(counts.floors, "andar", "andares"),
		plural(counts.units, "unidade", "unidades"),
		plural(counts.commonAreas, "área comum", "áreas comuns"),
	].join(" · ");
}

export function StructureSection({ project }: { project: ProjectSummary }) {
	const query = useQuery(structureQueryOptions(project.id));
	const delivered = project.status === "delivered";

	return (
		<SectionCard id={STRUCTURE_SECTION_ID} title="Estrutura">
			{query.data ? (
				isBlankStructure(query.data) ? (
					<>
						<SectionNote>A obra ainda não tem estrutura.</SectionNote>
						{delivered ? (
							<LockNote>{STRUCTURE_LOCKED}</LockNote>
						) : (
							<Button
								asChild
								size="lg"
								className="justify-self-start max-md:w-full"
							>
								<Link
									to="/projects/$projectId/structure/new"
									params={{ projectId: project.id }}
								>
									<ListPlus className="size-5" aria-hidden />
									Montar estrutura
								</Link>
							</Button>
						)}
					</>
				) : (
					<>
						<span className="text-base font-medium">
							{countLine(query.data)}
						</span>
						<div className="flex flex-wrap gap-(--space-2)">
							<Button asChild variant="outline" className="max-md:flex-1">
								<Link
									to="/projects/$projectId"
									params={{ projectId: project.id }}
								>
									Abrir estrutura
									<ChevronRight className="size-4.5" aria-hidden />
								</Link>
							</Button>
						</div>
						{delivered ? (
							<LockNote>{STRUCTURE_LOCKED}</LockNote>
						) : (
							<SectionNote>
								A estrutura se edita onde se navega: torre, andar e unidade têm
								“Adicionar” e um menu em cada item.
							</SectionNote>
						)}
					</>
				)
			) : (
				<StructureLoad query={query} />
			)}
		</SectionCard>
	);
}

function StructureLoad({
	query,
}: {
	query: Parameters<typeof firstLoadState>[0];
}) {
	const state = firstLoadState(query);
	return state === "loading" ? (
		<SectionSkeleton label="Carregando estrutura" />
	) : (
		<SectionFailure
			state={state}
			what="a estrutura"
			onRetry={() => query.refetch()}
		/>
	);
}
