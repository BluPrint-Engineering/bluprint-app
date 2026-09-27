import {
	PASSWORD_MAX_LENGTH,
	PASSWORD_MIN_LENGTH,
	PASSWORD_TOO_GUESSABLE_CODE,
} from "@bluprint/shared";

export const EMAIL_TAKEN_CODE = "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL";

export const PASSWORD_TOO_SHORT_MESSAGE = `A senha precisa de pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`;

export const PASSWORD_TOO_LONG_MESSAGE = `A senha pode ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.`;

export const PASSWORD_TOO_GUESSABLE_MESSAGE =
	"Essa senha é fácil de adivinhar. Evite senhas comuns, sequências e o seu nome ou e-mail.";

/** Translates authClient's flat `error.code`, as `signInErrorMessage` does; `SELF_SIGNUP_DISABLED` falls to the generic sentence (ADR 0011). */
export function signUpErrorMessage(code: string | undefined): string {
	switch (code) {
		case EMAIL_TAKEN_CODE:
			return "Já existe uma conta com este e-mail.";
		case "PASSWORD_TOO_SHORT":
			return PASSWORD_TOO_SHORT_MESSAGE;
		case "PASSWORD_TOO_LONG":
			return PASSWORD_TOO_LONG_MESSAGE;
		case PASSWORD_TOO_GUESSABLE_CODE:
			return PASSWORD_TOO_GUESSABLE_MESSAGE;
		case "PASSWORD_COMPROMISED":
			return "Essa senha já apareceu em vazamentos de outros sites. Escolha outra.";
		case "TOO_MANY_REQUESTS":
			return "Muitas tentativas seguidas. Aguarde um minuto e tente de novo.";
		default:
			return "Não foi possível criar a conta agora. Tente de novo mais tarde.";
	}
}
