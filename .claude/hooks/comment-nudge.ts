#!/usr/bin/env bun
// PostToolUse nudge for Edit/Write outside test files (ADR 0048, ADR 0057).
import { bullets, commentsAddedBy, type EditOrWriteInput, isRelevantFile, isTestFile } from "./comments";
import { readStdinJson, runHook } from "./lib";

const NUDGE =
	"Per .claude/rules/code-comments.md, the default is no comment. Keep one only if it states a hidden hazard, a unit or precondition no name or type can carry, or a workaround and its source. Delete every other one.";

const POINTER_NUDGE =
	"Per .claude/rules/code-comments.md: a pointer alone says nothing. State the hazard in the comment and cite the ADR as a suffix, e.g. (ADR 0013); or delete it.";

// A comment whose whole content is `docs/adr/...` or `ADR nnnn`, optionally prefixed by "see".
const BARE_ADR_POINTER = /^(?:see\s+)?\(?(?:docs\/adr\/\S+?|ADR\s*\d{4})\)?\.?$/i;

function isBareAdrPointer(comment: string): boolean {
	const content = comment
		.replace(/^\/\/|^\/\*+|\*+\/$/g, "")
		.replace(/^\s*\*/gm, "")
		.trim();
	return BARE_ADR_POINTER.test(content);
}

function emit(comments: string[]): void {
	if (comments.length === 0) {
		return;
	}
	const pointers = comments.filter(isBareAdrPointer);
	const others = comments.filter((c) => !isBareAdrPointer(c));
	const sections: string[] = [];
	if (pointers.length > 0) {
		sections.push(`ADR pointers added by this edit:\n${bullets(pointers)}\n\n${POINTER_NUDGE}`);
	}
	if (others.length > 0) {
		sections.push(`Comments added by this edit:\n${bullets(others)}\n\n${NUDGE}`);
	}
	console.log(
		JSON.stringify({
			hookSpecificOutput: {
				hookEventName: "PostToolUse",
				additionalContext: sections.join("\n\n"),
			},
		}),
	);
}

async function main(): Promise<void> {
	const input = await readStdinJson<EditOrWriteInput>();
	const filePath = input.tool_input?.file_path;
	if (!filePath || !isRelevantFile(filePath) || isTestFile(filePath)) {
		return;
	}
	emit(await commentsAddedBy(input, filePath, "post"));
}

runHook("comment-nudge", main);
