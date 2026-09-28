import { XIcon } from "lucide-react";
import type * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** The design system's Sheet: a bottom drawer over the scrim, dragged down or closed by its X. */
function Drawer({
	...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) {
	return <DrawerPrimitive.Root data-slot="drawer" {...props} />;
}

function DrawerTrigger({
	...props
}: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
	return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal({
	...props
}: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
	return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerClose({
	...props
}: React.ComponentProps<typeof DrawerPrimitive.Close>) {
	return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerOverlay({
	className,
	...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
	return (
		<DrawerPrimitive.Overlay
			data-slot="drawer-overlay"
			className={cn(
				"fixed inset-0 z-50 bg-overlay data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
				className,
			)}
			{...props}
		/>
	);
}

function DrawerContent({
	className,
	children,
	...props
}: React.ComponentProps<typeof DrawerPrimitive.Content>) {
	return (
		<DrawerPortal data-slot="drawer-portal">
			<DrawerOverlay />
			<DrawerPrimitive.Content
				data-slot="drawer-content"
				className={cn(
					// vaul injects its own 500ms slide after this stylesheet, so the token timing needs `!`
					"group/drawer-content fixed inset-x-0 bottom-0 z-50 flex max-h-[calc(100dvh-48px)] flex-col rounded-t-xl bg-popover pb-[env(safe-area-inset-bottom)] text-base text-popover-foreground shadow-(--shadow-lg) outline-none [animation-duration:var(--duration-slow)]! [animation-timing-function:var(--ease-out)]!",
					className,
				)}
				{...props}
			>
				<div
					aria-hidden="true"
					className="mx-auto mt-(--space-2) h-1 w-9 shrink-0 rounded-full bg-input"
				/>
				{children}
			</DrawerPrimitive.Content>
		</DrawerPortal>
	);
}

/** Title and description on the left, the 44px close X on the right. */
function DrawerHeader({
	className,
	children,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="drawer-header"
			className={cn(
				"flex items-start justify-between gap-(--space-3) pt-(--space-1) pr-(--space-2) pb-(--space-2) pl-(--page-pad)",
				className,
			)}
			{...props}
		>
			<div className="grid gap-0.5 pt-2.5">{children}</div>
			<DrawerPrimitive.Close asChild>
				<Button variant="ghost" size="icon" aria-label="Fechar">
					<XIcon aria-hidden="true" className="size-5" />
				</Button>
			</DrawerPrimitive.Close>
		</div>
	);
}

function DrawerBody({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="drawer-body"
			className={cn(
				"grid min-h-0 flex-1 content-start gap-(--space-6) overflow-auto px-(--page-pad) pt-(--space-2) pb-(--space-5)",
				className,
			)}
			{...props}
		/>
	);
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="drawer-footer"
			className={cn(
				"flex gap-(--space-3) border-t border-border px-(--page-pad) pt-(--space-3) pb-(--space-4)",
				className,
			)}
			{...props}
		/>
	);
}

function DrawerTitle({
	className,
	...props
}: React.ComponentProps<typeof DrawerPrimitive.Title>) {
	return (
		<DrawerPrimitive.Title
			data-slot="drawer-title"
			className={cn(
				"text-lg leading-snug font-semibold tracking-tight text-foreground",
				className,
			)}
			{...props}
		/>
	);
}

function DrawerDescription({
	className,
	...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
	return (
		<DrawerPrimitive.Description
			data-slot="drawer-description"
			className={cn("text-sm text-muted-foreground", className)}
			{...props}
		/>
	);
}

export {
	Drawer,
	DrawerBody,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerOverlay,
	DrawerPortal,
	DrawerTitle,
	DrawerTrigger,
};
