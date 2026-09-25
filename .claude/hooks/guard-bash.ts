#!/usr/bin/env bun
// PreToolUse guard for Bash (ADR 0048).
import { spawnSync } from "node:child_process";
import path from "node:path";
import { block, isEnvFile, readStdinJson, runHook } from "./lib";

interface PreToolUseInput {
	cwd?: string;
	tool_name?: string;
	tool_input?: { command?: string };
}

// Removes heredoc bodies (`<<EOF`, `<<-'EOF'`, ...) so payload text (e.g. a commit message) isn't parsed as commands.
function stripHeredocs(input: string): string {
	const marker = /<<(-?)\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\2/g;
	let result = "";
	let cursor = 0;
	let match: RegExpExecArray | null;
	while ((match = marker.exec(input)) !== null) {
		const [full, dash, , delimiter] = match;
		const lineEnd = input.indexOf("\n", match.index + (full?.length ?? 0));
		if (lineEnd === -1) {
			continue;
		}
		const bodyStart = lineEnd + 1;
		const terminator = new RegExp(`^${dash ? "[ \\t]*" : ""}${delimiter}[ \\t]*$`, "m");
		const termMatch = terminator.exec(input.slice(bodyStart));
		if (!termMatch) {
			continue;
		}
		let cutEnd = bodyStart + termMatch.index + termMatch[0].length;
		if (input[cutEnd] === "\n") {
			cutEnd++;
		}
		result += input.slice(cursor, lineEnd + 1);
		cursor = cutEnd;
		marker.lastIndex = cutEnd;
	}
	result += input.slice(cursor);
	return result;
}

const OPERATORS = ["&&", "||", ">>", "&", ";", "|", ">", "<"] as const;

// Splits into words; operators are their own token even glued to text (`>.env`).
function tokenize(input: string): string[] {
	const tokens: string[] = [];
	let current = "";
	let i = 0;

	const flush = () => {
		if (current !== "") {
			tokens.push(current);
			current = "";
		}
	};

	while (i < input.length) {
		const char = input[i];

		if (char === "'") {
			const end = input.indexOf("'", i + 1);
			const close = end === -1 ? input.length : end;
			current += input.slice(i + 1, close);
			i = close + 1;
			continue;
		}

		if (char === '"') {
			let j = i + 1;
			while (j < input.length && input[j] !== '"') {
				// Inside double quotes, backslash is only special before $ ` " \ or a newline.
				if (input[j] === "\\" && j + 1 < input.length && '$`"\\\n'.includes(input[j + 1] ?? "")) {
					current += input[j + 1];
					j += 2;
					continue;
				}
				current += input[j];
				j++;
			}
			i = j + 1;
			continue;
		}

		if (char === "\\" && i + 1 < input.length) {
			current += input[i + 1];
			i += 2;
			continue;
		}

		if (char === "\n") {
			flush();
			tokens.push(";"); // a newline separates commands, same as `;`
			i++;
			continue;
		}

		if (/\s/.test(char ?? "")) {
			flush();
			i++;
			continue;
		}

		const operator = OPERATORS.find((op) => input.startsWith(op, i));
		if (operator) {
			flush();
			tokens.push(operator);
			i += operator.length;
			continue;
		}

		current += char;
		i++;
	}

	flush();
	return tokens;
}

const SEGMENT_BREAKS = new Set(["&&", "||", "&", ";", "|"]);

function splitSegments(tokens: string[]): string[][] {
	const segments: string[][] = [[]];
	for (const token of tokens) {
		if (SEGMENT_BREAKS.has(token)) {
			segments.push([]);
		} else {
			segments[segments.length - 1]?.push(token);
		}
	}
	return segments.filter((segment) => segment.length > 0);
}

const ENV_ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;

function stripEnvPrefix(segment: string[]): { env: string[]; argv: string[] } {
	let i = 0;
	while (i < segment.length && ENV_ASSIGNMENT.test(segment[i] ?? "")) {
		i++;
	}
	return { env: segment.slice(0, i), argv: segment.slice(i) };
}

function currentBranch(dir: string): string {
	const result = spawnSync("git", ["-C", dir, "rev-parse", "--abbrev-ref", "HEAD"], {
		encoding: "utf8",
	});
	return result.status === 0 ? result.stdout.trim() : "";
}

