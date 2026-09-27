import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { renderAt, signedIn, stubApi } from "@/test/renderApp";

describe("/ route", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("sends the visitor to the project list", async () => {
		stubApi(signedIn);

		const { router } = renderAt("/");

		await waitFor(() => {
			expect(router.state.location.pathname).toBe("/projects");
		});
		expect(
			await screen.findByRole("heading", { name: "Obras" }),
		).toBeInTheDocument();
	});
});
