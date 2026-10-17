import { useQuery } from "@tanstack/react-query";
import { Building } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { LoadFailure } from "@/components/LoadFailure";
import { LockLine } from "@/components/LockLine";
import { BackLink } from "@/components/PageBand";
import { StateBlock } from "@/components/StateBlock";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { firstLoadState } from "@/lib/firstLoadState";
import { useIsDesktop } from "@/lib/useIsDesktop";
import { organizationUnitsQueryOptions } from "../../account/api";
import {
	belowUsedOf,
	deliveredMeanwhile,
	organizationReservationsQueryOptions,
	overContractedBy,
	useUpdateReservationsMutation,
} from "../api";
import {
	DesktopReservationList,
	PhoneReservationList,
	ReservationListSkeleton,
} from "./ReservationList";
import {
	type Drafts,
	deliveredLine,
	digitsOnly,
	overContractedMessage,
	reservationRows,
	type Touched,
	unitsTotals,
} from "./reservationDrafts";
import { DesktopSaveFooter, PhoneSaveBar } from "./SaveControls";
import { UnitFigures } from "./UnitFigures";

type Failure =
	| { kind: "generic" }
	| { kind: "over-contracted"; excess: number }
	| { kind: "delivered"; name: string };

function deliveredMessage(name: string) {
	return `A obra “${name}” foi entregue enquanto você editava e saiu da lista. As outras reservas continuam aqui: confira e salve de novo.`;
}

function Heading() {
	return (
		<div className="grid gap-1 md:gap-(--space-2)">
			<BackLink to="/projects" activeOptions={{ exact: true }}>
				Obras
			</BackLink>
			<div className="grid gap-(--space-2)">
				<h1 className="text-[1.75rem] leading-[1.15] font-semibold tracking-tight md:text-4xl md:leading-[1.15]">
					Unidades
				</h1>
				<p className="text-sm leading-normal text-balance text-muted-foreground">
					A reserva de cada obra sai das unidades contratadas. O que sobra fica
					livre.
				</p>
			</div>
		</div>
	);
}

function Frame({ children }: { children: React.ReactNode }) {
	return (
		<main className="mx-auto w-full max-w-(--content-max-wide) flex-1 px-(--page-pad) pt-(--space-2) pb-[calc(var(--space-8)+var(--bottom-bar-height))] md:px-(--page-pad-desktop) md:pt-(--space-8) md:pb-(--space-12)">
			<div className="grid max-w-3xl gap-(--space-5)">
				<Heading />
				{children}
			</div>
		</main>
	);
}

export function UnitsPage() {
	const desktop = useIsDesktop();
	const reservations = useQuery(organizationReservationsQueryOptions);
	const units = useQuery(organizationUnitsQueryOptions);
	const update = useUpdateReservationsMutation();
	const [drafts, setDrafts] = useState<Drafts>({});
	const [touched, setTouched] = useState<Touched>({});
	const [failure, setFailure] = useState<Failure>();

	const loaded = reservations.data && units.data;
	if (!loaded) {
		const missing = [reservations, units].filter((query) => !query.data);
		const retry = () => {
			for (const query of missing) void query.refetch();
		};
		const failed = missing.find((query) => query.isError && !query.isFetching);
		const state = firstLoadState({
			...(failed ?? (reservations.data ? units : reservations)),
			refetch: retry,
		});
		return (
			<Frame>
				{state === "loading" ? (
					<>
						<UnitFigures contracted={undefined} totals={undefined} />
						<ReservationListSkeleton desktop={desktop} />
					</>
				) : (
					<LoadFailure
						state={state}
						title="Não foi possível carregar as unidades"
						onRetry={retry}
					/>
				)}
			</Frame>
		);
	}

	const { items, delivered } = reservations.data;
	const { contracted } = units.data;
	const rows = reservationRows(items, drafts);
	const totals = unitsTotals(rows, delivered.used, contracted);
	const changedRows = rows.filter((row) => row.changed);
	const excess = Math.max(0, -totals.free);
	const saving = update.isPending;
	const canSave =
		changedRows.length > 0 && excess === 0 && rows.every((row) => !row.problem);

	function type(projectId: string, typed: string) {
		setDrafts((previous) => ({ ...previous, [projectId]: digitsOnly(typed) }));
		setFailure(undefined);
	}

	function blur(projectId: string) {
		setTouched((previous) => ({ ...previous, [projectId]: true }));
	}

	function discard() {
		setDrafts({});
		setTouched({});
		setFailure(undefined);
	}

	function save() {
		if (!canSave || saving) return;
		setFailure(undefined);
		update.mutate(
			{
				items: changedRows.flatMap(({ projectId, value }) =>
					value === undefined ? [] : [{ projectId, reserved: value }],
				),
			},
			{
				onSuccess: () => {
					setDrafts({});
					setTouched({});
					toast.success("Reservas salvas.");
				},
				onError: (error) => {
					const below = belowUsedOf(error);
					const over = overContractedBy(error);
					const delivered = deliveredMeanwhile(error);
					if (below) {
						setTouched((previous) => ({
							...previous,
							...Object.fromEntries(
								below.map(({ projectId }) => [projectId, true]),
							),
						}));
					} else if (over !== undefined) {
						setFailure({ kind: "over-contracted", excess: over });
					} else if (delivered) {
						const { projectId } = delivered;
						const name = items.find((row) => row.projectId === projectId)?.name;
						setDrafts((previous) =>
							Object.fromEntries(
								Object.entries(previous).filter(([id]) => id !== projectId),
							),
						);
						setFailure(
							name ? { kind: "delivered", name } : { kind: "generic" },
						);
					} else {
						setFailure({ kind: "generic" });
					}
				},
			},
		);
	}

	const controls = {
		changed: changedRows.length,
		free: totals.free,
		saving,
		canSave,
		failed: failure?.kind === "generic",
		onDiscard: discard,
		onSave: save,
	};
	const barVisible = changedRows.length > 0;
	const listProps = {
		rows,
		touched,
		disabled: saving,
		onType: type,
		onBlur: blur,
	};

	return (
		<Frame>
			{excess > 0 ? (
				<Alert variant="destructive">
					<AlertDescription>{overContractedMessage(excess)}</AlertDescription>
				</Alert>
			) : failure?.kind === "over-contracted" ? (
				<Alert variant="destructive">
					<AlertDescription>
						{overContractedMessage(failure.excess)}
					</AlertDescription>
				</Alert>
			) : (
				failure?.kind === "delivered" && (
					<Alert variant="destructive">
						<AlertDescription>
							{deliveredMessage(failure.name)}
						</AlertDescription>
					</Alert>
				)
			)}
			<UnitFigures contracted={contracted} totals={totals} />
			{items.length === 0 ? (
				<StateBlock
					icon={Building}
					title="Nenhuma obra em andamento"
					description={
						delivered.projects > 0
							? deliveredLine(delivered.projects, delivered.used)
							: undefined
					}
				/>
			) : (
				<>
					{desktop ? (
						<DesktopReservationList
							{...listProps}
							footer={barVisible && <DesktopSaveFooter {...controls} />}
						/>
					) : (
						<PhoneReservationList {...listProps} />
					)}
					{delivered.projects > 0 && (
						<LockLine>
							{deliveredLine(delivered.projects, delivered.used)}
						</LockLine>
					)}
					{!desktop && barVisible && <PhoneSaveBar {...controls} />}
				</>
			)}
		</Frame>
	);
}
