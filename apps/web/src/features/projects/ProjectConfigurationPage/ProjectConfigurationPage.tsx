import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsDesktop } from "@/lib/useIsDesktop";
import { ProjectScreen } from "../components/ProjectScreen";
import { ProjectDetailsSection } from "./ProjectDetailsSection";
import { ProjectStatusSection } from "./ProjectStatusSection";
import { SectionNav } from "./SectionNav";

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

interface ProjectConfigurationPageProps {
	projectId: string;
	reservationOpen: boolean;
	onReservationOpenChange: (open: boolean) => void;
}

export function ProjectConfigurationPage({
	projectId,
	reservationOpen,
	onReservationOpenChange,
}: ProjectConfigurationPageProps) {
	const desktop = useIsDesktop();

	return (
		<ProjectScreen
			projectId={projectId}
			section="configuration"
			loading={<ConfigurationSkeleton />}
		>
			{(project) => (
				<div className="grid gap-(--space-4)">
					<h2 className="text-[1.375rem] leading-tight font-semibold tracking-tight">
						Configuração
					</h2>
					<div className="grid items-start gap-(--space-8) md:grid-cols-[200px_minmax(0,1fr)]">
						{desktop && <SectionNav />}
						<div className="grid max-w-3xl min-w-0 gap-(--space-4)">
							<ProjectDetailsSection
								project={project}
								reservationOpen={reservationOpen}
								onReservationOpenChange={onReservationOpenChange}
							/>
							<ProjectStatusSection project={project} />
						</div>
					</div>
				</div>
			)}
		</ProjectScreen>
	);
}
