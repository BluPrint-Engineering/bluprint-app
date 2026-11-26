import type { LocationDetail, Structure } from "@bluprint/shared";
import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal } from "lucide-react";
import {
	createContext,
	type ReactNode,
	type RefObject,
	use,
	useMemo,
	useRef,
	useState,
} from "react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { disciplinesQueryOptions } from "../api";
import { DisciplineBatchDialog } from "../components/DisciplineBatchDialog";
import { BATCH_MENU_LABEL } from "../disciplinesText";

interface DisciplineBatch {
	ready: boolean;
	open: (opener: HTMLElement | null) => void;
}

const DisciplineBatchContext = createContext<DisciplineBatch | null>(null);

export function useDisciplineBatch(): DisciplineBatch {
	const batch = use(DisciplineBatchContext);
	if (!batch) throw new Error("No DisciplineBatchHost above");
	return batch;
}

export function DisciplineBatchHost({
	projectId,
	structure,
	location,
	editable,
	children,
}: {
	projectId: string;
	structure: Structure;
	location: LocationDetail;
	editable: boolean;
	children: ReactNode;
}) {
	const catalog = useQuery({
		...disciplinesQueryOptions(projectId),
		enabled: editable,
	});
	const [opened, setOpened] = useState(false);
	const opener = useRef<HTMLElement | null>(null);
	const ready = catalog.data !== undefined;
	const value = useMemo(
		() => ({
			ready,
			open: (trigger: HTMLElement | null) => {
				opener.current = trigger;
				setOpened(true);
			},
		}),
		[ready],
	);

	return (
		<DisciplineBatchContext value={value}>
			{children}
			{editable && opened && catalog.data && (
				<DisciplineBatchDialog
					projectId={projectId}
					structure={structure}
					catalog={catalog.data.items}
					from={location}
					onClose={() => setOpened(false)}
					returnFocus={() => opener.current}
				/>
			)}
		</DisciplineBatchContext>
	);
}

export function DisciplineBatchMenuItem({
	trigger,
}: {
	trigger: RefObject<HTMLButtonElement | null>;
}) {
	const batch = useDisciplineBatch();
	return (
		<DropdownMenuItem
			disabled={!batch.ready}
			onSelect={() => batch.open(trigger.current)}
		>
			<SlidersHorizontal className="size-4.5" aria-hidden="true" />
			{BATCH_MENU_LABEL}
		</DropdownMenuItem>
	);
}
