import {
	MAX_LOCATIONS_PER_REQUEST,
	type ProjectSummary,
} from "@bluprint/shared";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useBottomBarHeight } from "@/lib/useBottomBarHeight";
import { useIsDesktop } from "@/lib/useIsDesktop";
import { cn } from "@/lib/utils";
import { uuidV7 } from "@/lib/uuidV7";
import { availableUnitsOf } from "../../projects/api";
import {
	namesTakenOf,
	projectUnitsQueryOptions,
	useCreateStructureMutation,
} from "../api";
import { buildPlan } from "./buildPlan";
import { CommonAreasStep } from "./CommonAreasStep";
import { PreviewSummary, PreviewTowers, type UnitsLine } from "./Preview";
import {
	createdToast,
	nameTakenText,
	overReserveText,
	planLine,
} from "./reserveText";
import { TowersStep } from "./TowersStep";
import {
	type DraftErrors,
	firstInvalidField,
	initialDraft,
	validateDraft,
	type WizardDraft,
} from "./wizardDraft";

const STEP_TITLES = ["Torres e andares", "Áreas comuns", "Prévia"] as const;
const LAST_STEP = STEP_TITLES.length - 1;
const BLOCKER_ID = "wizard-blocker";

const identity = (key: string) => key;

function StepHeading({
	number,
	title,
	description,
}: {
	number: number;
	title: string;
	description?: string;
}) {
	return (
		<div className="grid gap-(--space-1)">
			<div className="flex items-center gap-(--space-2)">
				<span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
					{number}
				</span>
				<h2 className="text-lg font-semibold tracking-tight">{title}</h2>
			</div>
			{description && (
				<p className="text-sm text-pretty text-muted-foreground">
					{description}
				</p>
			)}
		</div>
	);
}

function Section({
	number,
	title,
	description,
	desktop,
	children,
}: {
	number: number;
	title: string;
	description?: string;
	desktop: boolean;
	children: React.ReactNode;
}) {
	return (
		<section
			aria-label={title}
			className={cn(
				"scroll-mt-22 grid gap-(--space-4)",
				desktop && "rounded-xl bg-card p-(--space-6) shadow-(--ring-hairline)",
			)}
		>
			<StepHeading
				number={number}
				title={title}
				{...(description && { description })}
			/>
			{children}
		</section>
	);
}

function MobileBar({ children }: { children: React.ReactNode }) {
	const bar = useRef<HTMLDivElement>(null);
	useBottomBarHeight(bar);
	return (
		<div
			ref={bar}
			className="fixed inset-x-0 bottom-0 z-30 grid gap-(--space-3) border-t border-border bg-background px-(--page-pad) pt-(--space-3) pb-[max(var(--space-3),env(safe-area-inset-bottom))]"
		>
			{children}
		</div>
	);
}

