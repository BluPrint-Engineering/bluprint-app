import { ProjectStructure, STRUCTURE_LOCKED } from "../../structure";
import { FacadeSkeleton } from "../../structure/components/Facade";
import { ProjectScreen } from "../components/ProjectScreen";

export function ProjectPage({ projectId }: { projectId: string }) {
	return (
		<ProjectScreen
			projectId={projectId}
			section="home"
			loading={<FacadeSkeleton />}
			lockLine={(project) =>
				project.status === "delivered" ? STRUCTURE_LOCKED : undefined
			}
		>
			{(project) => <ProjectStructure project={project} />}
		</ProjectScreen>
	);
}
