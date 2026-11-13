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

function sectionIdFromHash(hash: string) {
	const raw = hash.startsWith("#") ? hash.slice(1) : hash;
	if (raw === "") return "";
	try {
		return decodeURIComponent(raw);
	} catch {
		return "";
	}
}

// WebKit scrolls a hash only while the target is already in the first document, and sections above it still grow after this page renders.
function HashTarget() {
	const hash = useRouterState({ select: (state) => state.location.hash });

	useEffect(() => {
		const id = sectionIdFromHash(hash);
		const target = id === "" ? null : document.getElementById(id);
		const scope = target?.parentElement;
		if (!target || !scope) return;

		let quiet = 0;
		let frame = 0;
		const align = () => {
			target.scrollIntoView({ block: "start" });
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() =>
				target.scrollIntoView({ block: "start" }),
			);
			window.clearTimeout(quiet);
			quiet = window.setTimeout(() => observer.disconnect(), 1500);
		};
		const observer = new ResizeObserver(align);
		align();
		observer.observe(scope);
		const stop = () => {
			cancelAnimationFrame(frame);
			window.clearTimeout(quiet);
			observer.disconnect();
		};
		window.addEventListener("pointerdown", stop, { once: true });
		window.addEventListener("keydown", stop, { once: true });
		return () => {
			stop();
			window.removeEventListener("pointerdown", stop);
			window.removeEventListener("keydown", stop);
		};
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
