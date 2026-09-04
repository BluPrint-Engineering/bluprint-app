import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { HealthPage } from "./HealthPage";

function stubHealthFetch(overrides: { status: string; database: string }) {
	vi.stubGlobal(
		"fetch",
		vi.fn(() =>
			Promise.resolve(
				new Response(
					JSON.stringify({
						status: overrides.status,
						database: overrides.database,
						timestamp: new Date().toISOString(),
						uptime: 1.2,
					}),
					{ status: 200 },
				),
			),
		),
	);
}

describe("HealthPage", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("shows the API health status", async () => {
		stubHealthFetch({ status: "ok", database: "up" });

		const queryClient = new QueryClient();
		render(
			<QueryClientProvider client={queryClient}>
				<HealthPage />
			</QueryClientProvider>,
		);

		await waitFor(() => {
			expect(screen.getByText(/API no ar/i)).toBeInTheDocument();
		});
		expect(screen.getByText(/Status: ok/i)).toBeInTheDocument();
	});

	test("shows the API as degraded when the database is down", async () => {
		stubHealthFetch({ status: "degraded", database: "down" });

		const queryClient = new QueryClient();
		render(
			<QueryClientProvider client={queryClient}>
				<HealthPage />
			</QueryClientProvider>,
		);

		await waitFor(() => {
			expect(screen.getByText(/API degradada/i)).toBeInTheDocument();
		});
	});
});
