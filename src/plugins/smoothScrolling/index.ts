import definePlugin from "@utils/types";

type Axis = "x" | "y";

type ScrollState = {
    targetX: number;
    targetY: number;
    rafId: number;
};

const LINE_HEIGHT_PX = 16;
const LERP_FACTOR = 0.2;
const SETTLE_EPSILON = 0.5;

const activeScrolls = new Map<HTMLElement, ScrollState>();
let lastScrollable: HTMLElement | null = null;

function isScrollable(el: HTMLElement, axis: Axis): boolean {
    const style = getComputedStyle(el);

    const overflowValue = axis === "y" ? style.overflowY : style.overflowX;
    const allowsScroll = overflowValue === "auto" || overflowValue === "scroll" || overflowValue === "overlay";
    if (!allowsScroll) return false;

    return axis === "y"
        ? el.scrollHeight > el.clientHeight + 1
        : el.scrollWidth > el.clientWidth + 1;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

function toPixels(delta: number, deltaMode: number, axis: Axis): number {
    if (deltaMode === 1) return delta * LINE_HEIGHT_PX;
    if (deltaMode === 2) return delta * (axis === "y" ? window.innerHeight : window.innerWidth);
    return delta;
}

function canScrollInDirection(el: HTMLElement, axis: Axis, delta: number): boolean {
    if (delta === 0) return false;

    if (axis === "y") {
        const maxY = Math.max(0, el.scrollHeight - el.clientHeight);
        if (delta > 0) return el.scrollTop < maxY - 1;
        return el.scrollTop > 1;
    }

    const maxX = Math.max(0, el.scrollWidth - el.clientWidth);
    if (delta > 0) return el.scrollLeft < maxX - 1;
    return el.scrollLeft > 1;
}

function findScrollableParent(target: Element, dx: number, dy: number, requireDirection = true): HTMLElement | null {
    const prefersY = Math.abs(dy) >= Math.abs(dx);
    const axes: Axis[] = prefersY ? ["y", "x"] : ["x", "y"];

    let el: HTMLElement | null = target instanceof HTMLElement ? target : target.parentElement;

    while (el) {
        for (const axis of axes) {
            if (!isScrollable(el, axis)) continue;

            if (axis === "y" && dy !== 0 && (!requireDirection || canScrollInDirection(el, "y", dy))) return el;
            if (axis === "x" && dx !== 0 && (!requireDirection || canScrollInDirection(el, "x", dx))) return el;
        }

        el = el.parentElement;
    }

    const root = document.scrollingElement;
    if (!(root instanceof HTMLElement)) return null;

    if (!requireDirection) return root;
    if (dy !== 0 && canScrollInDirection(root, "y", dy)) return root;
    if (dx !== 0 && canScrollInDirection(root, "x", dx)) return root;

    return null;
}

function cleanupDetachedScrolls(): void {
    for (const [el, state] of activeScrolls) {
        if (el.isConnected) continue;

        cancelAnimationFrame(state.rafId);
        activeScrolls.delete(el);
    }

    if (lastScrollable && !lastScrollable.isConnected) {
        lastScrollable = null;
    }
}

function animateScroll(el: HTMLElement): void {
    const state = activeScrolls.get(el);
    if (!state) return;

    if (!el.isConnected) {
        cancelAnimationFrame(state.rafId);
        activeScrolls.delete(el);
        return;
    }

    const maxX = Math.max(0, el.scrollWidth - el.clientWidth);
    const maxY = Math.max(0, el.scrollHeight - el.clientHeight);

    state.targetX = clamp(state.targetX, 0, maxX);
    state.targetY = clamp(state.targetY, 0, maxY);

    const dx = state.targetX - el.scrollLeft;
    const dy = state.targetY - el.scrollTop;

    if (Math.abs(dx) < SETTLE_EPSILON && Math.abs(dy) < SETTLE_EPSILON) {
        el.scrollLeft = state.targetX;
        el.scrollTop = state.targetY;
        cancelAnimationFrame(state.rafId);
        activeScrolls.delete(el);
        return;
    }

    const prevLeft = el.scrollLeft;
    const prevTop = el.scrollTop;

    el.scrollLeft = clamp(prevLeft + dx * LERP_FACTOR, 0, maxX);
    el.scrollTop = clamp(prevTop + dy * LERP_FACTOR, 0, maxY);

    const moved = Math.abs(el.scrollLeft - prevLeft) > 0.01 || Math.abs(el.scrollTop - prevTop) > 0.01;
    if (!moved) {
        cancelAnimationFrame(state.rafId);
        activeScrolls.delete(el);
        return;
    }

    state.rafId = requestAnimationFrame(() => animateScroll(el));
}

function enqueueSmoothScroll(el: HTMLElement, dx: number, dy: number, absolute = false): void {
    const maxX = Math.max(0, el.scrollWidth - el.clientWidth);
    const maxY = Math.max(0, el.scrollHeight - el.clientHeight);

    const state = activeScrolls.get(el) ?? { targetX: el.scrollLeft, targetY: el.scrollTop, rafId: 0 };
    state.targetX = absolute ? clamp(dx, 0, maxX) : clamp(state.targetX + dx, 0, maxX);
    state.targetY = absolute ? clamp(dy, 0, maxY) : clamp(state.targetY + dy, 0, maxY);

    const wasActive = activeScrolls.has(el);
    activeScrolls.set(el, state);

    if (!wasActive) {
        state.rafId = requestAnimationFrame(() => animateScroll(el));
    }
}

function getEscScrollTarget(): HTMLElement | null {
    if (document.activeElement instanceof Element) {
        const activeScrollable = findScrollableParent(document.activeElement, 0, 1, false);
        if (activeScrollable) return activeScrollable;
    }

    if (lastScrollable && lastScrollable.isConnected && isScrollable(lastScrollable, "y")) {
        return lastScrollable;
    }

    const root = document.scrollingElement;
    return root instanceof HTMLElement ? root : null;
}

function onWheel(event: WheelEvent): void {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    if (!(event.target instanceof Element)) return;

    cleanupDetachedScrolls();

    const dx = toPixels(event.deltaX, event.deltaMode, "x");
    const dy = toPixels(event.deltaY, event.deltaMode, "y");
    if (dx === 0 && dy === 0) return;

    const scrollable = findScrollableParent(event.target, dx, dy, true);
    if (!scrollable) return;

    lastScrollable = scrollable;
    event.preventDefault();
    enqueueSmoothScroll(scrollable, dx, dy);
}

function onKeyDown(event: KeyboardEvent): void {
    if (event.key !== "Escape" || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;

    cleanupDetachedScrolls();

    const target = getEscScrollTarget();
    if (!target) return;

    const maxY = Math.max(0, target.scrollHeight - target.clientHeight);
    if (maxY <= target.scrollTop + 1) return;

    enqueueSmoothScroll(target, target.scrollLeft, maxY, true);
}

export default definePlugin({
    name: "SmoothScrolling",
    description: "Adds smooth mouse wheel scrolling across Discord",
    authors: [{ name: "nysarielle", id: 1244907617319391315n }],

    start() {
        document.addEventListener("wheel", onWheel, { capture: true, passive: false });
        document.addEventListener("keydown", onKeyDown, { capture: true });
    },

    stop() {
        document.removeEventListener("wheel", onWheel, { capture: true });
        document.removeEventListener("keydown", onKeyDown, { capture: true });

        for (const state of activeScrolls.values()) {
            cancelAnimationFrame(state.rafId);
        }

        activeScrolls.clear();
        lastScrollable = null;
    }
});
