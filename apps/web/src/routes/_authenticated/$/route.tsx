import { createFileRoute } from "@tanstack/react-router";
import { NotFound } from "@/components/NotFound";

export const Route = createFileRoute("/_authenticated/$")({
	component: () => <NotFound variant="route" />,
});
