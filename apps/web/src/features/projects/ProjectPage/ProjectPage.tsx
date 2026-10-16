import { Layers } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectScreen } from "../components/ProjectScreen";
import { StateBlock } from "../components/StateBlock";

function BlankProject() {
	return (
		<StateBlock
			icon={Layers}
			title="A obra ainda não tem estrutura"
			description="As pendências aparecem aqui quando a obra tiver estrutura."
		/>
	);
}

function BlankProjectSkeleton() {
	return (
		<div
			aria-hidden="true"
			className="mx-auto grid w-full max-w-(--content-max) justify-items-center gap-(--space-4) py-(--space-12) md:py-(--space-16)"
		>
			<Skeleton className="size-6 rounded-full" />
			<div className="grid justify-items-center gap-(--space-2)">
				<Skeleton className="h-5 w-60" />
				<Skeleton className="h-3.5 w-75" />
			</div>
		</div>
	);
}

export function ProjectPage({ projectId }: { projectId: string }) {
	return (
		<ProjectScreen
			projectId={projectId}
			section="home"
			loading={<BlankProjectSkeleton />}
		>
			{() => <BlankProject />}
		</ProjectScreen>
	);
}
