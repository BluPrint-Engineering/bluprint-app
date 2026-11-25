import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, describe, expect, test, vi } from "vitest";
import { renderAt } from "@/test/renderApp";
import { signInAgain } from "@/test/sessionExpiry";
import {
	describeRestorationRows,
	expectNothingOpen,
	PAGES,
} from "@/test/sessionRestore";
import { typologyOf } from "@/test/structureApi";

describeRestorationRows(import.meta.url);

describe("a copy of a tipologia lost to an expired session", () => {
	afterEach(() => {
		localStorage.clear();
		vi.unstubAllGlobals();
		toast.dismiss();
	});

	test("reopens with what the dialog showed when the original was deleted meanwhile, and creates one copy", async () => {
		const user = userEvent.setup({ delay: null });
		const page = PAGES.configuration();
		const original = typologyOf("Tipologia A", ["Sala"]);
		const apiBase = `/api${page.path.replace("/configuration", "")}`;
		renderAt(page.path);
		await page.ready();
		await user.click(
			await screen.findByRole("button", { name: "Ações da Tipologia A" }),
		);
		await user.click(await screen.findByRole("menuitem", { name: "Copiar" }));
		const field = await screen.findByRole("textbox", { name: "Nome da cópia" });
		await user.clear(field);
		await user.type(field, "Tipologia Z");
		page.server.expireNextWrite();
		await user.click(screen.getByRole("button", { name: "Copiar" }));
		await screen.findByLabelText("E-mail");
		await fetch(`${apiBase}/typologies/${original.id}`, { method: "DELETE" });

		await signInAgain();
		await page.ready();

		const dialog = within(
			await screen.findByRole("dialog", { name: "Copiar Tipologia A" }),
		);
		expect(
			await screen.findByRole("textbox", { name: "Nome da cópia" }),
		).toHaveValue("Tipologia Z");
		expect(
			dialog.getAllByRole("listitem").map((item) => item.textContent),
		).toEqual(["Sala"]);
		expect(
			screen.queryByRole("dialog", { name: "Nova tipologia" }),
		).not.toBeInTheDocument();

		await user.click(dialog.getByRole("button", { name: "Copiar" }));

		expect(
			await screen.findByText("Tipologia Z criada com 1 cômodo."),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Ações da Tipologia A" }),
		).not.toBeInTheDocument();
		expect(page.server.writes.map((write) => write.split(" ")[0])).toEqual([
			"POST",
			"DELETE",
			"POST",
		]);
		await expectNothingOpen(page);
	});
});
