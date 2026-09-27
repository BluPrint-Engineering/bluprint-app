import { createFileRoute, redirect } from "@tanstack/react-router";

// no product screen lives at "/": it stays free for the landing page
export const Route = createFileRoute("/_authenticated/")({
	beforeLoad: () => {
		throw redirect({ to: "/projects", replace: true });
	},
});
