import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import {
	SessionCheckFailed,
	SessionSplash,
	sessionQueryOptions,
} from "@/features/auth";

// a pathless layout: every screen of the product lives under it, so a new route is protected by default
export const Route = createFileRoute("/_authenticated")({
	beforeLoad: async ({ context, location }) => {
		const session = await context.queryClient.query(sessionQueryOptions);
		if (!session) {
			throw redirect({
				to: "/login",
				search: { redirect: location.pathname + location.searchStr },
			});
		}
		return { session };
	},
	pendingComponent: SessionSplash,
	pendingMs: 0,
	errorComponent: SessionCheckFailed,
	component: Outlet,
});
