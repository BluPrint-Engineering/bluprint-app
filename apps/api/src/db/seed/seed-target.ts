import {
	PASSWORD_MAX_LENGTH,
	PASSWORD_MIN_LENGTH,
	isGuessablePassword,
} from "@bluprint/shared";
import { FIXTURE_PASSWORD, people } from "./fixture";

export interface SeedTargetEnv {
	SEED_ALLOW_HOST?: string | undefined;
	SEED_PASSWORD?: string | undefined;
}

export type SeedTarget =
	| { remote: false; password: string }
	| { remote: true; hostname: string; password: string };

// WHATWG URL keeps the brackets around an IPv6 hostname
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function resolveSeedTarget(
	databaseUrl: string,
	env: SeedTargetEnv,
): SeedTarget {
	const { hostname } = new URL(databaseUrl);
	if (LOCAL_HOSTNAMES.has(hostname)) {
		return { remote: false, password: FIXTURE_PASSWORD };
	}
	if (env.SEED_ALLOW_HOST === undefined) {
		throw new Error(
			`Refusing to seed "${hostname}": set SEED_ALLOW_HOST=${hostname} to seed a remote database.`,
		);
	}
	if (env.SEED_ALLOW_HOST !== hostname) {
		throw new Error(
			`Refusing to seed "${hostname}": SEED_ALLOW_HOST is "${env.SEED_ALLOW_HOST}", not the DATABASE_URL hostname ${hostname}.`,
		);
	}
	if (!env.SEED_PASSWORD) {
		throw new Error(
			`Refusing to seed "${hostname}": set SEED_PASSWORD, the fixture password is public.`,
		);
	}
	const password = env.SEED_PASSWORD;
	if (
		password.length < PASSWORD_MIN_LENGTH ||
		password.length > PASSWORD_MAX_LENGTH
	) {
		throw new Error(
			`Refusing to seed "${hostname}": SEED_PASSWORD must be ${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} characters.`,
		);
	}
	const guessableFor = people.find((person) =>
		isGuessablePassword(password, person),
	);
	if (guessableFor) {
		throw new Error(
			`Refusing to seed "${hostname}": SEED_PASSWORD is too easy to guess for ${guessableFor.email} (ADR 0052).`,
		);
	}
	return { remote: true, hostname, password };
}
