import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { healthQueryOptions } from "./api";
import { HealthCard } from "./components/HealthCard";

// Shape of the checkbox in this form — UI-only, so it stays local instead of
// packages/shared. healthQuerySchema (shared) validates the URL query string
// the API receives, which is a different concern from this form's own value.
const healthFormSchema = z.object({ verbose: z.boolean() });
type HealthFormValues = z.infer<typeof healthFormSchema>;

export function HealthPage() {
	const { register, watch } = useForm<HealthFormValues>({
		resolver: zodResolver(healthFormSchema),
		defaultValues: { verbose: false },
	});

	const verbose = watch("verbose");
	const health = useQuery(healthQueryOptions({ verbose }));

	return (
		<main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-4">
			<h1 className="text-xl font-semibold">BluPrint</h1>

			<label className="flex items-center gap-2 text-sm">
				<input type="checkbox" {...register("verbose")} className="size-4" />
				Mostrar detalhes
			</label>

			{health.isPending && <p className="text-sm">Verificando a API…</p>}
			{health.isError && (
				<p className="text-sm text-destructive">
					Não foi possível falar com a API.
				</p>
			)}
			{health.data && <HealthCard health={health.data} />}

			<Button
				variant="outline"
				onClick={() => health.refetch()}
				disabled={health.isFetching}
			>
				<RefreshCw className="size-4" />
				Atualizar
			</Button>
		</main>
	);
}
