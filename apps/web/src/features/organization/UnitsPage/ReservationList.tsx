import { Card } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { type ReservationRowView, signedUnits } from "./reservationDrafts";

const CHANGED_BAR = "shadow-[inset_3px_0_0_var(--primary)]";

const NUMBER = "font-mono text-base font-medium tabular-nums";

const NUMBER_COLUMN = "w-28 pl-6 text-right";

const HEAD = "h-10 text-sm font-medium text-muted-foreground";

export interface ReservationListProps {
	rows: ReservationRowView[];
	touched: Readonly<Record<string, true>>;
	disabled: boolean;
	onType: (projectId: string, typed: string) => void;
	onBlur: (projectId: string) => void;
}

function remainingOf(row: ReservationRowView) {
	return row.remaining === undefined ? "–" : signedUnits(row.remaining);
}

function overdrawn(row: ReservationRowView) {
	return row.remaining !== undefined && row.remaining < 0;
}

function errorOf(
	row: ReservationRowView,
	touched: ReservationListProps["touched"],
) {
	return touched[row.projectId] ? row.problem : undefined;
}

function ReservationInput({
	row,
	error,
	disabled,
	describedBy,
	onType,
	onBlur,
	className,
	id,
}: Pick<ReservationListProps, "disabled" | "onType" | "onBlur"> & {
	row: ReservationRowView;
	error: string | undefined;
	describedBy: string | undefined;
	className?: string;
	id?: string;
}) {
	return (
		<Input
			id={id}
			inputMode="numeric"
			autoComplete="off"
			enterKeyHint="done"
			aria-label={`Reserva de ${row.name}`}
			aria-invalid={error ? true : undefined}
			aria-describedby={describedBy}
			disabled={disabled}
			value={row.typed}
			onChange={(event) => onType(row.projectId, event.target.value)}
			onBlur={() => onBlur(row.projectId)}
			className={cn("font-mono tabular-nums", className)}
		/>
	);
}

function DesktopRow({
	row,
	touched,
	disabled,
	onType,
	onBlur,
}: ReservationListProps & { row: ReservationRowView }) {
	const error = errorOf(row, touched);
	const errorId = `reservation-error-${row.projectId}`;
	return (
		<>
			<tr className="border-t border-border">
				<th
					scope="row"
					className={cn(
						"h-15 py-2 pr-0 pl-4 text-left align-middle font-normal",
						row.changed && CHANGED_BAR,
					)}
				>
					<span className="grid min-w-0 gap-0.5">
						<span className="text-base leading-snug font-medium [overflow-wrap:anywhere]">
							{row.name}
						</span>
						{row.changed && (
							<span className="text-sm text-muted-foreground tabular-nums">
								Antes: {row.saved.toLocaleString("pt-BR")}
							</span>
						)}
					</span>
				</th>
				<td className={cn(NUMBER_COLUMN, NUMBER)}>
					{row.used.toLocaleString("pt-BR")}
				</td>
				<td className="w-36 pl-6">
					<ReservationInput
						row={row}
						error={error}
						disabled={disabled}
						describedBy={error ? errorId : undefined}
						onType={onType}
						onBlur={onBlur}
						className="text-right"
					/>
				</td>
				<td
					className={cn(
						NUMBER_COLUMN,
						NUMBER,
						"pr-4",
						overdrawn(row) && "text-destructive",
					)}
				>
					{remainingOf(row)}
				</td>
			</tr>
			{error && (
				<tr>
					<td
						colSpan={4}
						className={cn("px-4 pb-2", row.changed && CHANGED_BAR)}
					>
						<FieldError id={errorId}>{error}</FieldError>
					</td>
				</tr>
			)}
		</>
	);
}

function ReservationTableHead() {
	return (
		<thead>
			<tr>
				<th scope="col" className={cn(HEAD, "pl-4 text-left font-medium")}>
					Obra
				</th>
				<th scope="col" className={cn(HEAD, NUMBER_COLUMN, "font-medium")}>
					Usadas
				</th>
				<th
					scope="col"
					className={cn(HEAD, "w-36 pl-6 text-right font-medium")}
				>
					Reserva
				</th>
				<th scope="col" className={cn(HEAD, NUMBER_COLUMN, "pr-4 font-medium")}>
					Restam
				</th>
			</tr>
		</thead>
	);
}

