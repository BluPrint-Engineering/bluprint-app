import { createFileRoute, redirect } from "@tanstack/react-router";
import { organizationQueryOptions } from "@/features/account/api";
import { NewProjectPage } from "@/features/projects";

export const Route = createFileRoute("/_authenticated/projects/new")({
	beforeLoad: async ({ context }) => {
		const organization = await context.queryClient
			.query(organizationQueryOptions)
			.catch(() => null);
		if (organization?.role !== "admin") {
			throw redirect({ to: "/projects" });
		}
	},
	component: NewProjectPage,
});
