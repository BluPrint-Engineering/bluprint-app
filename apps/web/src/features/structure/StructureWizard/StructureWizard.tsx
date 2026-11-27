import {
	DISCIPLINE_NAME_TAKEN,
	LOCATION_NAME_TAKEN,
	MAX_LOCATIONS_PER_REQUEST,
	NO_UNITS_LEFT,
	PROJECT_DELIVERED,
	type ProjectSummary,
	ROOM_NAME_TAKEN,
	type StructureCounts,
	type StructureTower,
	TYPOLOGY_NAME_TAKEN,
	type Typology,
} from "@bluprint/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	useBlocker,
	useNavigate,
	useRouteContext,
} from "@tanstack/react-router";
import { Check, CircleAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useSessionDraft } from "@/features/auth";
import { ApiError } from "@/lib/api";
import { useBottomBarHeight } from "@/lib/useBottomBarHeight";
import { useIsDesktop } from "@/lib/useIsDesktop";
import { cn } from "@/lib/utils";
import { uuidV7 } from "@/lib/uuidV7";
import {
	availableUnitsOf,
	projectQueryOptions,
	reservationDraft,
} from "../../projects/api";
import { ChangeReservationDialog } from "../../projects/components/ChangeReservationDialog";
import {
	isBlankStructure,
	namesTakenOf,
	projectUnitsQueryOptions,
	structureQueryOptions,
	typologiesQueryOptions,
	typologyNamesTakenOf,
	useRecreateStructureMutation,
	useRoomNames,
} from "../api";
import { plural } from "../plural";
import {
	missingReserveText,
	missingReserveTitle,
	nameTakenText,
} from "../reserveText";
import {
	readStructureDraft,
	SIGN_OUT_REQUEST,
	structureDraftKey,
	writeStructureDraft,
} from "../structureDraftStore";
import {
	CheckingStatus,
	StaleDraftAlert,
	UncertainAlert,
} from "./AttemptAlerts";
import {
	attemptOutcome,
	type CheckAction,
	useFinishAttempt,
} from "./attemptCheck";
import { buildPlan, reserveUsed } from "./buildPlan";
import { CommonAreasStep, type FloorAreaInput } from "./CommonAreasStep";
import { DiscardDraftDialog } from "./DiscardDraftDialog";
import {
	PreviewSummary,
	PreviewTowers,
	type ReserveBalance,
	ReserveBox,
	UntypedAlert,
} from "./Preview";
import { TowersStep } from "./TowersStep";
import { TypologiesStep } from "./TypologiesStep";
import {
	type ExtendFacts,
	extendFacts,
	hallRepeatLine,
	newFloorsLead,
	towerNowLine,
} from "./towerNow";
import {
	type DraftErrors,
	extendConflicts,
	firstInvalidField,
	initialDraft,
	restoreWizardDraft,
	STRUCTURE_DRAFT_VERSION,
	storeWizardDraft,
	typologyNameTakenErrors,
	validateDraft,
	type WizardDraft,
} from "./wizardDraft";

const STEP_TITLES = [
	"Torres e andares",
	"Áreas comuns",
	"Tipologias",
	"Prévia",
] as const;
const EXTEND_STEP_TITLES = ["Novos andares", "Tipologias", "Prévia"] as const;
const STEP_OF_SECTION = { towers: 0, areas: 1, types: 2 } as const;
const NO_TYPOLOGIES: readonly Typology[] = [];
const EXTEND_STEP_OF_SECTION = { towers: 0, areas: 0, types: 1 } as const;
const BLOCKER_ID = "wizard-blocker";
const AREAS_DESCRIPTION =
	"O hall de entrada e o Hall em cada andar estão no passo 1. Aqui entram as outras. Cada área comum criada usa 1 da reserva, como uma unidade.";
const TYPES_DESCRIPTION =
	"A lista de cômodos de cada tipo, num catálogo para unidades e outro para áreas comuns. Uma tipologia de área comum só vale para área comum.";

