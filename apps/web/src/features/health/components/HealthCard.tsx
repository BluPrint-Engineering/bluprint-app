import type { HealthResponse } from "@bluprint/shared";
import { CircleAlert, CircleCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function HealthCard({ health }: { health: HealthResponse }) {
	const degraded = health.status === "degraded";

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					{degraded ? (
						<CircleAlert className="size-5 text-destructive" />
					) : (
						<CircleCheck className="size-5 text-green-600" />
					)}
					{degraded ? "API degradada" : "API no ar"}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-1 text-sm text-muted-foreground">
				<p>Status: {health.status}</p>
				<p>
					Verificado às:{" "}
					{new Date(health.timestamp).toLocaleTimeString("pt-BR")}
				</p>
				<p>Tempo ativo: {health.uptime.toFixed(1)}s</p>
				{health.verbose && (
					<>
						<p>Ambiente: {health.verbose.environment}</p>
						<p>Runtime: {health.verbose.runtime}</p>
					</>
				)}
			</CardContent>
		</Card>
	);
}
