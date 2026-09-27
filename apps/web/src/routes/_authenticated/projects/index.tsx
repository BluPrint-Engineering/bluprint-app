import { createFileRoute } from "@tanstack/react-router";

// TODO(#98): replace with the projects list
export const Route = createFileRoute("/_authenticated/projects/")({
	component: () => (
		<main className="grid place-items-center py-(--space-16)">
			<h1 className="text-xl font-semibold">Obras</h1>
		</main>
	),
});