export function DesktopReservationList({
	footer,
	...props
}: ReservationListProps & { footer: React.ReactNode }) {
	return (
		<Card className="gap-0 overflow-visible p-0">
			<table aria-label="Reservas das obras" className="w-full table-fixed">
				<ReservationTableHead />
				<tbody>
					{props.rows.map((row) => (
						<DesktopRow key={row.projectId} {...props} row={row} />
					))}
				</tbody>
			</table>
			{footer}
		</Card>
	);
}

function PhoneCard({
	row,
	touched,
	disabled,
	onType,
	onBlur,
}: ReservationListProps & { row: ReservationRowView }) {
	const error = errorOf(row, touched);
	const inputId = `reservation-${row.projectId}`;
	const hintId = `reservation-hint-${row.projectId}`;
	const before = row.changed
		? `Antes: ${row.saved.toLocaleString("pt-BR")}`
		: undefined;
	return (
		<Card
			className={cn(
				"gap-(--space-3) p-4",
				row.changed &&
					"shadow-[inset_3px_0_0_var(--primary),var(--ring-hairline)]",
			)}
		>
			<div className="text-base leading-snug font-semibold [overflow-wrap:anywhere]">
				{row.name}
			</div>
			<div className="grid grid-cols-2 gap-(--space-4)">
				<div className="flex items-baseline gap-(--space-2)">
					<span className="text-sm text-muted-foreground">Usadas</span>
					<span className={NUMBER}>{row.used.toLocaleString("pt-BR")}</span>
				</div>
				<div className="flex items-baseline gap-(--space-2)">
					<span className="text-sm text-muted-foreground">Restam</span>
					<span className={cn(NUMBER, overdrawn(row) && "text-destructive")}>
						{remainingOf(row)}
					</span>
				</div>
			</div>
			<Field className="mt-1" data-invalid={error ? true : undefined}>
				<FieldLabel htmlFor={inputId}>Reserva</FieldLabel>
				<ReservationInput
					id={inputId}
					row={row}
					error={error}
					disabled={disabled}
					describedBy={error || before ? hintId : undefined}
					onType={onType}
					onBlur={onBlur}
				/>
				{error ? (
					<FieldError id={hintId}>{error}</FieldError>
				) : (
					before && (
						<p
							id={hintId}
							className="text-sm text-muted-foreground tabular-nums"
						>
							{before}
						</p>
					)
				)}
			</Field>
		</Card>
	);
}

export function PhoneReservationList(props: ReservationListProps) {
	return (
		<ul aria-label="Reservas das obras" className="grid gap-(--space-3)">
			{props.rows.map((row) => (
				<li key={row.projectId}>
					<PhoneCard {...props} row={row} />
				</li>
			))}
		</ul>
	);
}

export function ReservationListSkeleton({ desktop }: { desktop: boolean }) {
	return desktop ? (
		<Card aria-hidden className="gap-0 overflow-visible p-0">
			<table className="w-full table-fixed">
				<ReservationTableHead />
				<tbody>
					{[0, 1, 2, 3].map((index) => (
						<tr key={index} className="border-t border-border">
							<td className="h-15 py-2 pl-4">
								<Skeleton className="h-5 w-48 max-w-full" />
							</td>
							<td className={NUMBER_COLUMN}>
								<Skeleton className="ml-auto h-5 w-10" />
							</td>
							<td className="w-36 pl-6">
								<Skeleton className="h-11 w-full" />
							</td>
							<td className={cn(NUMBER_COLUMN, "pr-4")}>
								<Skeleton className="ml-auto h-5 w-10" />
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</Card>
	) : (
		<ul aria-hidden className="grid gap-(--space-3)">
			{[0, 1, 2, 3].map((index) => (
				<li key={index}>
					<Card className="gap-(--space-3) p-4">
						<Skeleton className="h-5 w-48 max-w-full" />
						<div className="grid grid-cols-2 gap-(--space-4)">
							<div className="flex items-baseline gap-(--space-2)">
								<span className="text-sm text-muted-foreground">Usadas</span>
								<Skeleton className="h-5 w-10 self-center" />
							</div>
							<div className="flex items-baseline gap-(--space-2)">
								<span className="text-sm text-muted-foreground">Restam</span>
								<Skeleton className="h-5 w-10 self-center" />
							</div>
						</div>
						<Field className="mt-1">
							<FieldLabel>Reserva</FieldLabel>
							<Skeleton className="h-11 w-full" />
						</Field>
					</Card>
				</li>
			))}
		</ul>
	);
}
