#!/usr/bin/env bun
import { readFileSync } from "node:fs";
import { addedComments, gitBaselines, isRelevantFile } from "./comments";
import { block, readStdinJson, runHook } from "./lib";

interface EditWriteInput {
	cwd?: string;
	tool_input?: {
		file_path?: string;
		old_string?: string;
		new_string?: string;
		replace_all?: boolean;
		content?: string;
	};
}

const DENIAL =
	"No comments in tests, and no JSDoc on a component or a prop (.claude/rules/code-comments.md, ADR 0057). Make the edit again without them; what they say belongs in a name, a type or the test's name.";

function readDisk(filePath: string): string | null {
	try {
		return readFileSync(filePath, "utf8");
	} catch {
		return null;
	}
}

// String.replace would expand `$&` and friends in `replacement`.
function applyEdit(text: string, search: string, replacement: string, all: boolean): string {
	if (all) {
		return text.split(search).join(replacement);
	}
	const index = text.indexOf(search);
	return index === -1 ? text : text.slice(0, index) + replacement + text.slice(index + search.length);
}

async function main(): Promise<void> {
	const { cwd = process.cwd(), tool_input: input } = await readStdinJson<EditWriteInput>();
	const filePath = input?.file_path;
	if (!filePath || !isRelevantFile(filePath)) {
		return;
	}

	const onDisk = readDisk(filePath);
	let newText: string;
	let baselines: string[];
	if (input?.content !== undefined) {
		newText = input.content;
		baselines = [...gitBaselines(cwd, filePath), ...(onDisk === null ? [] : [onDisk])];
	} else {
		if (onDisk === null) {
			return;
		}
		newText = applyEdit(onDisk, input?.old_string ?? "", input?.new_string ?? "", input?.replace_all === true);
		baselines = [onDisk];
	}

	const banned = (await addedComments(cwd, filePath, baselines, newText)).filter((c) => c.ban);
	if (banned.length > 0) {
		block(`${banned.map((c) => `- (${c.ban}) ${c.text.trim()}`).join("\n")}\n\n${DENIAL}`);
	}
}

runHook("comment-guard", main);
