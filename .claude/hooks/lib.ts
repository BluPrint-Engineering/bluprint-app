// Shared helpers for .claude/hooks/*.ts; see docs/adr/0048-hooks-enforce-agent-guardrails.md.
import path from "node:path";

export async function readStdinJson<T>(): Promise<T> {
	return JSON.parse(await Bun.stdin.text()) as T;
}

export function block(reason: string): never {
	process.stderr.write(`${reason}\n`);
	process.exit(2);
}

// Runs `main`; an unexpected error is reported on stderr but still exits 0 (fail open).
export async function runHook(label: string, main: () => Promise<void>): Promise<void> {
	try {
		await main();
	} catch (error) {
		process.stderr.write(`${label}: ${error instanceof Error ? error.message : String(error)}\n`);
	}
	process.exit(0);
}

export function isEnvFile(candidate: string): boolean {
	return path.basename(candidate) === ".env";
}
