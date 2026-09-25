#!/usr/bin/env bun
// PreToolUse guard for Read/Edit/Write/Grep/Glob (ADR 0048).
import { block, isEnvFile, readStdinJson, runHook } from "./lib";

interface PreToolUseInput {
	tool_name?: string;
	tool_input?: { file_path?: string; path?: string; pattern?: string; glob?: string };
}

// Grep's `pattern` is a search string, not a file, so it's never checked — only `path`/`glob` name files.
function candidates(input: PreToolUseInput): (string | undefined)[] {
	const ti = input.tool_input ?? {};
	if (input.tool_name === "Grep") {
		return [ti.path, ti.glob];
	}
	return [ti.file_path, ti.path, ti.pattern];
}

async function main(): Promise<void> {
	const input = await readStdinJson<PreToolUseInput>();
	if (candidates(input).some((c) => c && isEnvFile(c))) {
		block(
			"Reading, editing or writing .env is blocked; use .env.example and tell the user which variable to copy.",
		);
	}
}

runHook("guard-env", main);
