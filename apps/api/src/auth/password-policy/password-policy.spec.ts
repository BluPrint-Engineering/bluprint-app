import { isGuessablePassword } from "@bluprint/shared";

describe("isGuessablePassword", () => {
	test.each([
		"bluprint123",
		"Blupr1nt-2026",
		"b.l.u.e.p.r.i.n.t",
		"senha123",
		"Password2024!",
		"s3nh@123",
		"12345678",
		"87654321",
		"abcdefgh",
		"aaaaaaaa",
		"bluprint12345",
		"Bluprint1357!",
		"bluprintbluprint",
		"12341234",
		"aaaaaaa1",
		"abcdefg1",
		"11111111a",
	])("rejects %s whoever the person is", (password) => {
		expect(isGuessablePassword(password)).toBe(true);
	});

	test.each(["Silva!2026", "Silva1357", "SilvaSilva", "JOAO@2026"])(
		"rejects %s for João Silva, ignoring accents and case",
		(password) => {
			expect(isGuessablePassword(password, { name: "João Silva" })).toBe(true);
		},
	);

	test("accepts a longer word that only starts with the person's name", () => {
		expect(isGuessablePassword("joaozinho-2026", { name: "João Silva" })).toBe(
			false,
		);
	});

	test.each(["abc", "x".repeat(100_000)])(
		"leaves a password outside 8–64 characters to the length check",
		(password) => {
			expect(isGuessablePassword(password)).toBe(false);
		},
	);

	test("rejects a password built on the e-mail's local part", () => {
		expect(
			isGuessablePassword("mcduarte#99", { email: "mcduarte@horizonte.test" }),
		).toBe(true);
	});

	test("accepts a passphrase that merely contains the person's name", () => {
		expect(
			isGuessablePassword("rosa-dos-ventos-azul", { name: "Maria Rosa" }),
		).toBe(false);
	});

	test("ignores name pieces too short to mean anything", () => {
		expect(isGuessablePassword("banana-de-obra-azul", { name: "Ana Lu" })).toBe(
			false,
		);
	});

	test.each([
		"prumo-nivel-esquadro",
		"cafe com pao na obra",
		"Tr3s-Laje$-Azuis",
	])("accepts %s", (password) => {
		expect(
			isGuessablePassword(password, {
				name: "Marcela Duarte",
				email: "marcela@horizonte.test",
			}),
		).toBe(false);
	});
});
