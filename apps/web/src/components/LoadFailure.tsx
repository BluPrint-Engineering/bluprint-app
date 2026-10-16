import { CircleAlert, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StateBlock } from "./StateBlock";

export function LoadFailure({
	state,
	title,
	onRetry,
}: {
	state: "failed" | "offline";
	title: string;
	onRetry: () => void;
}) {
	return state === "failed" ? (
		<StateBlock
			role="alert"
			icon={CircleAlert}
			title={title}
			description="Confira sua conexão e tente de novo."
		>
			<Button size="lg" onClick={onRetry}>
				Tentar de novo
			</Button>
		</StateBlock>
	) : (
		<StateBlock
			icon={WifiOff}
			title="Sem conexão."
			description="Continuamos assim que a internet voltar."
		/>
	);
}
