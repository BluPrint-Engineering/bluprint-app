import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { ProjectsMobileToolbar } from "./ProjectsToolbar";

function renderToolbar(activeFilterCount: number) {
	const onClearFilters = vi.fn();
	render(
		<ProjectsMobileToolbar
			sort="recent"
			onSortChange={() => {}}
			activeFilterCount={activeFilterCount}
			onClearFilters={onClearFilters}
			total={26}
		/>,
	);
	return { onClearFilters };
}

describe("projects toolbar on the phone", () => {
	test.each([
		[1, "Filtros, 1 ativo", "1 filtro ativo"],
		[2, "Filtros, 2 ativos", "2 filtros ativos"],
	])(
		"counts %i active filter(s) on the button and in the sheet",
		async (count, buttonName, description) => {
			renderToolbar(count);

			const button = screen.getByRole("button", { name: buttonName });
			expect(button).toHaveTextContent(`Filtros${count}`);

			await userEvent.click(button);

			expect(
				await screen.findByRole("dialog", { name: "Filtros" }),
			).toHaveAccessibleDescription(description);
		},
	);

	test("clears the filters from the sheet once one is active", async () => {
		const { onClearFilters } = renderToolbar(2);

		await userEvent.click(
			screen.getByRole("button", { name: "Filtros, 2 ativos" }),
		);
		await userEvent.click(
			within(await screen.findByRole("dialog")).getByRole("button", {
				name: "Limpar filtros",
			}),
		);

		expect(onClearFilters).toHaveBeenCalledOnce();
	});
});
