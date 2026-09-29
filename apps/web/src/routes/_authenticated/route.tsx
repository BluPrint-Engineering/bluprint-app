import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppLayout } from "@/features/account";
import {
	SessionCheckFailed,
	SessionSplash,
	sessionQueryOptions,
} from "@/features/auth";

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
	component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
	const { session } = Route.useRouteContext();
	return (
		<AppLayout user={session.user}>
			<Outlet />
		</AppLayout>
	);
}
