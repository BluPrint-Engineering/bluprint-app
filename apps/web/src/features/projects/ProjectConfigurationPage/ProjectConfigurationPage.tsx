import { useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsDesktop } from "@/lib/useIsDesktop";
import { StructureSection, TypologiesSection } from "../../structure";
import { ProjectScreen } from "../components/ProjectScreen";
import { ProjectDetailsSection } from "./ProjectDetailsSection";
import { ProjectStatusSection } from "./ProjectStatusSection";
import { SectionNav } from "./SectionNav";

// WebKit scrolls a hash only while the target is already in the first document.
function HashTarget() {
	const hash = useRouterState({ select: (state) => state.location.hash });

	useEffect(() => {
		const target = hash ? document.getElementById(hash) : null;
		const scope = target?.parentElement;
		if (!target || !scope) return;

		let frame = 0;
		const align = () => {
			target.scrollIntoView({ block: "start" });
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() =>
				target.scrollIntoView({ block: "start" }),
			);
		};
		const observer = new ResizeObserver(align);
		align();
		observer.observe(scope);
		const userIntentEvents = [
			"pointerdown",
			"keydown",
			"wheel",
			"touchmove",
		] as const;
		const stop = () => {
			cancelAnimationFrame(frame);
			observer.disconnect();
			for (const event of userIntentEvents) {
				window.removeEventListener(event, stop);
			}
		};
		for (const event of userIntentEvents) {
			window.addEventListener(event, stop, { passive: true });
		}
		return stop;
	}, [hash]);

	return null;
}

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
							<HashTarget />
							<ProjectDetailsSection
								project={project}
								reservationOpen={reservationOpen}
								onReservationOpenChange={onReservationOpenChange}
							/>
							<ProjectStatusSection project={project} />
							<StructureSection project={project} />
							<TypologiesSection project={project} />
						</div>
					</div>
				</div>
			)}
		</ProjectScreen>
	);
}
