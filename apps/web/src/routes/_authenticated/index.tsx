import { createFileRoute } from "@tanstack/react-router";

// TODO(#45): replace with the projects list
export const Route = createFileRoute("/_authenticated/")({
	component: () => (
		<main className="grid min-h-dvh place-items-center">
			<h1 className="text-xl font-semibold">Obras</h1>
		</main>
	),
});
