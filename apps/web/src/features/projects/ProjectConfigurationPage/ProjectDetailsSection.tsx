import type { ProjectSummary } from "@bluprint/shared";
import { Lock, Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RenameProjectForm } from "./RenameProjectForm";

function lockNote(project: ProjectSummary) {
	if (project.status === "delivered") {
		return "A obra foi entregue: o nome não pode mais ser alterado.";
	}
	if (project.role === "assistant") {
		return "Só o gerente de obra ou o admin da construtora renomeia a obra.";
	}
	return null;
}

export function ProjectDetailsSection({
	project,
}: {
	project: ProjectSummary;
}) {
	const note = lockNote(project);
	const [editing, setEditing] = useState(false);
	const renameButton = useRef<HTMLButtonElement>(null);
	const returnFocus = useRef(false);

	useEffect(() => {
		if (!editing && returnFocus.current) {
			returnFocus.current = false;
			renameButton.current?.focus();
		}
	}, [editing]);

	return (
		<section aria-label="Dados da obra">
			<Card>
				<CardHeader>
					<CardTitle
						role="heading"
						aria-level={3}
						className="text-lg font-semibold tracking-tight"
					>
						Dados da obra
					</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-(--space-4)">
					{editing && !note ? (
						<RenameProjectForm
							project={project}
							onDone={() => {
								returnFocus.current = true;
								setEditing(false);
							}}
						/>
					) : (
						<div className="flex flex-wrap items-center justify-between gap-(--space-3)">
							<div className="grid min-w-0 flex-[1_1_14rem] gap-0.5">
								<span className="text-sm text-muted-foreground">
									Nome da obra
								</span>
								<span className="text-base font-medium [overflow-wrap:anywhere]">
									{project.name}
								</span>
							</div>
							{!note && (
								<Button
									ref={renameButton}
									variant="outline"
									onClick={() => setEditing(true)}
								>
									<Pencil className="size-4.5" aria-hidden />
									Renomear
								</Button>
							)}
						</div>
					)}
					{note && (
						<div className="flex items-start gap-(--space-2) border-t pt-(--space-4) text-sm text-pretty text-muted-foreground">
							<Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
							<span>{note}</span>
						</div>
					)}
				</CardContent>
			</Card>
		</section>
	);
}
