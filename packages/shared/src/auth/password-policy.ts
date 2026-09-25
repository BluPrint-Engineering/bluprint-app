/** Better Auth's own bounds are configured from these, so the form and the server agree (ADR 0052). */
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

// shorter than this, a name piece ("ana") matches too much, and a leftover is only dressing
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

/** Every prefix left after cutting a letter-free tail: "s3nh@123" yields "s3nh@" as well as "s3nh". */
function basesOf(folded: string): string[] {
	const bases: string[] = [];
	for (let end = folded.length; end > 0; end--) {
		if (/\p{L}/u.test(folded.slice(end))) break;
		bases.push(folded.slice(0, end));
	}
	return bases;
}

function isRepeatedOrSequential(password: string): boolean {
	const chars = [...password];
	for (let unit = 1; unit <= chars.length / 2; unit++) {
		if (
			chars.length % unit === 0 &&
			password ===
				chars
					.slice(0, unit)
					.join("")
					.repeat(chars.length / unit)
		) {
			return true;
		}
	}

	// one run of a repeated or consecutive character, with fewer than 4 others around it: "abcdefg1"
	let longestRun = 1;
	let run = 1;
	let previousStep: number | undefined;
	for (let index = 1; index < chars.length; index++) {
		const step =
			(chars[index]?.charCodeAt(0) ?? 0) -
			(chars[index - 1]?.charCodeAt(0) ?? 0);
		const continues =
			Math.abs(step) <= 1 && (run === 1 || step === previousStep);
		run = continues ? run + 1 : Math.abs(step) <= 1 ? 2 : 1;
		previousStep = step;
		longestRun = Math.max(longestRun, run);
	}
	return chars.length - longestRun < MIN_CONTEXT_WORD_LENGTH;
}

/** Who the password belongs to; either half may be unknown, as on a password reset. */
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

/**
 * True when a context word, read through leetspeak and separators, covers all but fewer than 4 of
 * the password's real letters: "Blupr1nt-2026" and "SilvaSilva" do, "rosa-dos-ventos-azul" doesn't.
 */
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

/**
 * The blocklist half of NIST SP 800-63B: a common password, a repeated or sequential run, or one
 * whose core is the product's name or the person's own name or e-mail — a passphrase that merely
 * contains one ("rosa-dos-ventos-azul" for Maria Rosa) passes. Outside 8–64 characters it returns
 * false and leaves the refusal to the length check, which also keeps this quadratic scan bounded
 * on hostile input. The breach lookup is the API's alone (ADR 0052).
 */
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
