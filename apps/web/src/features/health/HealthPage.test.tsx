import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { HealthPage } from "./HealthPage";

describe("HealthPage", () => {
	beforeEach(() => {
		vi.stubGlobal(
			"fetch",
			vi.fn(() =>
				Promise.resolve(
					new Response(
						JSON.stringify({
							status: "ok",
							timestamp: new Date().toISOString(),
							uptime: 1.2,
						}),
						{ status: 200 },
					),
				),
			),
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("shows the API health status", async () => {
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
});
