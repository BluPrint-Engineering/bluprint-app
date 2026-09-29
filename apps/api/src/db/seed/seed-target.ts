import {
	PASSWORD_MAX_LENGTH,
	PASSWORD_MIN_LENGTH,
	isGuessablePassword,
} from "@bluprint/shared";
import { FIXTURE_PASSWORD, type SeedPerson } from "./fixture";

// URL.hostname keeps the brackets of an IPv6 literal
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

export type SeedTarget =
	| { kind: "local"; password: string }
	| { kind: "remote"; host: string; password: string };

export interface SeedEnv {
	SEED_ALLOW_HOST?: string | undefined;
	SEED_PASSWORD?: string | undefined;
}

export function resolveSeedTarget(
	databaseUrl: string,
	env: SeedEnv,
	people: SeedPerson[],
): SeedTarget {
	const { hostname, searchParams } = new URL(databaseUrl);
	if (searchParams.has("host") || searchParams.has("hostaddr")) {
		throw new Error(
			"Refusing to seed: DATABASE_URL must not override its host with ?host or ?hostaddr.",
		);
	}
	if (LOCAL_HOSTNAMES.has(hostname)) {
		return { kind: "local", password: FIXTURE_PASSWORD };
	}
	if (!env.SEED_ALLOW_HOST) {
		throw new Error(
			`Refusing to seed "${hostname}": set SEED_ALLOW_HOST=${hostname} to confirm the remote target.`,
		);
	}
	if (env.SEED_ALLOW_HOST !== hostname) {
		throw new Error(
			`Refusing to seed: SEED_ALLOW_HOST is "${env.SEED_ALLOW_HOST}" but the DATABASE_URL host is "${hostname}".`,
		);
	}
	if (!env.SEED_PASSWORD) {
		throw new Error(
			`Refusing to seed "${hostname}": SEED_PASSWORD is required for a remote database.`,
		);
	}
	const { SEED_PASSWORD: password } = env;
	if (
		password.length < PASSWORD_MIN_LENGTH ||
		password.length > PASSWORD_MAX_LENGTH
	) {
		throw new Error(
			`Refusing to seed "${hostname}": SEED_PASSWORD must be ${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_LENGTH} characters.`,
		);
	}
	const guessableFor = people.find((person) =>
		isGuessablePassword(password, person),
	);
	if (guessableFor) {
		throw new Error(
			`Refusing to seed "${hostname}": SEED_PASSWORD is too easy to guess for ${guessableFor.email}.`,
		);
	}
	return { kind: "remote", host: hostname, password };
}
