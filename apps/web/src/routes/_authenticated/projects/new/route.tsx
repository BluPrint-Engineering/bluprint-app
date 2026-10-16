import { createFileRoute, redirect } from "@tanstack/react-router";
import { organizationQueryOptions } from "@/features/account/api";
import { NewProjectPage } from "@/features/projects";

export const Route = createFileRoute("/_authenticated/projects/new")({
	beforeLoad: async ({ context }) => {
		// a failed role lookup leaves the admin's controls out, so it reads as not admin
		const organization = await context.queryClient
			.query(organizationQueryOptions)
			.catch(() => null);
		if (organization?.role !== "admin") {
			throw redirect({ to: "/projects" });
		}
	},
	component: NewProjectPage,
});
