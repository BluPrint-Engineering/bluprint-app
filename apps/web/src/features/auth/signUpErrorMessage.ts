export const EMAIL_TAKEN_CODE = "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL";

export const PASSWORD_TOO_SHORT_MESSAGE =
	"A senha precisa de pelo menos 8 caracteres.";

export const PASSWORD_TOO_LONG_MESSAGE =
	"A senha pode ter no máximo 128 caracteres.";

/** Translates authClient's flat `error.code`, as `signInErrorMessage` does; `SELF_SIGNUP_DISABLED` falls to the generic sentence (ADR 0011). */
export function signUpErrorMessage(code: string | undefined): string {
	switch (code) {
		case EMAIL_TAKEN_CODE:
			return "Já existe uma conta com este e-mail.";
		case "PASSWORD_TOO_SHORT":
			return PASSWORD_TOO_SHORT_MESSAGE;
		case "PASSWORD_TOO_LONG":
			return PASSWORD_TOO_LONG_MESSAGE;
		case "TOO_MANY_REQUESTS":
			return "Muitas tentativas seguidas. Aguarde um minuto e tente de novo.";
		default:
			return "Não foi possível criar a conta agora. Tente de novo mais tarde.";
	}
}
