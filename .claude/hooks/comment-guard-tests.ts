#!/usr/bin/env bun
import { bullets, commentsAddedBy, type EditOrWriteInput, isRelevantFile, isTestFile } from "./comments";
import { block, readStdinJson, runHook } from "./lib";

const TOOL_DIRECTIVE =
	/^(?:biome-ignore|eslint-(?:disable|enable)|@ts-(?:expect-error|nocheck)|prettier-ignore|(?:istanbul|v8|c8) ignore|TODO\(#\d+\))/;

function isToolDirective(comment: string): boolean {
	if (/^\/\/\/\s*<reference\b/.test(comment)) {
		return true;
	}
	const content = comment
		.replace(/^\/\/|^\/\*+|\*+\/$/g, "")
		.replace(/^\s*\*/gm, "")
		.trim();
	return TOOL_DIRECTIVE.test(content);
}

async function main(): Promise<void> {
	const input = await readStdinJson<EditOrWriteInput>();
	const filePath = input.tool_input?.file_path;
	if (!filePath || !isRelevantFile(filePath) || !isTestFile(filePath)) {
		return;
	}
	const refused = (await commentsAddedBy(input, filePath, "pre")).filter((c) => !isToolDirective(c));
	if (refused.length > 0) {
		block(
			`Refused: test files carry no comments (.claude/rules/code-comments.md, ADR 0057). This edit adds:\n${bullets(refused)}\n\nSay it in the test's name, a describe block or a named helper, and resend the edit without them.`,
		);
	}
}

runHook("comment-guard-tests", main);
