import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectScreen } from "../components/ProjectScreen";
import { ProjectDetailsSection } from "./ProjectDetailsSection";

function ConfigurationSkeleton() {
	return (
		<div aria-hidden="true" className="grid max-w-3xl gap-(--space-4)">
			<Skeleton className="h-7 w-40" />
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-36" />
				</CardHeader>
				<CardContent className="grid gap-0.5">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-6 w-60" />
				</CardContent>
			</Card>
		</div>
	);
}

export function ProjectConfigurationPage({ projectId }: { projectId: string }) {
	return (
		<ProjectScreen
			projectId={projectId}
			section="configuration"
			loading={<ConfigurationSkeleton />}
		>
			{(project) => (
				<div className="grid max-w-3xl gap-(--space-4)">
					<h2 className="text-[1.375rem] leading-tight font-semibold tracking-tight">
						Configuração
					</h2>
					<ProjectDetailsSection project={project} />
				</div>
			)}
		</ProjectScreen>
	);
}
