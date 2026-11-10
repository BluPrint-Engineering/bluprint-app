import type { ProjectSummary } from "@bluprint/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useClearSessionDraft, useSessionDraft } from "@/features/auth";
import { useRenameProjectMutation } from "../api";
import {
	type ProjectNameFormValues,
	projectNameFormSchema,
} from "../components/projectNameForm";

interface RenameProjectFormProps {
	project: ProjectSummary;
	onDone: () => void;
}

export function RenameProjectForm({ project, onDone }: RenameProjectFormProps) {
	const rename = useRenameProjectMutation(project.id);
	const restored = useSessionDraft("rename-project", (variables) =>
		typeof variables === "string" ? variables : undefined,
	);
	const clearDraft = useClearSessionDraft();
	const {
		register,
		handleSubmit,
		setFocus,
		formState: { errors },
	} = useForm<ProjectNameFormValues>({
		resolver: zodResolver(projectNameFormSchema),
		defaultValues: { name: restored ?? project.name },
	});

	useEffect(() => {
		setFocus("name", { shouldSelect: true });
	}, [setFocus]);

	function finish() {
		clearDraft();
		onDone();
	}

	return (
		<form
			noValidate
			className="grid gap-(--space-3)"
			onSubmit={handleSubmit(({ name }) =>
				rename.mutate(name, { onSuccess: finish }),
			)}
			onKeyDown={(event) => {
				if (event.key === "Escape" && !rename.isPending) finish();
			}}
		>
			{rename.isError && (
				<Alert variant="destructive">
					<AlertDescription>
						Não foi possível salvar o nome. Confira sua conexão e tente de novo.
					</AlertDescription>
				</Alert>
			)}
			<Field data-invalid={!!errors.name}>
				<FieldLabel htmlFor="project-name">Nome da obra</FieldLabel>
				<Input
					id="project-name"
					autoComplete="off"
					enterKeyHint="done"
					placeholder="Ex.: Casa Moinhos"
					disabled={rename.isPending}
					aria-invalid={!!errors.name}
					{...register("name")}
				/>
				{errors.name && <FieldError errors={[errors.name]} />}
			</Field>
			<div className="flex flex-wrap gap-(--space-2) max-md:*:flex-1">
				<Button type="submit" disabled={rename.isPending}>
					{rename.isPending && <Spinner aria-hidden />}
					{rename.isPending ? "Salvando…" : "Salvar"}
				</Button>
				<Button
					type="button"
					variant="outline"
					disabled={rename.isPending}
					onClick={finish}
				>
					Cancelar
				</Button>
			</div>
		</form>
	);
}