const identity = (key: string) => key;

function isRefusal(error: unknown): boolean {
	if (!(error instanceof ApiError)) return false;
	if ([400, 401, 403, 404].includes(error.status)) return true;
	return (
		error.problem?.code !== undefined &&
		[
			NO_UNITS_LEFT,
			LOCATION_NAME_TAKEN,
			TYPOLOGY_NAME_TAKEN,
			ROOM_NAME_TAKEN,
			DISCIPLINE_NAME_TAKEN,
			PROJECT_DELIVERED,
		].includes(error.problem.code)
	);
}

function stillFound(
	shown: DraftErrors,
	found: DraftErrors,
	touched?: string,
): DraftErrors {
	return Object.fromEntries(
		Object.keys(shown)
			.filter((key) => key !== touched && found[key] !== undefined)
			.map((key) => [key, found[key]]),
	);
}

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
				"scroll-mt-6 grid gap-(--space-4)",
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

export function StructureWizard({
	project,
	start,
	tower,
	named = false,
	onReopen,
}: {
	project: ProjectSummary;
	start?: WizardDraft;
	tower?: StructureTower;
	named?: boolean;
	onReopen: () => void;
}) {
	const desktop = useIsDesktop();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const units = useQuery(projectUnitsQueryOptions(project.id));
	const typologies = useQuery(typologiesQueryOptions(project.id));
	const roomNames = useRoomNames(project.id);
	const existing = typologies.data?.typologies ?? NO_TYPOLOGIES;
	const existingNames = existing.map((typology) => typology.name);
	const { session } = useRouteContext({ from: "/_authenticated" });
	const storageKey = structureDraftKey(
		session.user.id,
		project.id,
		start?.extend?.towerId,
	);
	const [stored] = useState(() => readStructureDraft(storageKey));
	const staleRef = useRef(false);
	const finish = useFinishAttempt(project.id, storageKey);
	const create = useRecreateStructureMutation(project.id, () => {
		if (staleRef.current) return;
		const current = readStructureDraft(storageKey);
		if (current)
			writeStructureDraft(storageKey, {
				version: STRUCTURE_DRAFT_VERSION,
				draft: current.draft,
			});
	});
	const restoredReservation = useSessionDraft(
		"change-reservation",
		reservationDraft,
	);
	const [typed, setDraft] = useState<WizardDraft>(
		() =>
			(stored && restoreWizardDraft(stored.draft, start)) ??
			start ??
			initialDraft(),
	);
	const [dirty, setDirty] = useState(stored !== undefined);
	const [restored, setRestored] = useState(
		stored !== undefined && !stored.attempt,
	);
	const [stale, setStale] = useState(false);
	const [submission, setSubmission] = useState<
		"editing" | "sending" | "uncertain" | "checking"
	>(stored?.attempt ? "checking" : "editing");
	const [connectionMessage, setConnectionMessage] = useState(false);
	const [checkAction, setCheckAction] = useState<CheckAction>("open");
	const [openingCheck, setOpeningCheck] = useState(
		stored?.attempt !== undefined,
	);
	const [discardOpen, setDiscardOpen] = useState(false);
	const signOutAnswer = useRef<((allowed: boolean) => void) | undefined>(
		undefined,
	);
	const bypassBlock = useRef(false);
	const navigationBlocker = useBlocker({
		shouldBlockFn: ({ current, next }) =>
			dirty &&
			!staleRef.current &&
			!bypassBlock.current &&
			next.pathname !== "/login" &&
			current.pathname !== next.pathname,
		enableBeforeUnload: false,
		withResolver: true,
	});
	useEffect(() => {
		function changed(event: StorageEvent) {
			if (event.key === storageKey) {
				staleRef.current = true;
				setStale(true);
			}
		}
		window.addEventListener("storage", changed);
		return () => window.removeEventListener("storage", changed);
	}, [storageKey]);
	useEffect(() => {
		function signOut(event: Event) {
			if (
				!dirty ||
				!(event instanceof CustomEvent) ||
				typeof event.detail !== "function"
			)
				return;
			event.preventDefault();
			signOutAnswer.current = event.detail;
			setDiscardOpen(true);
		}
		window.addEventListener(SIGN_OUT_REQUEST, signOut);
		return () => {
			window.removeEventListener(SIGN_OUT_REQUEST, signOut);
			signOutAnswer.current?.(false);
			signOutAnswer.current = undefined;
		};
	}, [dirty]);
	const extend = typed.extend;
	const liveFacts = useMemo(
		() => (tower && extend ? extendFacts(tower, named) : undefined),
		[tower, named, extend],
	);
	const [errors, setErrors] = useState<DraftErrors>(() =>
		stored && !stored.attempt && liveFacts
			? extendConflicts(typed, liveFacts)
			: {},
	);
	const [checkedFacts, setCheckedFacts] = useState(liveFacts);
	const sent = submission !== "editing";
	const facts = sent ? checkedFacts : liveFacts;
	const draft = useMemo(
		() =>
			facts && typed.numbering !== facts.numbering
				? { ...typed, numbering: facts.numbering }
				: typed,
		[typed, facts],
	);
	const stepTitles = extend ? EXTEND_STEP_TITLES : STEP_TITLES;
	const lastStep = stepTitles.length - 1;
	const stepOf = extend ? EXTEND_STEP_OF_SECTION : STEP_OF_SECTION;
	if (!sent && liveFacts !== checkedFacts) {
		setCheckedFacts(liveFacts);
		if (liveFacts) {
			setErrors((current) => ({
				...stillFound(current, validateDraft(draft, liveFacts, existingNames)),
				...extendConflicts(draft, liveFacts),
			}));
		}
	}
	const [step, setStep] = useState(0);
	const [floorArea, setFloorArea] = useState<FloorAreaInput>();
	const [reveal, setReveal] = useState<string>();
	const [reservationOpen, setReservationOpen] = useState(
		restoredReservation !== undefined,
	);
	const reservationButton = useRef<HTMLButtonElement>(null);
	const createButtonRef = useRef<HTMLButtonElement>(null);
	const ids = useRef(
		new Map<string, string>(Object.entries(stored?.attempt?.ids ?? {})),
	);
	const attemptId = useRef(stored?.attempt?.firstLocationId);
	const checkStarted = useRef(false);
	const [checkOnRender, setCheckOnRender] = useState(
		stored?.attempt !== undefined,
	);
	const stepTop = useRef<HTMLDivElement>(null);

	const known = useMemo(
		() =>
			existing.map(({ id, name, locationType }) => ({
				id,
				name,
				locationType,
			})),
		[existing],
	);
	const preview = useMemo(
		() => buildPlan(draft, identity, facts, known),
		[draft, facts, known],
	);

	const remaining = units.data?.remaining ?? availableUnitsOf(create.error);
	const admin = project.role === "admin";
	const used = reserveUsed(preview.spend);
	const over = preview.complete && remaining !== undefined && used > remaining;
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

	const refusedNames = typologyNamesTakenOf(create.error);
	const appliedTaken = useRef("");
	useEffect(() => {
		if (!refusedNames) {
			appliedTaken.current = "";
			return;
		}
		const key = refusedNames.join("\0");
		if (key === appliedTaken.current) return;
		appliedTaken.current = key;
		const found = typologyNameTakenErrors(draft, refusedNames);
		setErrors((current) => ({ ...current, ...found }));
		const first = firstInvalidField(draft, found);
		if (!first) return;
		setStep(stepOf[first.section]);
		setReveal(first.id);
	}, [refusedNames, draft, stepOf]);

	const wasBlocked = useRef(blocked);
	useEffect(() => {
		const unblocked = wasBlocked.current && !blocked;
		wasBlocked.current = blocked;
		if (unblocked && document.activeElement === document.body) {
			createButtonRef.current?.focus();
		}
	}, [blocked]);

	function edit(
		update: (draft: WizardDraft) => WizardDraft,
		touched?: string,
	): boolean {
		if (submission !== "editing" || staleRef.current) return false;
		ids.current = new Map();
		create.reset();
		const next = update(draft);
		setDraft(next);
		writeStructureDraft(storageKey, {
			version: STRUCTURE_DRAFT_VERSION,
			draft: storeWizardDraft(next),
		});
		setDirty(true);
		setRestored(false);
		setErrors((current) =>
			stillFound(current, validateDraft(next, facts, existingNames), touched),
		);
		return true;
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
		const found = validateDraft(draft, facts, existingNames);
		const first = firstInvalidField(draft, found);
		setErrors(found);
		if (first === undefined) return true;
		setStep(stepOf[first.section]);
		setReveal(first.id);
		return false;
	}

	function success(counts: StructureCounts) {
		bypassBlock.current = true;
		finish(
			counts,
			extend && {
				id: extend.towerId,
				name: facts?.named ? facts.name : undefined,
			},
		);
	}

	function clearAttempt() {
		if (staleRef.current) return;
		attemptId.current = undefined;
		writeStructureDraft(storageKey, {
			version: STRUCTURE_DRAFT_VERSION,
			draft: storeWizardDraft(draft),
		});
	}

	function send(using = facts) {
		if (staleRef.current) return;
		const { typologies, locations } = buildPlan(draft, idFor, using, known);
		const first = locations[0];
		if (!first) return;
		attemptId.current = first.id;
		writeStructureDraft(storageKey, {
			version: STRUCTURE_DRAFT_VERSION,
			draft: storeWizardDraft(draft),
			attempt: {
				ids: Object.fromEntries(ids.current),
				firstLocationId: first.id,
			},
		});
		setDirty(true);
		setCheckedFacts(using);
		setSubmission("sending");
		create.mutate(
			{ typologies, locations },
			{
				onSuccess: ({ counts }) => success(counts),
				onError: (error) => {
					if (isRefusal(error)) {
						clearAttempt();
						setSubmission("editing");
					} else setSubmission("uncertain");
				},
			},
		);
	}

	function submit() {
		if (submission !== "editing" || stale || blocked || !validate()) return;
		send();
	}

	async function checkAttempt(action: CheckAction) {
		const id = attemptId.current;
		if (!id) return;
		setSubmission("checking");
		setCheckAction(action);
		setConnectionMessage(false);
		const outcome = await attemptOutcome(queryClient, project.id, id);
		if (outcome === "created") {
			success(buildPlan(draft, idFor, facts).counts);
			return;
		}
		if (staleRef.current) {
			setSubmission("uncertain");
			return;
		}
		setOpeningCheck(false);
		if (outcome === "unknown") {
			setConnectionMessage(action === "edit");
			setSubmission("uncertain");
			return;
		}
		let fresh: ExtendFacts | undefined;
		try {
			const [freshProject, structure] = await Promise.all([
				queryClient.fetchQuery({
					...projectQueryOptions(project.id),
					staleTime: 0,
					retry: false,
				}),
				queryClient.fetchQuery({
					...structureQueryOptions(project.id),
					staleTime: 0,
					retry: false,
				}),
			]);
			if (staleRef.current) {
				setSubmission("uncertain");
				return;
			}
			if (freshProject.status === "delivered") {
				localStorage.removeItem(storageKey);
				bypassBlock.current = true;
				return;
			}
			const usable = extend
				? structure.towers.some((tower) => tower.id === extend.towerId)
				: isBlankStructure(structure);
			if (!usable) {
				localStorage.removeItem(storageKey);
				bypassBlock.current = true;
				toast.info(
					extend
						? "A torre não existe mais. O rascunho foi descartado."
						: "Esta obra já tem estrutura. O rascunho foi descartado.",
				);
				void navigate({
					to: "/projects/$projectId",
					params: { projectId: project.id },
					replace: true,
				});
				return;
			}
			const freshTower = structure.towers.find(
				(each) => each.id === extend?.towerId,
			);
			if (freshTower) fresh = extendFacts(freshTower, named);
		} catch {
			setConnectionMessage(action === "edit");
			setSubmission("uncertain");
			return;
		}
		if (action === "retry") {
			const found = fresh ? validateDraft(draft, fresh, existingNames) : {};
			const first = firstInvalidField(draft, found);
			if (first === undefined) send(fresh ?? facts);
			else {
				setErrors(found);
				clearAttempt();
				ids.current = new Map();
				create.reset();
				setSubmission("editing");
				setStep(stepOf[first.section]);
				setReveal(first.id);
			}
		} else {
			clearAttempt();
			ids.current = new Map();
			create.reset();
			setSubmission("editing");
			if (action === "open") setRestored(true);
		}
	}

	useEffect(() => {
		if (!checkOnRender || checkStarted.current) return;
		checkStarted.current = true;
		setCheckOnRender(false);
		void checkAttempt("open");
	});

	const mode = extend ? "add" : "create";
	const balance: ReserveBalance = units.isPending
		? { state: "loading" }
		: units.data
			? {
					state: "ready",
					reserved: units.data.reserved,
					remaining: units.data.remaining,
				}
			: { state: "unknown" };
	const reserveBox = (
		<ReserveBox plan={preview} balance={balance} mode={mode} />
	);

	const names = namesTakenOf(create.error);
	const failed =
		submission === "editing" &&
		create.isError &&
		names === undefined &&
		refusedNames === undefined &&
		availableUnitsOf(create.error) === undefined;

	const blocker = blocked ? (
		<Alert variant="destructive" id={BLOCKER_ID}>
			{over && remaining !== undefined ? (
				<>
					<CircleAlert aria-hidden="true" />
					<AlertTitle>
						{missingReserveTitle(used - Math.max(remaining, 0))}
					</AlertTitle>
					<AlertDescription>
						{missingReserveText(used, remaining, mode)}{" "}
						{admin ? (
							<button
								ref={reservationButton}
								type="button"
								className="relative underline underline-offset-3 after:absolute after:-inset-y-3 after:inset-x-0 hover:text-foreground"
								onClick={() => setReservationOpen(true)}
							>
								Alterar reserva
							</button>
						) : (
							"Peça mais ao admin da construtora."
						)}
					</AlertDescription>
				</>
			) : (
				<AlertDescription>
					{`Esta estrutura tem ${preview.locations.length.toLocaleString("pt-BR")} locais e o limite é ${MAX_LOCATIONS_PER_REQUEST.toLocaleString("pt-BR")} por vez. Reduza andares, unidades ou áreas comuns.`}
				</AlertDescription>
			)}
		</Alert>
	) : null;

	const reservationDialog = admin && (
		<ChangeReservationDialog
			project={project}
			open={reservationOpen}
			onOpenChange={setReservationOpen}
			returnFocus={blocked ? reservationButton : createButtonRef}
			onSaved={() => void units.refetch()}
		/>
	);

	const createLabel = extend
		? preview.counts.floors > 0
			? `Adicionar ${plural(preview.counts.floors, "andar", "andares")}`
			: "Adicionar andares"
		: "Criar estrutura";
	const pendingLabel = extend ? "Adicionando andares…" : "Criando estrutura…";
	const heading = extend
		? `${facts?.named ? facts.name : "A obra"} ganha ${plural(preview.counts.floors, "andar", "andares")} e ${plural(preview.counts.units, "unidade", "unidades")}`
		: undefined;

	const createButton = (
		<Button
			ref={createButtonRef}
			type="button"
			size="lg"
			className="w-full"
			disabled={submission !== "editing" || stale || blocked}
			aria-describedby={blocked ? BLOCKER_ID : undefined}
			onClick={submit}
		>
			{create.isPending ? (
				<Spinner aria-hidden />
			) : (
				<Check className="size-5" aria-hidden="true" />
			)}
			{create.isPending ? pendingLabel : createLabel}
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
			Nada é salvo antes de {extend ? "adicionar" : "criar"}. Depois, tudo se
			ajusta na fachada{extend ? " e na configuração" : ""}. O rascunho fica
			guardado até lá, mesmo se a página for atualizada.
		</p>
	);

	const towersStep = (
		<TowersStep
			draft={draft}
			errors={errors}
			edit={edit}
			desktop={desktop}
			existing={existing}
			{...(tower && {
				nowLine: towerNowLine(tower, named),
				hallDescription: hallRepeatLine(tower, named),
			})}
		/>
	);
	const areasStep = (
		<CommonAreasStep
			draft={draft}
			errors={errors}
			edit={edit}
			floorArea={floorArea}
			onFloorAreaChange={setFloorArea}
			existing={existing}
		/>
	);

	const typesStep = (
		<TypologiesStep
			draft={draft}
			errors={errors}
			edit={edit}
			desktop={desktop}
			existing={existing}
			roomNames={roomNames}
		/>
	);

	const towersDescription = tower
		? newFloorsLead(tower, named)
		: "Cada torre com as suas faixas de andares e os finais de cada faixa. Uma torre nova começa igual à anterior, sem o Hall em cada andar.";

	const mobileSteps = [
		<Section
			key="towers"
			number={1}
			title={stepTitles[0]}
			description={towersDescription}
			desktop={false}
		>
			{towersStep}
		</Section>,
		...(!extend
			? [
					<Section
						key="areas"
						number={2}
						title={STEP_TITLES[1]}
						description={AREAS_DESCRIPTION}
						desktop={false}
					>
						{areasStep}
					</Section>,
				]
			: []),
		<Section
			key="types"
			number={extend ? 2 : 3}
			title="Tipologias"
			description={TYPES_DESCRIPTION}
			desktop={false}
		>
			{typesStep}
		</Section>,
		<Section
			key="preview"
			number={stepTitles.length}
			title="Prévia"
			desktop={false}
		>
			<PreviewSummary plan={preview} heading={heading} />
			{reserveBox}
			<UntypedAlert plan={preview} />
			{!tooLarge && (
				<PreviewTowers plan={preview} extending={extend !== undefined} />
			)}
			{failures}
			{note}
		</Section>,
	];
	const content = mobileSteps[step];

	const layout = desktop ? (
		<div className="grid items-start gap-(--space-8) md:grid-cols-[minmax(0,1fr)_360px]">
			<div className="grid gap-(--space-5)">
				<Section
					number={1}
					title={stepTitles[0]}
					description={towersDescription}
					desktop
				>
					{towersStep}
				</Section>
				{!extend && (
					<Section
						number={2}
						title={STEP_TITLES[1]}
						description={AREAS_DESCRIPTION}
						desktop
					>
						{areasStep}
					</Section>
				)}
				<Section
					number={extend ? 2 : 3}
					title="Tipologias"
					description={TYPES_DESCRIPTION}
					desktop
				>
					{typesStep}
				</Section>
			</div>
			<aside
				aria-label="Prévia"
				className="sticky top-6 rounded-xl bg-card shadow-(--ring-hairline)"
			>
				<div className="flex max-h-[calc(100dvh-48px)] flex-col gap-(--space-4) overflow-y-auto rounded-xl p-(--space-5)">
					<h2 className="text-lg font-semibold tracking-tight">Prévia</h2>
					<PreviewSummary plan={preview} heading={heading} />
					{reserveBox}
					<UntypedAlert plan={preview} />
					{failures}
					{blocker}
					{createButton}
					{note}
					<div className="grid h-45 basis-[content]">
						<div className="min-h-0 overflow-y-auto border-t border-border pt-(--space-4) pr-1">
							{!tooLarge && (
								<PreviewTowers
									plan={preview}
									extending={extend !== undefined}
								/>
							)}
						</div>
					</div>
				</div>
			</aside>
		</div>
	) : (
		<div
			ref={stepTop}
			className="grid scroll-mt-4 gap-(--space-5) pb-(--bottom-bar-height)"
		>
			<div className="grid gap-(--space-2)">
				<span className="text-sm text-muted-foreground">
					Passo {step + 1} de {stepTitles.length}
				</span>
				<div className="flex gap-1" aria-hidden="true">
					{stepTitles.map((title, at) => (
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
				{step === lastStep && blocker}
				<div className="flex gap-(--space-2)">
					{step > 0 && (
						<Button
							type="button"
							variant="outline"
							size="lg"
							className="flex-1"
							disabled={submission !== "editing" || stale}
							onClick={() => setStep(step - 1)}
						>
							Voltar
						</Button>
					)}
					{step < lastStep ? (
						<Button
							type="button"
							size="lg"
							className="flex-2"
							disabled={submission !== "editing" || stale}
							onClick={() => {
								if (step === 0 && !validate()) return;
								setStep(step + 1);
							}}
						>
							Continuar · {stepTitles[step + 1]}
						</Button>
					) : (
						<div className="flex-2">{createButton}</div>
					)}
				</div>
			</MobileBar>
		</div>
	);

	return (
		<div className="grid gap-(--space-5)">
			{restored && !stale && (
				<Alert>
					<AlertTitle>Rascunho restaurado</AlertTitle>
					<AlertDescription>
						O que você montou continua aqui até{" "}
						{extend ? "adicionar os andares" : "criar a estrutura"} ou
						descartar.{" "}
						<button
							type="button"
							className="underline"
							onClick={() => setDiscardOpen(true)}
						>
							Descartar rascunho
						</button>
					</AlertDescription>
				</Alert>
			)}
			{stale && (
				<StaleDraftAlert
					waiting={submission === "sending" || submission === "checking"}
					onLoad={onReopen}
				/>
			)}
			{!stale && openingCheck && submission === "checking" && (
				<CheckingStatus extending={extend !== undefined} />
			)}
			{!stale &&
				(submission === "uncertain" ||
					(submission === "checking" && !openingCheck)) && (
					<UncertainAlert
						checking={submission === "checking" ? checkAction : undefined}
						noConnection={connectionMessage}
						onRetry={() => void checkAttempt("retry")}
						onEdit={() => void checkAttempt("edit")}
					/>
				)}
			{!openingCheck && (
				<fieldset
					disabled={stale || submission !== "editing"}
					className="min-w-0"
				>
					{layout}
				</fieldset>
			)}
			{reservationDialog}
			<DiscardDraftDialog
				open={discardOpen || navigationBlocker.status === "blocked"}
				extending={!!extend}
				onCancel={() => {
					setDiscardOpen(false);
					signOutAnswer.current?.(false);
					signOutAnswer.current = undefined;
					navigationBlocker.reset?.();
				}}
				onDiscard={() => {
					if (!staleRef.current) localStorage.removeItem(storageKey);
					setDirty(false);
					setDiscardOpen(false);
					if (signOutAnswer.current) {
						const answer = signOutAnswer.current;
						signOutAnswer.current = undefined;
						answer(true);
					} else if (navigationBlocker.status === "blocked") {
						bypassBlock.current = true;
						navigationBlocker.proceed();
					} else {
						create.reset();
						setDraft(start ?? initialDraft());
						setRestored(false);
					}
				}}
			/>
		</div>
	);
}
