import { useRef } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useBottomBarHeight } from "@/lib/useBottomBarHeight";
import { cn } from "@/lib/utils";
import { changedLine, signedUnits } from "./reservationDrafts";

export const SAVE_FAILED =
	"Não foi possível salvar as reservas. Confira sua conexão e tente de novo.";

interface SaveControlsProps {
	changed: number;
	free: number;
	saving: boolean;
	canSave: boolean;
	failed: boolean;
	onDiscard: () => void;
	onSave: () => void;
}

function FailedAlert() {
	return (
		<Alert variant="destructive">
			<AlertDescription>{SAVE_FAILED}</AlertDescription>
		</Alert>
	);
}

function SaveLabel({ saving }: { saving: boolean }) {
	return saving ? (
		<>
			<Spinner aria-hidden />
			Salvando…
		</>
	) : (
		"Salvar"
	);
}

export function DesktopSaveFooter({
	changed,
	saving,
	canSave,
	failed,
	onDiscard,
	onSave,
}: SaveControlsProps) {
	return (
		<CardFooter className="sticky bottom-0 flex-wrap gap-(--space-3) bg-[color-mix(in_oklab,var(--muted)_50%,var(--card))] px-4 py-3">
			{failed && (
				<div className="w-full">
					<FailedAlert />
				</div>
			)}
			<span className="text-sm text-muted-foreground tabular-nums">
				{changedLine(changed)}
			</span>
			<div className="ml-auto flex gap-(--space-3)">
				<Button variant="outline" disabled={saving} onClick={onDiscard}>
					Descartar
				</Button>
				<Button disabled={!canSave || saving} onClick={onSave}>
					<SaveLabel saving={saving} />
				</Button>
			</div>
		</CardFooter>
	);
}

export function PhoneSaveBar({
	changed,
	free,
	saving,
	canSave,
	failed,
	onDiscard,
	onSave,
}: SaveControlsProps) {
	const bar = useRef<HTMLDivElement>(null);
	useBottomBarHeight(bar);
	return (
		<div
			ref={bar}
			className="fixed inset-x-0 bottom-0 z-20 grid gap-(--space-3) border-t bg-background px-(--page-pad) pt-(--space-3) pb-[calc(var(--space-3)+env(safe-area-inset-bottom))]"
		>
			{failed && <FailedAlert />}
			<div className="flex items-baseline justify-between gap-(--space-3) text-sm text-muted-foreground">
				<span className="tabular-nums">{changedLine(changed)}</span>
				<span>
					Livres{" "}
					<span
						className={cn(
							"font-mono font-medium text-foreground tabular-nums",
							free < 0 && "text-destructive",
						)}
					>
						{signedUnits(free)}
					</span>
				</span>
			</div>
			<div className="flex gap-(--space-2)">
				<Button
					variant="outline"
					size="lg"
					className="flex-1"
					disabled={saving}
					onClick={onDiscard}
				>
					Descartar
				</Button>
				<Button
					size="lg"
					className="flex-2"
					disabled={!canSave || saving}
					onClick={onSave}
				>
					<SaveLabel saving={saving} />
				</Button>
			</div>
		</div>
	);
}
