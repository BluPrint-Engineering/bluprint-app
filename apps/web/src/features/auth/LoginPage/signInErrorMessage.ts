/** Translates authClient's flat `error.code` (not `ApiError.problem?.code`, see .claude/rules/web.md) into the pt-BR sentence the screen shows (ADR 0047). */
export function signInErrorMessage(code: string | undefined): string {
	switch (code) {
		case "INVALID_EMAIL_OR_PASSWORD":
			return "E-mail ou senha incorretos.";
		case "TOO_MANY_REQUESTS":
			return "Muitas tentativas seguidas. Aguarde um minuto e tente de novo.";
		default:
			return "Não foi possível entrar agora. Verifique sua conexão e tente de novo.";
	}
}
