import { createFileRoute, redirect } from "@tanstack/react-router";
import { organizationQueryOptions } from "@/features/account/api";
import { UnitsPage } from "@/features/organization";

export const Route = createFileRoute("/_authenticated/units")({
	beforeLoad: async ({ context }) => {
		const organization = await context.queryClient
			.query(organizationQueryOptions)
			.catch(() => null);
		if (organization?.role !== "admin") {
			throw redirect({ to: "/projects" });
		}
	},
	component: UnitsPage,
});