function refspecDestination(refspec: string, gitDir: string): string {
	const withoutForce = refspec.startsWith("+") ? refspec.slice(1) : refspec;
	const colon = withoutForce.indexOf(":");
	const raw = colon === -1 ? withoutForce : withoutForce.slice(colon + 1);
	const dst = raw.replace(/^refs\/heads\//, "");
	return dst === "HEAD" ? currentBranch(gitDir) : dst;
}

// A value-taking char ends a short-flag cluster: the rest of the token is its value, not more flags.
function shortFlagTriggers(token: string, target: string, valueTaking: Set<string>): boolean {
	if (!/^-[a-zA-Z]+$/.test(token)) {
		return false;
	}
	for (const char of token.slice(1)) {
		if (char === target) {
			return true;
		}
		if (valueTaking.has(char)) {
			return false;
		}
	}
	return false;
}

const PUSH_VALUE_SHORT = new Set(["o"]);
const PUSH_VALUE_FLAGS = new Set(["-o", "--push-option", "--repo"]);
const COMMIT_VALUE_SHORT = new Set(["m", "c", "C", "F", "S"]);
const COMMIT_VALUE_LONG = new Set(["--message", "--file"]);

// Walks git commit's args for a triggering `-n`, skipping -m/-F/--message/... values so a flag's own value is never read as a flag.
function commitShortNoVerify(args: string[]): boolean {
	for (let i = 0; i < args.length; i++) {
		const token = args[i] as string;
		if (COMMIT_VALUE_LONG.has(token)) {
			i++;
			continue;
		}
		if (!/^-[a-zA-Z]+$/.test(token)) {
			continue;
		}
		const chars = token.slice(1);
		let consumesNext = false;
		for (let c = 0; c < chars.length; c++) {
			const char = chars[c] as string;
			if (char === "n") {
				return true;
			}
			if (COMMIT_VALUE_SHORT.has(char)) {
				consumesNext = c === chars.length - 1;
				break;
			}
		}
		if (consumesNext) {
			i++;
		}
	}
	return false;
}

function checkGitPush(pushArgs: string[], gitDir: string): string | null {
	const flags: string[] = [];
	const positionals: string[] = [];
	for (let i = 0; i < pushArgs.length; i++) {
		const token = pushArgs[i] as string;
		if (token.startsWith("-")) {
			flags.push(token);
			if (PUSH_VALUE_FLAGS.has(token) && !token.includes("=")) {
				i++; // this flag's value is the next token, not a positional
			}
			continue;
		}
		positionals.push(token);
	}

	const hasForce = flags.some((f) => f === "--force" || shortFlagTriggers(f, "f", PUSH_VALUE_SHORT));
	const hasForceRefspec = pushArgs.some((t) => t.startsWith("+") && t.length > 1);

	const refspecs = positionals.slice(1); // positionals[0] is the remote, if given
	const targetsMain =
		refspecs.length > 0
			? refspecs.some((r) => refspecDestination(r, gitDir) === "main")
			: currentBranch(gitDir) === "main";

	if (targetsMain) {
		return "git push to main is blocked; open a pull request instead.";
	}
	if (hasForce || hasForceRefspec) {
		return "git push --force/-f is blocked; use --force-with-lease on a non-main branch instead.";
	}
	return null;
}

const DRIZZLE_DESTRUCTIVE = new Set(["push", "drop"]);
const ENV_ARG_COMMANDS = new Set([
	"cat",
	"less",
	"head",
	"tail",
	"source",
	"sed",
	"awk",
	"more",
	"bat",
	"tee",
	"rm",
	"xxd",
	"od",
	"strings",
	"diff",
	"cp",
	"mv",
]);
const GH_VALUE_FLAGS = new Set(["-R", "--repo", "--hostname"]);
const SHELLS_WITH_C = new Set(["bash", "sh", "zsh"]);
const LEFTHOOK_FALSY = new Set(["0", "false"]);

// A falsy `LEFTHOOK=` (any case) or any `LEFTHOOK_EXCLUDE=` disables Lefthook's hooks (ADR 0045).
function lefthookBypassReason(assignment: string): string | null {
	const disable = /^LEFTHOOK=(.*)$/.exec(assignment);
	if (disable && LEFTHOOK_FALSY.has((disable[1] ?? "").toLowerCase())) {
		return "Disabling LEFTHOOK is blocked; it skips the local git hooks (docs/adr/0048).";
	}
	if (/^LEFTHOOK_EXCLUDE=/.test(assignment)) {
		return "LEFTHOOK_EXCLUDE is blocked; it skips specific local git hooks (docs/adr/0048).";
	}
	return null;
}

const GREP_LIKE = new Set(["grep", "rg", "ag"]);
const GREP_FILE_FLAGS = new Set(["-f", "--file"]);
const GREP_VALUE_FLAGS = new Set([
	"-f",
	"--file",
	"-e",
	"--regexp",
	"-A",
	"-B",
	"-C",
	"-m",
	"--max-count",
	"--include",
	"--exclude",
	"--exclude-dir",
]);

// The first positional is the search pattern, not a file; only a later positional or -f/--file's value is.
function grepTargetsEnv(args: string[]): boolean {
	let sawPattern = false;
	for (let i = 0; i < args.length; i++) {
		const token = args[i] as string;
		if (token.startsWith("-")) {
			const eq = token.indexOf("=");
			if (eq !== -1) {
				if (GREP_FILE_FLAGS.has(token.slice(0, eq)) && isEnvFile(token.slice(eq + 1))) {
					return true;
				}
				continue;
			}
			if (GREP_FILE_FLAGS.has(token) && isEnvFile(args[i + 1] ?? "")) {
				return true;
			}
			if (GREP_VALUE_FLAGS.has(token)) {
				i++;
			}
			continue;
		}
		if (!sawPattern) {
			sawPattern = true;
			continue;
		}
		if (isEnvFile(token)) {
			return true;
		}
	}
	return false;
}

function checkSegment(segment: string[], cwd: string, depth = 0): string | null {
	for (let i = 0; i < segment.length; i++) {
		const token = segment[i];
		if ((token === ">" || token === ">>") && segment[i + 1] && isEnvFile(segment[i + 1] ?? "")) {
			return "Writing to .env directly is blocked; edit .env.example and tell the user which variable to copy.";
		}
	}

	const { env, argv } = stripEnvPrefix(segment);
	for (const assignment of env) {
		const reason = lefthookBypassReason(assignment);
		if (reason) {
			return reason;
		}
	}
	if (argv.length === 0) {
		return null;
	}

	const cmd = path.basename(argv[0] ?? "");

	if (cmd === "export" || cmd === "env") {
		const reason = lefthookBypassReason(argv[1] ?? "");
		if (reason) {
			return reason;
		}
	}

	if (cmd === "gh") {
		let i = 1;
		while (i < argv.length && (argv[i] ?? "").startsWith("-")) {
			const flag = argv[i] as string;
			i += GH_VALUE_FLAGS.has(flag) && !flag.includes("=") ? 2 : 1;
		}
		if (argv[i] === "pr" && argv[i + 1] === "merge") {
			return "gh pr merge is blocked; the user merges after review.";
		}
	}

	const drizzleIndex = argv.findIndex((t) => path.basename(t) === "drizzle-kit");
	if (drizzleIndex !== -1 && DRIZZLE_DESTRUCTIVE.has(argv[drizzleIndex + 1] ?? "")) {
		return `drizzle-kit ${argv[drizzleIndex + 1]} is blocked; migrations only (docs/adr/0048).`;
	}

	if (cmd === "git") {
		let i = 1;
		let gitDir = cwd;
		let subcommand = "";
		while (i < argv.length) {
			const token = argv[i];
			if (token === "-C") {
				const dir = argv[i + 1] ?? ".";
				gitDir = path.isAbsolute(dir) ? dir : path.resolve(gitDir, dir);
				i += 2;
				continue;
			}
			if (token === "-c") {
				if (/^core\.hookspath\s*=/i.test(argv[i + 1] ?? "")) {
					return "git -c core.hooksPath=... is blocked; it replaces the committed hooks (docs/adr/0048).";
				}
				i += 2;
				continue;
			}
			if (token?.startsWith("-")) {
				i += 1;
				continue;
			}
			subcommand = token ?? "";
			break;
		}
		const rest = argv.slice(i);

		if (rest.includes("--no-verify")) {
			return "--no-verify is blocked on every git command (docs/adr/0048).";
		}
		if (subcommand === "commit" && commitShortNoVerify(rest.slice(1))) {
			return "-n (--no-verify) is blocked on git commit (docs/adr/0048).";
		}
		if (subcommand === "push") {
			const pushCheck = checkGitPush(rest.slice(1), gitDir);
			if (pushCheck) {
				return pushCheck;
			}
		}
		if (subcommand === "config" && rest.slice(1).some((t) => /^core\.hookspath$/i.test(t))) {
			return "git config core.hooksPath is blocked; it replaces the committed hooks (docs/adr/0048).";
		}
	}

	if (GREP_LIKE.has(cmd) && grepTargetsEnv(argv.slice(1))) {
		return "Reading or writing .env directly is blocked; use .env.example.";
	}

	if ((ENV_ARG_COMMANDS.has(cmd) || cmd === ".") && argv.slice(1).some((t) => isEnvFile(t))) {
		return "Reading or writing .env directly is blocked; use .env.example.";
	}

	if (SHELLS_WITH_C.has(cmd) && argv[1] === "-c" && typeof argv[2] === "string" && depth < 5) {
		return findViolation(argv[2], cwd, depth + 1);
	}

	return null;
}

function findViolation(command: string, cwd: string, depth = 0): string | null {
	for (const segment of splitSegments(tokenize(stripHeredocs(command)))) {
		const reason = checkSegment(segment, cwd, depth);
		if (reason) {
			return reason;
		}
	}
	return null;
}

async function main(): Promise<void> {
	const input = await readStdinJson<PreToolUseInput>();
	if (input.tool_name !== "Bash") {
		return;
	}
	const reason = findViolation(input.tool_input?.command ?? "", input.cwd ?? process.cwd());
	if (reason) {
		block(reason);
	}
}

runHook("guard-bash", main);
