import { useInfiniteQuery } from "@tanstack/react-query";
import { CircleAlert, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { projectsInfiniteQueryOptions } from "../api";
import {
	ListPlaceholder,
	NoProjects,
	ProjectList,
	ProjectsMain,
} from "./ProjectList";

/** How far below the screen the end of the list starts loading the next page. */
const LOAD_AHEAD_PX = 160;

/** The phone's list: the next page loads on its own as the end of the list nears the screen. */
export function ContinuousProjectList() {
	const query = useInfiniteQuery({
		...projectsInfiniteQueryOptions(),
		// three retries hold the spinner ~7 s on a weak signal before the retry button shows
		retry: 1,
	});
	const { data, hasNextPage, fetchNextPage } = query;

	const [nearEnd, setNearEnd] = useState(false);
	const watchEnd = useCallback((sentinel: HTMLDivElement | null) => {
		if (!sentinel) return;
		const observer = new IntersectionObserver(
			(entries) => setNearEnd(entries.at(-1)?.isIntersecting ?? false),
			{ rootMargin: `0px 0px ${LOAD_AHEAD_PX}px 0px` },
		);
		observer.observe(sentinel);
		return () => observer.disconnect();
	}, []);

	// a failed page stops automatic loading until a tap, even past a successful background refresh
	const [stopped, setStopped] = useState(false);
	const loadNext = useCallback(
		() => fetchNextPage().then((result) => setStopped(result.isError)),
		[fetchNextPage],
	);

	const loadsOnItsOwn = hasNextPage && query.fetchStatus === "idle" && !stopped;
	const pagesLoaded = data?.pages.length ?? 0;
	useEffect(() => {
		// on pages loaded too: a page landing with the end still in view gets no new observer entry
		if (nearEnd && loadsOnItsOwn && pagesLoaded > 0) void loadNext();
	}, [nearEnd, loadsOnItsOwn, pagesLoaded, loadNext]);

	// offset pages shift when a project joins or leaves the list between two of them
	const projects = useMemo(
		() => [
			...new Map(
				data?.pages.flatMap((page) => page.items).map((p) => [p.id, p]),
			).values(),
		],
		[data],
	);

	const total = data?.pages.at(-1)?.total;
	let content: React.ReactNode;
	if (!data) {
		content = <ListPlaceholder query={query} />;
	} else if (total === 0) {
		content = <NoProjects />;
	} else {
		content = (
			<>
				{/* wrapped so the sentinel adds no gap of its own under the list */}
				<div>
					<ProjectList projects={projects} />
					<div ref={watchEnd} />
				</div>
				<NextPage
					// paused while offline: the page loads on its own when the connection returns
					loading={query.isFetchingNextPage || query.fetchStatus === "paused"}
					failed={query.isFetchNextPageError}
					hasMore={hasNextPage}
					onLoad={() => void loadNext()}
				/>
			</>
		);
	}

	return (
		<ProjectsMain total={total} counting={query.isFetching}>
			{content}
		</ProjectsMain>
	);
}

interface NextPageProps {
	loading: boolean;
	failed: boolean;
	hasMore: boolean;
	onLoad: () => void;
}

/** What sits under the list while there is more of it: loading, failed, or a button to load it. */
function NextPage({ loading, failed, hasMore, onLoad }: NextPageProps) {
	if (loading) {
		return (
			<div
				role="status"
				aria-label="Carregando mais obras…"
				className="flex min-h-(--tap-min) items-center justify-center gap-(--space-2) text-sm text-muted-foreground"
			>
				<Spinner className="size-4.5" aria-hidden="true" />
				Carregando mais obras…
			</div>
		);
	}
	if (failed) {
		return (
			<div
				role="alert"
				className="grid justify-items-center gap-(--space-3) py-(--space-2) text-center"
			>
				<span className="flex items-center gap-(--space-2) text-sm text-muted-foreground">
					<CircleAlert className="size-4.5" aria-hidden="true" />
					Não foi possível carregar mais obras.
				</span>
				<Button variant="outline" className="w-full" onClick={onLoad}>
					<RefreshCw className="size-4.5" aria-hidden="true" />
					Tentar de novo
				</Button>
			</div>
		);
	}
	if (!hasMore) return null;
	return (
		<Button variant="outline" className="w-full" onClick={onLoad}>
			Carregar mais
		</Button>
	);
}
