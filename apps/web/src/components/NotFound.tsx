import { Link } from "@tanstack/react-router";
import { Building, MapPinOff } from "lucide-react";
import { Button } from "@/components/ui/button";

const VARIANTS = {
	route: {
		icon: MapPinOff,
		title: "Página não encontrada",
		description: "O endereço pode estar errado ou a página mudou de lugar.",
	},
	project: {
		icon: Building,
		title: "Obra não encontrada",
		description: "Ela não existe ou você não tem acesso a ela.",
	},
} as const;

export function NotFound({ variant }: { variant: keyof typeof VARIANTS }) {
	const { icon: Icon, title, description } = VARIANTS[variant];
	return (
		<main className="mx-auto grid w-full max-w-(--content-max) flex-1 content-start justify-items-center gap-(--space-4) px-(--page-pad) py-(--space-12) text-center md:py-(--space-16)">
			<Icon className="size-6 text-muted-foreground" aria-hidden="true" />
			<div className="grid gap-(--space-1)">
				<h1 className="text-lg leading-snug font-semibold tracking-tight">
					{title}
				</h1>
				<p className="text-sm leading-normal text-pretty text-muted-foreground">
					{description}
				</p>
			</div>
			<Button asChild size="lg" className="max-md:w-full">
				<Link to="/projects" activeOptions={{ exact: true }}>
					Voltar para obras
				</Link>
			</Button>
		</main>
	);
}
