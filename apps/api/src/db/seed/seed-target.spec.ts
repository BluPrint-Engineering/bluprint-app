import { FIXTURE_PASSWORD } from "./fixture";
import { resolveSeedTarget } from "./seed-target";

describe("resolveSeedTarget", () => {
	test.each(["localhost", "127.0.0.1", "[::1]"])(
		"seeds %s with the fixture password and no variable set",
		(host) => {
			expect(
				resolveSeedTarget(
					`postgresql://bluprint:bluprint@${host}:5432/bluprint`,
					{},
				),
			).toEqual({ remote: false, password: FIXTURE_PASSWORD });
		},
	);

	const remoteUrl =
		"postgresql://bluprint:secret@db.bluprint.app:5432/bluprint";

	test("refuses a remote host when SEED_ALLOW_HOST is missing", () => {
		expect(() =>
			resolveSeedTarget(remoteUrl, { SEED_PASSWORD: "a-real-password" }),
		).toThrow(/SEED_ALLOW_HOST/);
	});

	test.each(["staging.bluprint.app", "bluprint.app", ""])(
		"refuses a remote host when SEED_ALLOW_HOST is %j instead of its hostname",
		(allowedHost) => {
			expect(() =>
				resolveSeedTarget(remoteUrl, {
					SEED_ALLOW_HOST: allowedHost,
					SEED_PASSWORD: "a-real-password",
				}),
			).toThrow(/SEED_ALLOW_HOST.*db\.bluprint\.app/);
		},
	);

	test.each([undefined, ""])(
		"refuses a remote host when SEED_PASSWORD is %j",
		(password) => {
			expect(() =>
				resolveSeedTarget(remoteUrl, {
					SEED_ALLOW_HOST: "db.bluprint.app",
					SEED_PASSWORD: password,
				}),
			).toThrow(/SEED_PASSWORD/);
		},
	);

	test.each(["short", "bluprint123", "Carla@2026", "x".repeat(65)])(
		"refuses a remote SEED_PASSWORD %j that sign-up would reject after the truncate",
		(password) => {
			expect(() =>
				resolveSeedTarget(remoteUrl, {
					SEED_ALLOW_HOST: "db.bluprint.app",
					SEED_PASSWORD: password,
				}),
			).toThrow(/SEED_PASSWORD/);
		},
	);

	test("seeds a remote host with SEED_PASSWORD once SEED_ALLOW_HOST names it", () => {
		expect(
			resolveSeedTarget(remoteUrl, {
				SEED_ALLOW_HOST: "db.bluprint.app",
				SEED_PASSWORD: "a-real-password",
			}),
		).toEqual({
			remote: true,
			hostname: "db.bluprint.app",
			password: "a-real-password",
		});
	});
});
