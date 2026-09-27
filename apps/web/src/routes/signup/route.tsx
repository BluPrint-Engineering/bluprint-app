import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import {
	AuthShell,
	discardSession,
	peekSession,
	SessionSplash,
	SignupPage,
} from "@/features/auth";
import { selfSignupAllowed } from "@/lib/env";

export const Route = createFileRoute("/signup")({
	beforeLoad: async ({ context }) => {
		// the login footer already explains that access comes by invitation
		if (!selfSignupAllowed()) throw redirect({ to: "/login" });
		const session = await peekSession(context.queryClient);
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
