import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useIsDesktop } from "@/lib/useIsDesktop";
import { uuidV7 } from "@/lib/uuidV7";
import { organizationUnitsQueryOptions } from "../../account/api";
import { availableUnitsOf, useCreateProjectMutation } from "../api";
import { plural } from "../components/plural";
import {
	type NewProjectFormValues,
	newProjectFormSchema,
	validUnits,
} from "./newProjectForm";

const BACK_LINK =
	"-ml-1.5 flex min-h-(--tap-min) w-fit items-center gap-0.5 rounded-md pr-(--space-2) text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:shadow-(--shadow-focus) focus-visible:outline-none";

const FLAT_CARD =
	"max-md:gap-(--space-5) max-md:rounded-none max-md:bg-transparent max-md:py-0 max-md:ring-0";

function livres(count: number) {
	return `${count} ${plural(count, "livre", "livres")} na construtora.`;
}

function availableMessage(available: number) {
	const left = plural(
		available,
		"Agora só resta 1 unidade livre.",
		`Agora só restam ${available} unidades livres.`,
	);
	return `${left} Ajuste a reserva e tente de novo.`;
}

function HelpLine({
	loading,
	free,
	typed,
}: {
	loading: boolean;
	free: number | undefined;
	typed: string;
}) {
	if (loading) {
		return <Skeleton aria-hidden className="h-3.5 w-4/5 md:w-75" />;
	}
	if (free === undefined) return null;
	if (!validUnits(typed, free)) {
		return (
			<FieldDescription>
				{livres(free)} Dá para ajustar depois.
			</FieldDescription>
		);
	}
	const left = free - Number(typed);
	return (
		<FieldDescription>
			{livres(free)} Depois de criar,{" "}
			{plural(left, `sobra ${left}`, `sobram ${left}`)}.
		</FieldDescription>
	);
}

export function NewProjectPage() {
	const desktop = useIsDesktop();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const units = useQuery(organizationUnitsQueryOptions);
	const create = useCreateProjectMutation();
	const [projectId] = useState(uuidV7);
	const sending = useRef(false);

	const free = units.data?.free;
	const exhausted = free === 0;

	const {
		control,
		register,
		handleSubmit,
		setError,
		watch,
		formState: { errors },
	} = useForm<NewProjectFormValues>({
		resolver: zodResolver(newProjectFormSchema(free)),
		defaultValues: { name: "", units: "" },
	});
	const typed = watch("units");
	const disabled = create.isPending || exhausted;

	function submit({ name, units: reserved }: NewProjectFormValues) {
		if (sending.current) return;
		sending.current = true;
		create.mutate(
			{ id: projectId, name, units: Number(reserved) },
			{
				onSuccess: (created) => {
					toast.success(`Obra “${created.name}” criada.`);
					void navigate({
						to: "/projects/$projectId/configuration",
						params: { projectId: created.id },
					});
				},
				onError: (error) => {
					const available = availableUnitsOf(error);
					if (available === undefined) return;
					queryClient.setQueryData(
						organizationUnitsQueryOptions.queryKey,
						(old) => old && { ...old, free: available },
					);
					void queryClient.invalidateQueries(organizationUnitsQueryOptions);
					if (available > 0) {
						setError("units", { message: availableMessage(available) });
					}
				},
				onSettled: () => {
					sending.current = false;
				},
			},
		);
	}

	return (
		<main className="mx-auto grid w-full max-w-(--content-max) flex-1 content-start gap-(--space-2) px-(--page-pad) pt-(--space-2) pb-(--space-10) md:gap-(--space-3) md:px-(--page-pad-desktop) md:pt-(--space-8) md:pb-(--space-12)">
			<Link
				to="/projects"
				activeOptions={{ exact: true }}
				className={BACK_LINK}
			>
				<ChevronLeft className="size-5" aria-hidden="true" />
				Obras
			</Link>
			<Card className={FLAT_CARD}>
				<form
					noValidate
					className="grid gap-(--space-5) md:px-(--card-spacing)"
					onSubmit={handleSubmit(submit)}
				>
					<h1 className="text-[1.75rem] leading-[1.15] font-semibold tracking-tight">
						Nova obra
					</h1>
					{exhausted && (
						<Alert variant="destructive">
							<AlertDescription>
								{units.data && units.data.reclaimable > 0
									? "Nenhuma unidade livre para uma obra nova. Baixe a reserva de outra obra ou fale com a BluPrint."
									: "Nenhuma unidade livre para uma obra nova. Fale com a BluPrint."}
							</AlertDescription>
						</Alert>
					)}
					{create.isError && availableUnitsOf(create.error) === undefined && (
						<Alert variant="destructive">
							<AlertDescription>
								Não foi possível criar a obra. Confira sua conexão e tente de
								novo.
							</AlertDescription>
						</Alert>
					)}
					<div className="grid gap-(--form-gap)">
						<Field data-invalid={!!errors.name}>
							<FieldLabel htmlFor="project-name">Nome da obra</FieldLabel>
							<Input
								id="project-name"
								autoComplete="off"
								autoFocus={desktop}
								enterKeyHint="next"
								placeholder="Ex.: Casa Moinhos"
								disabled={disabled}
								aria-invalid={!!errors.name}
								{...register("name", { onChange: () => create.reset() })}
							/>
							{errors.name && <FieldError errors={[errors.name]} />}
						</Field>
						<Field data-invalid={!!errors.units}>
							<FieldLabel htmlFor="project-units">
								Unidades reservadas
							</FieldLabel>
							<Controller
								control={control}
								name="units"
								render={({ field }) => (
									<Input
										id="project-units"
										inputMode="numeric"
										autoComplete="off"
										enterKeyHint="done"
										disabled={disabled}
										aria-invalid={!!errors.units}
										name={field.name}
										ref={field.ref}
										onBlur={field.onBlur}
										value={field.value}
										onChange={(event) => {
											create.reset();
											field.onChange(event.target.value.replace(/\D/g, ""));
										}}
									/>
								)}
							/>
							{errors.units ? (
								<FieldError errors={[errors.units]} />
							) : (
								!exhausted && (
									<HelpLine
										loading={units.isPending}
										free={free}
										typed={typed}
									/>
								)
							)}
						</Field>
					</div>
					<Button
						type="submit"
						size="lg"
						className="w-full"
						disabled={disabled}
					>
						{create.isPending && <Spinner aria-hidden />}
						{create.isPending ? "Criando obra…" : "Criar obra"}
					</Button>
				</form>
			</Card>
		</main>
	);
}
