import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { renderAt, signedIn, stubAuthApi } from "@/test/renderApp";

describe("/ route", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("sends the visitor to the project list", async () => {
		stubAuthApi(signedIn);

		const { router } = renderAt("/");

		await waitFor(() => {
			expect(router.state.location.pathname).toBe("/projects");
		});
		expect(
			await screen.findByRole("heading", { name: "Obras" }),
		).toBeInTheDocument();
	});
});
