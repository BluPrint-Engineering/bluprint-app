import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import {
	AuthShell,
	discardSession,
	SessionSplash,
	SignupPage,
	sessionQueryOptions,
} from "@/features/auth";
import { selfSignupAllowed } from "@/lib/env";

export const Route = createFileRoute("/signup")({
	beforeLoad: async ({ context }) => {
		// the login footer already explains that access comes by invitation
		if (!selfSignupAllowed()) throw redirect({ to: "/login" });
		// only a shortcut past the form: offline or API-down falls through to it, not the error boundary
		const session = await context.queryClient
			.query({ ...sessionQueryOptions, retry: false })
			.catch(() => null);
		if (session) throw redirect({ to: "/" });
	},
	pendingComponent: SessionSplash,
	pendingMs: 0,
	component: RouteComponent,
});

function RouteComponent() {
	const router = useRouter();
	const { queryClient } = Route.useRouteContext();
	return (
		<AuthShell>
			<SignupPage
				onSuccess={() => {
					// the cached "no session" would send the guard straight back to the login
					discardSession(queryClient);
					router.navigate({ to: "/" });
				}}
			/>
		</AuthShell>
	);
}