export function StructureWizard({ project }: { project: ProjectSummary }) {
	const desktop = useIsDesktop();
	const navigate = useNavigate();
	const create = useCreateStructureMutation(project.id);
	const units = useQuery(projectUnitsQueryOptions(project.id));
	const [draft, setDraft] = useState<WizardDraft>(initialDraft);
	const [errors, setErrors] = useState<DraftErrors>({});
	const [step, setStep] = useState(0);
	const [reveal, setReveal] = useState<string>();
	const ids = useRef(new Map<string, string>());
	const stepTop = useRef<HTMLDivElement>(null);

	const preview = useMemo(() => buildPlan(draft, identity), [draft]);
	const remaining = units.data?.remaining ?? availableUnitsOf(create.error);
	const admin = project.role === "admin";
	const over = remaining !== undefined && preview.counts.units > remaining;
	const tooLarge = preview.locations.length > MAX_LOCATIONS_PER_REQUEST;
	const blocked = over || tooLarge;

	useEffect(() => {
		if (reveal === undefined) return;
		const field = document.getElementById(reveal);
		field?.scrollIntoView?.({ block: "center" });
		field?.focus({ preventScroll: true });
		setReveal(undefined);
	}, [reveal]);

	useEffect(() => {
		if (step > 0) stepTop.current?.scrollIntoView?.();
	}, [step]);

	function edit(update: (draft: WizardDraft) => WizardDraft, touched?: string) {
		if (create.isPending) return;
		ids.current = new Map();
		create.reset();
		const next = update(draft);
		setDraft(next);
		setErrors((current) => {
			const found = validateDraft(next);
			return Object.fromEntries(
				Object.keys(current)
					.filter((key) => key !== touched && found[key] !== undefined)
					.map((key) => [key, found[key]]),
			);
		});
	}

	function idFor(key: string) {
		let id = ids.current.get(key);
		if (id === undefined) {
			id = uuidV7();
			ids.current.set(key, id);
		}
		return id;
	}

	function validate(): boolean {
		const found = validateDraft(draft);
		const first = firstInvalidField(draft, found);
		setErrors(found);
		if (first === undefined) return true;
		setStep(first.section === "towers" ? 0 : 1);
		setReveal(first.id);
		return false;
	}

	function submit() {
		if (create.isPending || blocked || !validate()) return;
		const { locations } = buildPlan(draft, idFor);
		create.mutate(
			{ locations },
			{
				onSuccess: ({ counts }) => {
					toast.success(createdToast(counts.towers, counts.units));
					void navigate({
						to: "/projects/$projectId",
						params: { projectId: project.id },
					});
				},
			},
		);
	}

	const unitsLine: UnitsLine = units.isPending
		? { state: "loading" }
		: remaining === undefined
			? { state: "unknown" }
			: {
					state: "ready",
					text: planLine(preview.counts.units, remaining, "criar"),
				};

	const names = namesTakenOf(create.error);
	const failed =
		create.isError &&
		names === undefined &&
		availableUnitsOf(create.error) === undefined;

	const blocker = blocked ? (
		<Alert variant="destructive" id={BLOCKER_ID}>
			<AlertDescription>
				{over && remaining !== undefined ? (
					<>
						{overReserveText(preview.counts.units, remaining, admin)}
						{admin && (
							<>
								{" "}
								<Link
									to="/projects/$projectId/configuration"
									params={{ projectId: project.id }}
									target="_blank"
									rel="noopener"
									className="relative after:absolute after:-inset-y-3 after:inset-x-0"
								>
									Alterar reserva
								</Link>
							</>
						)}
					</>
				) : (
					`Esta estrutura tem ${preview.locations.length.toLocaleString("pt-BR")} locais e o limite é ${MAX_LOCATIONS_PER_REQUEST.toLocaleString("pt-BR")} por vez. Reduza andares, unidades ou áreas comuns.`
				)}
			</AlertDescription>
		</Alert>
	) : null;

	const createButton = (
		<Button
			type="button"
			size="lg"
			className="w-full"
			disabled={create.isPending || blocked}
			aria-describedby={blocked ? BLOCKER_ID : undefined}
			onClick={submit}
		>
			{create.isPending ? (
				<Spinner aria-hidden />
			) : (
				<Check className="size-5" aria-hidden="true" />
			)}
			{create.isPending ? "Criando estrutura…" : "Criar estrutura"}
		</Button>
	);

	const failures = (
		<>
			{failed && (
				<Alert variant="destructive">
					<AlertDescription>
						Não foi possível criar a estrutura. Confira sua conexão e tente de
						novo. Nada foi salvo.
					</AlertDescription>
				</Alert>
			)}
			{names !== undefined && (
				<Alert variant="destructive">
					<AlertDescription>{nameTakenText(names)}</AlertDescription>
				</Alert>
			)}
		</>
	);

	const note = (
		<p className="text-sm text-muted-foreground">
			Nada é salvo antes de criar. Depois, tudo se ajusta na fachada.
		</p>
	);

	const towersStep = (
		<TowersStep draft={draft} errors={errors} edit={edit} desktop={desktop} />
	);
	const areasStep = (
		<CommonAreasStep draft={draft} errors={errors} edit={edit} />
	);

	if (desktop) {
		return (
			<div className="grid items-start gap-(--space-8) md:grid-cols-[minmax(0,1fr)_360px]">
				<div className="grid gap-(--space-5)">
					<Section
						number={1}
						title={STEP_TITLES[0]}
						description="Cada torre com o seu número de andares e de unidades. Uma torre nova começa igual à anterior."
						desktop
					>
						{towersStep}
					</Section>
					<Section
						number={2}
						title={STEP_TITLES[1]}
						description="O hall de cada andar já está no passo 1. Aqui entram as outras."
						desktop
					>
						{areasStep}
					</Section>
				</div>
				<aside
					aria-label="Prévia"
					className="sticky top-22 grid gap-(--space-4) rounded-xl bg-card p-(--space-5) shadow-(--ring-hairline)"
				>
					<h2 className="text-lg font-semibold tracking-tight">Prévia</h2>
					<PreviewSummary plan={preview} units={unitsLine} />
					{failures}
					{blocker}
					{createButton}
					{note}
					<div className="max-h-[max(180px,calc(100dvh-520px))] overflow-y-auto border-t border-border pt-(--space-4) pr-1">
						{!tooLarge && <PreviewTowers plan={preview} />}
					</div>
				</aside>
			</div>
		);
	}

	const content = [
		<Section
			key="towers"
			number={1}
			title={STEP_TITLES[0]}
			description="Cada torre com o seu número de andares e de unidades. Uma torre nova começa igual à anterior."
			desktop={false}
		>
			{towersStep}
		</Section>,
		<Section
			key="areas"
			number={2}
			title={STEP_TITLES[1]}
			description="O hall de cada andar já está no passo 1. Aqui entram as outras."
			desktop={false}
		>
			{areasStep}
		</Section>,
		<Section key="preview" number={3} title={STEP_TITLES[2]} desktop={false}>
			<PreviewSummary plan={preview} units={unitsLine} />
			{!tooLarge && <PreviewTowers plan={preview} />}
			{failures}
			{note}
		</Section>,
	][step];

	return (
		<div
			ref={stepTop}
			className="grid scroll-mt-4 gap-(--space-5) pb-(--bottom-bar-height)"
		>
			<div className="grid gap-(--space-2)">
				<span className="text-sm text-muted-foreground">
					Passo {step + 1} de {STEP_TITLES.length}
				</span>
				<div className="flex gap-1" aria-hidden="true">
					{STEP_TITLES.map((title, at) => (
						<span
							key={title}
							className={cn(
								"h-1 flex-1 rounded-full",
								at <= step ? "bg-primary" : "bg-border",
							)}
						/>
					))}
				</div>
			</div>
			{content}
			<MobileBar>
				{step === LAST_STEP && blocker}
				<div className="flex gap-(--space-2)">
					{step > 0 && (
						<Button
							type="button"
							variant="outline"
							size="lg"
							className="flex-1"
							disabled={create.isPending}
							onClick={() => setStep(step - 1)}
						>
							Voltar
						</Button>
					)}
					{step < LAST_STEP ? (
						<Button
							type="button"
							size="lg"
							className="flex-2"
							onClick={() => {
								if (step === 0 && !validate()) return;
								setStep(step + 1);
							}}
						>
							Continuar · {STEP_TITLES[step + 1]}
						</Button>
					) : (
						<div className="flex-2">{createButton}</div>
					)}
				</div>
			</MobileBar>
		</div>
	);
}
