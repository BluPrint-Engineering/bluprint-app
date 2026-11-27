import { LOCATION_NOT_FOUND, type StructureCounts } from "@bluprint/shared";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { locationQueryOptions } from "../api";
import { createdToast, floorsAddedToast } from "../reserveText";

export type CheckAction = "open" | "retry" | "edit";

export async function attemptOutcome(
	queryClient: QueryClient,
	projectId: string,
	firstLocationId: string,
): Promise<"created" | "missing" | "unknown"> {
	try {
		await queryClient.fetchQuery({
			...locationQueryOptions(projectId, firstLocationId),
			staleTime: 0,
			retry: false,
		});
		return "created";
	} catch (error) {
		return error instanceof ApiError &&
			error.status === 404 &&
			error.problem?.code === LOCATION_NOT_FOUND
			? "missing"
			: "unknown";
	}
}

export interface ExtendedTower {
	id: string;
	name?: string | undefined;
}

export function useFinishAttempt(projectId: string, storageKey: string) {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	return (counts: StructureCounts, tower?: ExtendedTower) => {
		localStorage.removeItem(storageKey);
		void queryClient.invalidateQueries({ queryKey: ["structure", projectId] });
		if (tower) {
			toast.success(floorsAddedToast(counts.floors, tower.name));
			void navigate(
				tower.name !== undefined
					? {
							to: "/projects/$projectId/locations/$locationId",
							params: { projectId, locationId: tower.id },
							replace: true,
						}
					: {
							to: "/projects/$projectId",
							params: { projectId },
							replace: true,
						},
			);
			return;
		}
		toast.success(createdToast(counts.towers, counts.units), {
			duration: 12_000,
			description: (
				<Link
					to="/projects/$projectId/configuration"
					params={{ projectId }}
					hash="tipologias"
					className="font-medium text-primary underline underline-offset-3"
					onClick={() => toast.dismiss()}
				>
					Ver tipologias
				</Link>
			),
		});
		void navigate({
			to: "/projects/$projectId",
			params: { projectId },
			replace: true,
		});
	};
}
