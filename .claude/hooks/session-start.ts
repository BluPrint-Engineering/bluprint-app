// cwd comes from the hook's JSON input, not CLAUDE_PROJECT_DIR (ADR 0049).
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { $ } from "bun";
import { describeError, isLinkedWorktree, worktreeRoot } from "../../scripts/worktree-core";

async function main(): Promise<void> {
	const { cwd: rawCwd } = JSON.parse(await Bun.stdin.text()) as { cwd: string };
	const cwd = await worktreeRoot(rawCwd);

	const alreadySetUp = existsSync(resolve(cwd, ".env.local"));
	if (alreadySetUp || !(await isLinkedWorktree(cwd))) {
		return;
	}

	const result = await $`bun run worktree:setup`.cwd(cwd).nothrow().quiet();
	if (result.exitCode !== 0) {
		process.stderr.write(
			`worktree:setup failed (exit ${result.exitCode}) — run it by hand in ${cwd}.\n`,
		);
		return;
	}

	const lastLine = result.stdout.toString().trim().split("\n").at(-1);
	console.log(lastLine ?? "worktree:setup: done.");
}

try {
	await main();
} catch (error) {
	process.stderr.write(`session-start hook failed: ${describeError(error)}\n`);
}
process.exit(0);
