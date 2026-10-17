import type { ProjectSummary } from "@bluprint/shared";
import { CircleCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectStatusBadge } from "../components/ProjectStatusBadge";
import { DeliverProjectDialog } from "./DeliverProjectDialog";
import { LockNote } from "./LockNote";
import { SECTION_ID } from "./sections";

const ACTIVE_TEXT =
	"A equipe registra e resolve pendências. Entregue a obra quando ela for passada ao cliente: depois disso ela fica fechada e não pode ser reaberta.";
const CLOSED_TEXT =
	"A obra está fechada: nada mais pode ser alterado. Os relatórios continuam disponíveis.";

const dayFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

function statusText({ status, delivery }: ProjectSummary) {
	if (status === "active") return ACTIVE_TEXT;
	if (!delivery) return CLOSED_TEXT;
	const when = `Entregue em ${dayFormat.format(new Date(delivery.at))}`;
	return `${when}${delivery.by ? ` por ${delivery.by}` : ""}. ${CLOSED_TEXT}`;
}

export function ProjectStatusSection({ project }: { project: ProjectSummary }) {
	const [confirming, setConfirming] = useState(false);
	const active = project.status === "active";
	const assistant = project.role === "assistant";

	return (
		<section
			id={SECTION_ID.status}
			aria-label="Status da obra"
			className="scroll-mt-22"
		>
			<Card>
				<CardHeader>
					<CardTitle
						role="heading"
						aria-level={3}
						className="text-lg font-semibold tracking-tight"
					>
						Status da obra
					</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-(--space-4)">
					<div className="flex flex-wrap items-center justify-between gap-(--space-3)">
						<div className="grid min-w-0 flex-[1_1_16rem] justify-items-start gap-(--space-2)">
							<ProjectStatusBadge status={project.status} />
							<span className="text-sm text-pretty text-muted-foreground">
								{statusText(project)}
							</span>
						</div>
						{active && !assistant && (
							<Button variant="outline" onClick={() => setConfirming(true)}>
								<CircleCheck className="size-4.5" aria-hidden />
								Entregar obra
							</Button>
						)}
					</div>
					{active && assistant && (
						<LockNote>
							Só o gerente de obra ou o admin da construtora entrega a obra.
						</LockNote>
					)}
				</CardContent>
			</Card>
			{active && !assistant && (
				<DeliverProjectDialog
					project={project}
					open={confirming}
					onOpenChange={setConfirming}
				/>
			)}
		</section>
	);
}
