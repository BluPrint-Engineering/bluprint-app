export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;

export const PASSWORD_TOO_GUESSABLE_CODE = "PASSWORD_TOO_GUESSABLE";

const PRODUCT_WORDS = ["bluprint", "blueprint"];

// compared after a tail of digits and symbols is cut, so "senha123" and "Password2024!" match too
const COMMON_BASES = new Set([
	"abc",
	"abcd",
	"abcdef",
	"admin",
	"amor",
	"asdf",
	"asdfgh",
	"asdfghjkl",
	"batman",
	"botafogo",
	"brasil",
	"construtora",
	"corinthians",
	"cruzeiro",
	"deus",
	"dragon",
	"engenharia",
	"familia",
	"flamengo",
	"football",
	"gremio",
	"iloveyou",
	"jesus",
	"letmein",
	"master",
	"minhasenha",
	"monkey",
	"mudar",
	"obra",
	"palmeiras",
	"password",
	"princess",
	"qwer",
	"qwerty",
	"qwertyuiop",
	"santos",
	"saopaulo",
	"senha",
	"senhasenha",
	"sunshine",
	"superman",
	"teste",
	"trocar",
	"vasco",
	"welcome",
	"zxcvbnm",
]);

const LEET: Record<string, string> = {
	"0": "o",
	"1": "i",
	"3": "e",
	"4": "a",
	"5": "s",
	"7": "t",
	"@": "a",
	$: "s",
};

const MIN_CONTEXT_WORD_LENGTH = 4;

function fold(text: string): string {
	return text
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase();
}

function unleet(text: string): string {
	return text.replace(/[013457@$]/g, (char) => LEET[char] ?? char);
}

function basesOf(folded: string): string[] {
	const bases: string[] = [];
	for (let end = folded.length; end > 0; end--) {
		if (/\p{L}/u.test(folded.slice(end))) break;
		bases.push(folded.slice(0, end));
	}
	return bases;
}

function isRepeatedPattern(chars: string[]): boolean {
	for (let unit = 1; unit <= chars.length / 2; unit++) {
		const pattern = chars.slice(0, unit).join("");
		if (
			chars.length % unit === 0 &&
			pattern.repeat(chars.length / unit) === chars.join("")
		) {
			return true;
		}
	}
	return false;
}

function longestRunLength(chars: string[]): number {
	let longest = 1;
	let run = 1;
	let previousStep: number | undefined;
	for (let index = 1; index < chars.length; index++) {
		const step =
			(chars[index]?.charCodeAt(0) ?? 0) -
			(chars[index - 1]?.charCodeAt(0) ?? 0);
		const isRunStep = Math.abs(step) <= 1;
		if (isRunStep && (run === 1 || step === previousStep)) {
			run += 1;
		} else {
			// a run step in a new direction starts a fresh run with the previous character
			run = isRunStep ? 2 : 1;
		}
		previousStep = step;
		longest = Math.max(longest, run);
	}
	return longest;
}

function isRepeatedOrSequential(password: string): boolean {
	const chars = [...password];
	return (
		isRepeatedPattern(chars) ||
		chars.length - longestRunLength(chars) < MIN_CONTEXT_WORD_LENGTH
	);
}

export interface PasswordContext {
	name?: string | undefined;
	email?: string | undefined;
}

function contextWords(context: PasswordContext): string[] {
	const localPart = fold(context.email ?? "").split("@")[0] ?? "";
	const pieces = [
		...fold(context.name ?? "").split(/[^a-z]+/),
		localPart,
		...localPart.split(/[^a-z0-9]+/),
	];
	return [...PRODUCT_WORDS, ...pieces]
		.map((piece) => unleet(piece).replace(/[^a-z]/g, ""))
		.filter((piece) => piece.length >= MIN_CONTEXT_WORD_LENGTH);
}

function isBuiltOnContextWord(folded: string, word: string): boolean {
	const kept = [...folded].filter((char) => /[a-z]/.test(char) || char in LEET);
	const readable = unleet(kept.join(""));
	const consumed = new Array<boolean>(kept.length).fill(false);
	let found = false;
	for (
		let at = readable.indexOf(word);
		at !== -1;
		at = readable.indexOf(word, at + word.length)
	) {
		found = true;
		consumed.fill(true, at, at + word.length);
	}
	const otherLetters = kept.filter(
		(char, index) => !consumed[index] && /[a-z]/.test(char),
	).length;
	return found && otherLetters < MIN_CONTEXT_WORD_LENGTH;
}

/** False outside 8–64 characters: the length check refuses those, and the bound keeps this quadratic scan cheap on hostile input. */
export function isGuessablePassword(
	password: string,
	context: PasswordContext = {},
): boolean {
	if (
		password.length < PASSWORD_MIN_LENGTH ||
		password.length > PASSWORD_MAX_LENGTH
	) {
		return false;
	}

	const folded = fold(password);
	if (isRepeatedOrSequential(folded)) return true;

	if (
		basesOf(folded).some(
			(base) => COMMON_BASES.has(base) || COMMON_BASES.has(unleet(base)),
		)
	) {
		return true;
	}

	return contextWords(context).some((word) =>
		isBuiltOnContextWord(folded, word),
	);
}
