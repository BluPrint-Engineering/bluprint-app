import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { renderAt, signedIn, stubApi } from "@/test/renderApp";

function requestedPage(fetchMock: ReturnType<typeof stubApi>["fetchMock"]) {
	const urls = fetchMock.mock.calls
		.map(([input]) => new URL(String(input), "http://localhost"))
		.filter((url) => url.pathname === "/api/projects");
	return urls.at(-1)?.searchParams.get("page");
}

describe("/projects route", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("asks for the page in the address", async () => {
		const { fetchMock } = stubApi(signedIn);

		const { router } = renderAt("/projects?page=2");

		await waitFor(() => {
			expect(requestedPage(fetchMock)).toBe("2");
		});
		expect(router.state.location.search).toEqual({ page: 2 });
	});

	test.each(["1", "0", "-1", "1.5", "abc", "%22%22"])(
		"falls back to the first page, omitted from the address, for page=%s",
		async (value) => {
			const { fetchMock } = stubApi(signedIn);

			const { router } = renderAt(`/projects?page=${value}`);

			await screen.findByRole("heading", { name: "Obras" });
			await waitFor(() => {
				expect(requestedPage(fetchMock)).toBe("1");
			});
			expect(router.state.location.search).toEqual({});
		},
	);
});
