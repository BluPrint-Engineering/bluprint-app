import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth";
import { authCardClassName } from "./components/AuthShell";
import { PasswordInput } from "./components/PasswordInput";
import {
	EMAIL_TAKEN_CODE,
	PASSWORD_TOO_LONG_MESSAGE,
	PASSWORD_TOO_SHORT_MESSAGE,
	signUpErrorMessage,
} from "./signUpErrorMessage";

const signupFormSchema = z.object({
	name: z.string().trim().min(3, "Informe o seu nome completo."),
	email: z.email("Informe um e-mail válido."),
	// Better Auth's own bounds, so the server never rejects what the form accepted
	password: z
		.string()
		.min(8, PASSWORD_TOO_SHORT_MESSAGE)
		.max(128, PASSWORD_TOO_LONG_MESSAGE),
	acceptTerms: z
		.boolean()
		.refine((accepted) => accepted, "Aceite os termos para continuar."),
});
type SignupFormValues = z.infer<typeof signupFormSchema>;

export function SignupPage({ onSuccess }: { onSuccess: () => void }) {
	const [apiError, setApiError] = useState<{
		code: string | undefined;
	} | null>(null);
	const {
		register,
		control,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<SignupFormValues>({
		resolver: zodResolver(signupFormSchema),
		defaultValues: { name: "", email: "", password: "", acceptTerms: false },
	});

	async function onSubmit(values: SignupFormValues) {
		setApiError(null);
		try {
			const { error } = await authClient.signUp.email({
				name: values.name,
				email: values.email,
				password: values.password,
			});
			if (error) {
				setApiError({ code: error.code });
				return;
			}
			onSuccess();
		} catch {
			setApiError({ code: undefined });
		}
	}

	return (
		<Card className={authCardClassName}>
			<CardHeader>
				<CardTitle className="text-2xl">Criar conta</CardTitle>
				<CardDescription>
					Sua conta é única. O papel em cada obra vem do convite.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form
					onSubmit={handleSubmit(onSubmit)}
					noValidate
					className="grid gap-(--form-gap)"
				>
					{apiError && (
						<Alert variant="destructive">
							<AlertTitle>Não foi possível criar a conta</AlertTitle>
							<AlertDescription>
								<p>
									{signUpErrorMessage(apiError.code)}
									{apiError.code === EMAIL_TAKEN_CODE && (
										<>
											{" "}
											<Link to="/login" className="font-medium underline">
												Entrar
											</Link>
										</>
									)}
								</p>
							</AlertDescription>
						</Alert>
					)}
					<Field data-invalid={!!errors.name}>
						<FieldLabel htmlFor="name">Nome completo</FieldLabel>
						<Input
							id="name"
							autoComplete="name"
							enterKeyHint="next"
							placeholder="Como aparece nos relatórios"
							aria-invalid={!!errors.name}
							{...register("name")}
						/>
						{errors.name && <FieldError errors={[errors.name]} />}
					</Field>
					<Field data-invalid={!!errors.email}>
						<FieldLabel htmlFor="email">E-mail</FieldLabel>
						<Input
							id="email"
							type="email"
							inputMode="email"
							autoComplete="email"
							enterKeyHint="next"
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
							autoComplete="new-password"
							enterKeyHint="go"
							aria-invalid={!!errors.password}
							aria-describedby={
								errors.password ? "password-error" : "password-hint"
							}
							{...register("password")}
						/>
						{errors.password ? (
							<FieldError id="password-error" errors={[errors.password]} />
						) : (
							<FieldDescription id="password-hint">
								Mínimo de 8 caracteres
							</FieldDescription>
						)}
					</Field>
					<Field data-invalid={!!errors.acceptTerms}>
						<div className="flex items-center gap-(--space-3)">
							{/* TODO(#86): link the terms text, open its modal and record the acceptance on the server */}
							<Controller
								control={control}
								name="acceptTerms"
								render={({ field }) => (
									<Checkbox
										id="acceptTerms"
										ref={field.ref}
										name={field.name}
										checked={field.value}
										onCheckedChange={(checked) =>
											field.onChange(checked === true)
										}
										onBlur={field.onBlur}
										aria-invalid={!!errors.acceptTerms}
									/>
								)}
							/>
							<FieldLabel htmlFor="acceptTerms" className="font-normal">
								Aceito os termos de uso e a política de privacidade
							</FieldLabel>
						</div>
						{errors.acceptTerms && <FieldError errors={[errors.acceptTerms]} />}
					</Field>
					<Button
						type="submit"
						size="lg"
						className="w-full"
						disabled={isSubmitting}
					>
						{isSubmitting ? "Criando conta…" : "Criar conta"}
					</Button>
				</form>
			</CardContent>
			<CardFooter className="justify-center gap-(--space-2) text-sm">
				<span className="text-muted-foreground">Já tem conta?</span>
				<Button variant="link" asChild>
					<Link to="/login">Entrar</Link>
				</Button>
			</CardFooter>
		</Card>
	);
}
