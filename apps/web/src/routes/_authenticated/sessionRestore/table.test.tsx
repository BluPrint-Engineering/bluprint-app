import { screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { rememberFailedSubmission } from "@/features/auth";
import { sessionDraftKinds } from "@/features/auth/sessionDraft";
import { renderAt, signedIn } from "@/test/renderApp";
import { signInAgain } from "@/test/sessionExpiry";
import {
	click,
	expectNothingOpen,
	expectServerValue,
	PAGE_GROUPS,
	PAGES,
	pick,
	ROWS,
	type Row,
} from "@/test/sessionRestore";

const opensByAddress = ([, page, entry]: Row) =>
	PAGES[page]().entries[entry]?.openedByAddress === true;

const runsFullSequence = ([, , , , sequence]: Row) => sequence === "full";

describe("the restoration table", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("runs the full sequence on exactly one row of every kind that is kept, entries opened by address aside", () => {
		const kindRows = ROWS.filter(
			(row) => runsFullSequence(row) && !opensByAddress(row),
		);
		expect(kindRows.map(([, , , kind]) => kind).sort()).toEqual(
			[...sessionDraftKinds].sort(),
		);
	});

	test("runs the full sequence on every entry opened by address", () => {
		const addressRows = ROWS.filter(opensByAddress);
		expect(addressRows.length).toBeGreaterThan(0);
		expect(addressRows.filter((row) => !runsFullSequence(row))).toEqual([]);
	});

	test("has a file beside this one for every group of screens", () => {
		const files = Object.keys(import.meta.glob("./*.test.tsx")).map((file) =>
			file.replace(/^\.\/(.*)\.test\.tsx$/, "$1"),
		);
		expect(files.sort()).toEqual([...PAGE_GROUPS].sort());
	});
});

describe("a kept reserva change without the entry that sent it", () => {
	afterEach(() => {
		localStorage.clear();
		vi.unstubAllGlobals();
	});

	test.each([
		["floorExhausted", "unitRowReservation"],
		["towerExhausted", "areaRowReservation"],
		["unitExhausted", "duplicateReservation"],
	] as const)("opens nothing on %s", async (key, entryKey) => {
		const page = PAGES[key]();
		rememberFailedSubmission({
			accountId: signedIn.user.id,
			path: page.path,
			kind: "change-reservation",
			variables: { reserved: 5 },
		});
		renderAt(page.path);
		await page.ready();

		await expectNothingOpen(page);
		const entry = page.entries[entryKey];
		if (!entry) throw new Error(`no entry ${entryKey}`);
		await expectServerValue(entry);
	});
});

describe("an action without fields lost to an expired session", () => {
	afterEach(() => {
		localStorage.clear();
		vi.unstubAllGlobals();
	});

	const ACTIONS = [
		[
			"removing a room",
			() => pick("Ações do cômodo Lavanderia", "Remover cômodo"),
			"DELETE",
			"/rooms/",
		],
		[
			"taking a room of the typology out",
			(holder: "unit" | "commonArea") =>
				pick(
					"Ações do cômodo Sala",
					holder === "unit"
						? "Remover desta unidade"
						: "Remover desta área comum",
				),
			"DELETE",
			"/rooms/",
		],
		[
			"giving a room back",
			click("button", "Devolver o cômodo Cozinha"),
			"DELETE",
			"/dropped-rooms/",
		],
		[
			"returning to the typology",
			click("button", "Voltar à tipologia"),
			"POST",
			"/typology/reset",
		],
	] as const;

	test.each(
		(["unit", "commonArea"] as const).flatMap((holder) =>
			ACTIONS.map((action) => [holder, ...action] as const),
		),
	)(
		"on %s, does not reopen or repeat %s after signing back in",
		async (holder, _action, act, method, path) => {
			const page = PAGES[holder]();
			renderAt(page.path);
			await page.ready();
			page.server.expireNextWrite();
			await act(holder);
			await screen.findByLabelText("E-mail");
			await signInAgain();
			await page.ready();
			await screen.findByRole("heading", { name: "Cômodos" });

			await expectNothingOpen(page);
			expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();
			expect(page.server.writes).toHaveLength(1);
			expect(page.server.writes[0]).toMatch(new RegExp(`^${method} .*${path}`));
		},
	);
});
