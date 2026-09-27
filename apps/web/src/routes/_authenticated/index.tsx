import { createFileRoute, redirect } from "@tanstack/react-router";

// "/" stays free for a future landing page; the product starts at the projects list
export const Route = createFileRoute("/_authenticated/")({
	beforeLoad: () => {
		throw redirect({ to: "/projects" });
	},
});
