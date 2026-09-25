import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth";
import { authCardClassName } from "./components/AuthShell";
import { PasswordInput } from "./components/PasswordInput";
import { signInErrorMessage } from "./signInErrorMessage";

const loginFormSchema = z.object({
	email: z.email("Informe um e-mail válido."),
	password: z.string().min(1, "Informe a sua senha."),
});
type LoginFormValues = z.infer<typeof loginFormSchema>;

export function LoginPage({ onSuccess }: { onSuccess: () => void }) {
	const [apiError, setApiError] = useState<string | null>(null);
	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<LoginFormValues>({
		resolver: zodResolver(loginFormSchema),
		defaultValues: { email: "", password: "" },
	});

	async function onSubmit(values: LoginFormValues) {
		setApiError(null);
		try {
			// never rememberMe: false, or the cookie demotes to a browser-session one (ADR 0010)
			const { error } = await authClient.signIn.email({
				email: values.email,
				password: values.password,
			});
			if (error) {
				setApiError(signInErrorMessage(error.code));
				return;
			}
			onSuccess();
		} catch {
			setApiError(signInErrorMessage(undefined));
		}
	}

	return (
		<Card className={authCardClassName}>
			<CardHeader>
				<CardTitle>Entrar</CardTitle>
				<CardDescription>Entre com seu e-mail e senha.</CardDescription>
			</CardHeader>
			<CardContent>
				<form
					onSubmit={handleSubmit(onSubmit)}
					noValidate
					className="grid gap-(--form-gap)"
				>
					{apiError && (
						<Alert variant="destructive">
							<AlertTitle>Não foi possível entrar</AlertTitle>
							<AlertDescription>{apiError}</AlertDescription>
						</Alert>
					)}
					<Field data-invalid={!!errors.email}>
						<FieldLabel htmlFor="email">E-mail</FieldLabel>
						<Input
							id="email"
							type="email"
							inputMode="email"
							autoComplete="email"
							placeholder="voce@construtora.com.br"
							aria-invalid={!!errors.email}
							{...register("email")}
						/>
						{errors.email && <FieldError errors={[errors.email]} />}
					</Field>
					<Field data-invalid={!!errors.password}>
						<FieldLabel htmlFor="password">Senha</FieldLabel>
						<PasswordInput
							id="password"
							autoComplete="current-password"
							placeholder="Sua senha"
							aria-invalid={!!errors.password}
							{...register("password")}
						/>
						{errors.password && <FieldError errors={[errors.password]} />}
					</Field>
					<Button
						type="submit"
						size="lg"
						className="w-full"
						disabled={isSubmitting}
					>
						{isSubmitting ? "Entrando…" : "Entrar"}
					</Button>
				</form>
			</CardContent>
			{/* accounts only exist through an invitation, so there is no signup link here (RF-106, RF-130) */}
			<CardFooter className="justify-center text-center text-sm text-pretty text-muted-foreground">
				Não tem conta? O acesso é por convite da sua construtora.
			</CardFooter>
		</Card>
	);
}
