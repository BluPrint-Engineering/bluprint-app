import type { ProjectAccessRole, ProjectStatus } from "@bluprint/shared";
import { type ApiHandler, json, signedIn, stubApi } from "@/test/renderApp";

export const PAGE_SIZE = 12;

export function project(
	n: number,
	role: ProjectAccessRole = "admin",
	status: ProjectStatus = "active",
) {
	return {
		id: `0190a000-0000-7000-8000-${String(n).padStart(12, "0")}`,
		name: `Obra ${n}`,
		createdAt: "2026-01-01T00:00:00.000Z",
		lastActivityAt: "2026-01-01T00:00:00.000Z",
		role,
		units: { reserved: 0, used: 0 },
		status,
	};
}

export function projectsApi(
	total: number,
	role: (n: number) => ProjectAccessRole = () => "admin",
): ApiHandler {
	return (url) => {
		if (url.pathname !== "/api/projects") return undefined;
		const page = Number(url.searchParams.get("page") ?? 1);
		const byName = url.searchParams.get("sort") === "name";
		const first = (page - 1) * PAGE_SIZE + 1;
		const last = Math.min(page * PAGE_SIZE, total);
		const items = [];
		for (let i = first; i <= last; i++) {
			const n = byName ? total + 1 - i : i;
			items.push(project(n, role(n)));
		}
		return json({ items, total, counts: { active: total, delivered: 0 } });
	};
}

export function stubProjects(api: ApiHandler) {
	return stubApi(signedIn, { api });
}

export function requestedPages(
	fetchMock: ReturnType<typeof stubProjects>["fetchMock"],
) {
	return fetchMock.mock.calls
		.map(([input]) => new URL(String(input), "http://localhost"))
		.filter((url) => url.pathname === "/api/projects")
		.map((url) => url.searchParams.get("page"));
}
