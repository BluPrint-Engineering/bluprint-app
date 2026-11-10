import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppLayout } from "@/features/account";
import {
	dropDraftsOfOtherAccounts,
	SessionCheckFailed,
	SessionSplash,
	sessionQueryOptions,
	useReturnSessionCheck,
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
		dropDraftsOfOtherAccounts(session.user.id);
		return { session };
	},
	pendingComponent: SessionSplash,
	pendingMs: 0,
	errorComponent: SessionCheckFailed,
	component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
	const { session } = Route.useRouteContext();
	const returned = useReturnSessionCheck();
	const covered = returned.phase !== "shown";
	return (
		<>
			{returned.phase === "checking" && <SessionSplash />}
			{returned.phase === "failed" && (
				<SessionCheckFailed onRetry={returned.retry} />
			)}
			<div className="contents" hidden={covered} inert={covered}>
				<AppLayout user={session.user}>
					<Outlet />
				</AppLayout>
			</div>
		</>
	);
}
