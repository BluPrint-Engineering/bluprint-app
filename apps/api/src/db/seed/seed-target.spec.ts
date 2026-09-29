import { FIXTURE_PASSWORD, people } from "./fixture";
import { resolveSeedTarget } from "./seed-target";

const url = (host: string) => `postgresql://u:p@${host}:5432/bluprint`;

describe("resolveSeedTarget", () => {
	test.each([["localhost"], ["127.0.0.1"], ["[::1]"]])(
		"seeds %s with the fixture password and no variables",
		(host) => {
			expect(resolveSeedTarget(url(host), {}, people)).toEqual({
				kind: "local",
				password: FIXTURE_PASSWORD,
			});
		},
	);

	test("refuses a remote host without SEED_ALLOW_HOST", () => {
		expect(() => resolveSeedTarget(url("db.example.com"), {}, people)).toThrow(
			/SEED_ALLOW_HOST/,
		);
	});

	test("refuses a SEED_ALLOW_HOST that is not the database host", () => {
		expect(() =>
			resolveSeedTarget(
				url("db.example.com"),
				{ SEED_ALLOW_HOST: "staging.example.com" },
				people,
			),
		).toThrow(/SEED_ALLOW_HOST.*staging\.example\.com.*db\.example\.com/);
	});

	test.each([[undefined], [""]])(
		"refuses a remote host when SEED_PASSWORD is %j",
		(SEED_PASSWORD) => {
			expect(() =>
				resolveSeedTarget(
					url("db.example.com"),
					{ SEED_ALLOW_HOST: "db.example.com", SEED_PASSWORD },
					people,
				),
			).toThrow(/SEED_PASSWORD/);
		},
	);

	test.each([
		["too short", "curta"],
		["too long", "x".repeat(65)],
		["guessable", "senha123"],
		["built on a fixture person's name", "ribeiro-ribeiro"],
	])("refuses a SEED_PASSWORD that is %s without echoing it", (_, password) => {
		const attempt = () =>
			resolveSeedTarget(
				url("db.example.com"),
				{ SEED_ALLOW_HOST: "db.example.com", SEED_PASSWORD: password },
				people,
			);

		expect(attempt).toThrow(/SEED_PASSWORD/);
		expect(attempt).not.toThrow(password);
	});

	test("lets a remote host through when both variables are right", () => {
		expect(
			resolveSeedTarget(
				url("db.example.com"),
				{
					SEED_ALLOW_HOST: "db.example.com",
					SEED_PASSWORD: "prumo nivel esquadro",
				},
				people,
			),
		).toEqual({
			kind: "remote",
			host: "db.example.com",
			password: "prumo nivel esquadro",
		});
	});

	test.each([["host=db.example.com"], ["hostaddr=10.0.0.5"]])(
		"refuses a DATABASE_URL that overrides its host with ?%s",
		(query) => {
			expect(() =>
				resolveSeedTarget(`${url("localhost")}?${query}`, {}, people),
			).toThrow(/DATABASE_URL/);
		},
	);
});
