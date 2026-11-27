import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { CheckAction } from "./attemptCheck";

export function CheckingStatus({ extending }: { extending: boolean }) {
	return (
		<p role="status">
			{extending
				? "Conferindo se os andares foram adicionados…"
				: "Conferindo se a estrutura foi criada…"}
		</p>
	);
}

export function UncertainAlert({
	checking,
	noConnection,
	onRetry,
	onEdit,
}: {
	checking: CheckAction | undefined;
	noConnection: boolean;
	onRetry: () => void;
	onEdit: () => void;
}) {
	return (
		<Alert variant="destructive">
			<AlertTitle>Não foi possível confirmar</AlertTitle>
			<AlertDescription>
				<p>
					A conexão caiu antes da resposta. Tente de novo: nada é criado duas
					vezes.
				</p>
				{noConnection && (
					<p>
						Ainda sem conexão. Para editar, o app precisa confirmar antes que
						nada foi criado.
					</p>
				)}
				<div className="flex flex-wrap gap-2">
					<Button
						type="button"
						disabled={checking !== undefined}
						onClick={onRetry}
					>
						{checking === "retry" ? "Conferindo…" : "Tentar de novo"}
					</Button>
					<Button
						type="button"
						variant="outline"
						disabled={checking !== undefined}
						onClick={onEdit}
					>
						{checking === "edit" ? "Conferindo…" : "Voltar a editar"}
					</Button>
				</div>
			</AlertDescription>
		</Alert>
	);
}

export function StaleDraftAlert({
	waiting,
	onLoad,
}: {
	waiting: boolean;
	onLoad: () => void;
}) {
	return (
		<Alert>
			<AlertTitle>Este rascunho mudou em outra aba</AlertTitle>
			<AlertDescription>
				<p>Continue a partir da versão mais recente para não perder nada.</p>
				<Button
					className="mt-(--space-2)"
					type="button"
					disabled={waiting}
					onClick={onLoad}
				>
					Carregar a versão mais recente
				</Button>
			</AlertDescription>
		</Alert>
	);
}
