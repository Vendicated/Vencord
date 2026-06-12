import { get as dsGet, set as dsSet } from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import definePlugin, { makeRange, OptionType } from "@utils/types";
import { React, ReactDOM, showToast, Toasts, useCallback, useEffect, useRef, UserStore, useState } from "@webpack/common";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";

const STORE_KEY = "StreamQoL_users";

interface TileState {
    rotation: number;
    flipH: boolean;
    flipV: boolean;
    zoom: number;
    panX: number;
    panY: number;
    brightness: number;
    contrast: number;
    saturation: number;
}

const DEFAULT_STATE: TileState = Object.freeze({
    rotation: 0,
    flipH: false,
    flipV: false,
    zoom: 1,
    panX: 0,
    panY: 0,
    brightness: 100,
    contrast: 100,
    saturation: 100
});

const states = new Map<string, TileState>();
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;

const settings = definePluginSettings({
    rememberPerUser: {
        type: OptionType.BOOLEAN,
        description: "Remember rotation, flips and filters per user across restarts",
        default: true
    },
    autoFitRotated: {
        type: OptionType.BOOLEAN,
        description: "Refit sideways-rotated video so the whole frame fills the tile without cropping",
        default: true
    },
    maxZoom: {
        type: OptionType.SLIDER,
        description: "Maximum zoom level",
        markers: makeRange(2, 20, 2),
        default: 10,
        stickToMarkers: true
    }
});

function normalizeId(participantId: string) {
    return participantId.match(/\d{17,20}/)?.[0] ?? participantId;
}

function getState(userId: string): TileState {
    return states.get(userId) ?? DEFAULT_STATE;
}

function isDefault(s: TileState) {
    return (Object.keys(DEFAULT_STATE) as (keyof TileState)[]).every(k => s[k] === DEFAULT_STATE[k]);
}

function emit() {
    listeners.forEach(l => l());
}

function updateState(userId: string, patch: Partial<TileState>) {
    const next = { ...getState(userId), ...patch };
    if (isDefault(next)) states.delete(userId);
    else states.set(userId, next);
    emit();
    scheduleSave();
}

function resetState(userId: string) {
    states.delete(userId);
    emit();
    scheduleSave();
}

function scheduleSave() {
    if (!settings.store.rememberPerUser) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        const out: Record<string, Partial<TileState>> = {};
        states.forEach((s, id) => {
            const p = {
                rotation: s.rotation,
                flipH: s.flipH,
                flipV: s.flipV,
                brightness: s.brightness,
                contrast: s.contrast,
                saturation: s.saturation
            };
            if (!isDefault({ ...DEFAULT_STATE, ...p })) out[id] = p;
        });
        dsSet(STORE_KEY, out);
    }, 500);
}

function useTileState(userId: string) {
    const subscribe = useCallback((cb: () => void) => {
        listeners.add(cb);
        return () => void listeners.delete(cb);
    }, []);
    return React.useSyncExternalStore(subscribe, () => getState(userId));
}

let activeTile: string | null = null;
const activeListeners = new Set<() => void>();

function setActiveTile(id: string | null) {
    if (activeTile === id) return;
    activeTile = id;
    activeListeners.forEach(l => l());
}

function useIsActiveTile(participantId: string) {
    const subscribe = useCallback((cb: () => void) => {
        activeListeners.add(cb);
        return () => void activeListeners.delete(cb);
    }, []);
    return React.useSyncExternalStore(subscribe, () => activeTile === participantId);
}

let pinnedTile: string | null = null;
let panelCollapsed = false;

function setPinnedTile(id: string | null) {
    pinnedTile = id;
    activeListeners.forEach(l => l());
}

function setPanelCollapsed(v: boolean) {
    panelCollapsed = v;
    activeListeners.forEach(l => l());
}

function usePinnedTile() {
    const subscribe = useCallback((cb: () => void) => {
        activeListeners.add(cb);
        return () => void activeListeners.delete(cb);
    }, []);
    return React.useSyncExternalStore(subscribe, () => pinnedTile);
}

function usePanelCollapsed() {
    const subscribe = useCallback((cb: () => void) => {
        activeListeners.add(cb);
        return () => void activeListeners.delete(cb);
    }, []);
    return React.useSyncExternalStore(subscribe, () => panelCollapsed);
}

function clampPan(pan: number, size: number, zoom: number) {
    const max = (size * Math.max(zoom - 1, 0)) / 2 + size / 4;
    return Math.min(Math.max(pan, -max), max);
}

function buildTransform(s: TileState) {
    const parts: string[] = [];
    if (s.panX !== 0 || s.panY !== 0) parts.push(`translate(${s.panX}px, ${s.panY}px)`);
    if (s.rotation !== 0) parts.push(`rotate(${s.rotation}deg)`);
    if (s.zoom !== 1) parts.push(`scale(${s.zoom})`);
    if (s.flipH) parts.push("scaleX(-1)");
    if (s.flipV) parts.push("scaleY(-1)");
    return parts.join(" ");
}

function buildFilter(s: TileState) {
    const parts: string[] = [];
    if (s.brightness !== 100) parts.push(`brightness(${s.brightness}%)`);
    if (s.contrast !== 100) parts.push(`contrast(${s.contrast}%)`);
    if (s.saturation !== 100) parts.push(`saturate(${s.saturation}%)`);
    return parts.join(" ");
}

function findVideo(userId: string) {
    const videos = Array.from(document.querySelectorAll<HTMLVideoElement>(`[data-selenium-video-tile*="${userId}"] video`));
    return videos.sort((a, b) => b.videoWidth * b.videoHeight - a.videoWidth * a.videoHeight)[0];
}

function screenshotUser(userId: string) {
    const video = findVideo(userId);
    if (!video || !video.videoWidth) {
        showToast("No video found for this user", Toasts.Type.FAILURE);
        return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    canvas.toBlob(async blob => {
        if (!blob) return;
        try {
            await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
            showToast("Frame copied to clipboard", Toasts.Type.SUCCESS);
        } catch {
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `stream-${userId}-${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(a.href);
            showToast("Clipboard unavailable, saved as file instead", Toasts.Type.MESSAGE);
        }
    }, "image/png");
}

function RotateIcon() {
    return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" /></svg>;
}

function MirrorIcon() {
    return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M15 21h2v-2h-2v2zm4-12h2V7h-2v2zM3 5v14c0 1.1.9 2 2 2h4v-2H5V5h4V3H5c-1.1 0-2 .9-2 2zm16-2v2h2c0-1.1-.9-2-2-2zM11 23h2V1h-2v22zm8-6h2v-2h-2v2zM15 5h2V3h-2v2zm4 8h2v-2h-2v2zm0 8c1.1 0 2-.9 2-2h-2v2z" /></svg>;
}

function FlipIcon() {
    return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><g transform="rotate(90 12 12)"><path d="M15 21h2v-2h-2v2zm4-12h2V7h-2v2zM3 5v14c0 1.1.9 2 2 2h4v-2H5V5h4V3H5c-1.1 0-2 .9-2 2zm16-2v2h2c0-1.1-.9-2-2-2zM11 23h2V1h-2v22zm8-6h2v-2h-2v2zM15 5h2V3h-2v2zm4 8h2v-2h-2v2zm0 8c1.1 0 2-.9 2-2h-2v2z" /></g></svg>;
}

function ZoomIcon() {
    return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></svg>;
}

function FilterIcon() {
    return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z" /></svg>;
}

function CameraIcon() {
    return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM9 2 7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" /></svg>;
}

function PinIcon() {
    return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z" /></svg>;
}

function CollapseIcon() {
    return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" /></svg>;
}

function ExpandIcon() {
    return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>;
}

function ResetIcon() {
    return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6a7 7 0 1 1 7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.96 8.96 0 0 0 13 21a9 9 0 0 0 0-18z" /></svg>;
}

const rootStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    zIndex: 5
};

const btnStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    padding: 0,
    border: "none",
    borderRadius: 4,
    background: "rgba(0, 0, 0, 0.6)",
    color: "#fff",
    cursor: "pointer"
};

const btnActiveStyle: CSSProperties = {
    background: "var(--brand-500, #5865f2)"
};

const dockStyle: CSSProperties = {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: "translateY(-50%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    padding: 8,
    borderRadius: 8,
    background: "var(--background-floating, rgba(0, 0, 0, 0.85))",
    zIndex: 100,
    pointerEvents: "auto",
    boxShadow: "var(--elevation-high, 0 8px 16px rgba(0,0,0,.24))"
};

const dockHeaderStyle: CSSProperties = {
    maxWidth: 96,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: "var(--text-muted, #aaa)",
    fontSize: 11,
    fontWeight: 600
};

const headerRowStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 4
};

const slidersBoxStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    width: 210
};

const coverStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    pointerEvents: "auto",
    cursor: "grab",
    zIndex: 2
};

const sliderRowStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 6,
    color: "var(--text-normal, #fff)",
    fontSize: 12
};

function OverlayButton({ label, active, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: ReactNode; }) {
    return (
        <button
            title={label}
            style={{ ...btnStyle, ...(active ? btnActiveStyle : {}) }}
            onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                onClick();
            }}
            onContextMenu={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
        >
            {children}
        </button>
    );
}

function FilterSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void; }) {
    return (
        <div style={sliderRowStyle}>
            <span style={{ width: 64 }}>{label}</span>
            <input
                type="range"
                min={0}
                max={300}
                value={value}
                style={{ flex: 1 }}
                onChange={e => onChange(Number(e.currentTarget.value))}
            />
            <span style={{ width: 36, textAlign: "right" }}>{value}%</span>
        </div>
    );
}

function TileOverlay({ participantId }: { participantId: string; }) {
    const userId = normalizeId(participantId);
    const state = useTileState(userId);
    const isActive = useIsActiveTile(participantId);
    const pinned = usePinnedTile();
    const collapsed = usePanelCollapsed();
    const [interact, setInteract] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [container, setContainer] = useState<Element | null>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const coverRef = useRef<HTMLDivElement>(null);
    const drag = useRef<{ x: number; y: number; panX: number; panY: number; } | null>(null);

    const rotated = state.rotation % 180 !== 0;

    useEffect(() => {
        const tile = rootRef.current?.parentElement;
        if (!tile) return;
        setContainer(rootRef.current?.closest('[class*="callContainer"]') ?? null);
        const onEnter = () => {
            if (pinnedTile === null && tile.querySelector("video")) setActiveTile(participantId);
        };
        tile.addEventListener("mouseenter", onEnter);
        if (activeTile === null && tile.querySelector("video")) setActiveTile(participantId);
        return () => {
            tile.removeEventListener("mouseenter", onEnter);
            if (pinnedTile === participantId) setPinnedTile(null);
            if (activeTile === participantId) setActiveTile(null);
        };
    }, [participantId]);

    useEffect(() => {
        const el = coverRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const cur = getState(userId);
            const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
            const zoom = Math.min(Math.max(cur.zoom * factor, 1), settings.store.maxZoom);
            if (zoom === 1) {
                updateState(userId, { zoom, panX: 0, panY: 0 });
                return;
            }
            const rect = el.getBoundingClientRect();
            const cx = e.clientX - rect.left - rect.width / 2;
            const cy = e.clientY - rect.top - rect.height / 2;
            const ratio = zoom / cur.zoom;
            updateState(userId, {
                zoom,
                panX: clampPan(cx - ratio * (cx - cur.panX), rect.width, zoom),
                panY: clampPan(cy - ratio * (cy - cur.panY), rect.height, zoom)
            });
        };
        el.addEventListener("wheel", onWheel, { passive: false });
        return () => el.removeEventListener("wheel", onWheel);
    }, [interact, userId]);

    const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        const cur = getState(userId);
        drag.current = { x: e.clientX, y: e.clientY, panX: cur.panX, panY: cur.panY };
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
        if (!drag.current) return;
        const cur = getState(userId);
        const rect = e.currentTarget.getBoundingClientRect();
        updateState(userId, {
            panX: clampPan(drag.current.panX + e.clientX - drag.current.x, rect.width, cur.zoom),
            panY: clampPan(drag.current.panY + e.clientY - drag.current.y, rect.height, cur.zoom)
        });
    };

    const onPointerUp = () => {
        drag.current = null;
    };

    const esc = participantId.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
    const sel = `[data-selenium-video-tile="${esc}"]`;
    const transform = buildTransform(state);
    const filter = buildFilter(state);
    const showPanel = isActive && container;
    const user = UserStore.getUser(userId);
    const displayName = (user as any)?.globalName ?? user?.username ?? "Stream";
    const sideways = rotated && settings.store.autoFitRotated;

    const videoRule = sideways
        ? `${sel} video { position: absolute !important; left: 50% !important; top: 50% !important; width: 100cqh !important; height: 100cqw !important; max-width: none !important; max-height: none !important; object-fit: contain !important; transform: translate(-50%, -50%)${transform ? " " + transform : ""} !important; filter: ${filter || "none"} !important; }`
        : `${sel} video { transform: ${transform || "none"} !important; filter: ${filter || "none"} !important; }`;

    const css = [
        sideways ? `${sel} { container-type: size; overflow: hidden; }` : "",
        videoRule,
        `${sel}:not(:has(video)) .vc-sqol-root { display: none; }`
    ].filter(Boolean).join("\n");

    const panel = collapsed ? (
        <div
            style={dockStyle}
            onClick={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
            onContextMenu={e => e.stopPropagation()}
        >
            <OverlayButton label="Show stream controls" onClick={() => setPanelCollapsed(false)}>
                <ExpandIcon />
            </OverlayButton>
        </div>
    ) : (
        <div
            style={dockStyle}
            onClick={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
            onContextMenu={e => e.stopPropagation()}
        >
            <div style={headerRowStyle}>
                <div style={dockHeaderStyle}>{displayName}</div>
                <OverlayButton
                    label={pinned === participantId ? "Unpin: follow hovered tile again" : "Pin controls to this stream"}
                    active={pinned === participantId}
                    onClick={() => setPinnedTile(pinned === participantId ? null : participantId)}
                >
                    <PinIcon />
                </OverlayButton>
                <OverlayButton label="Hide panel" onClick={() => setPanelCollapsed(true)}>
                    <CollapseIcon />
                </OverlayButton>
            </div>
            <OverlayButton label="Rotate 90°" onClick={() => updateState(userId, { rotation: (state.rotation + 90) % 360 })}>
                <RotateIcon />
            </OverlayButton>
            <OverlayButton label="Mirror" active={state.flipH} onClick={() => updateState(userId, { flipH: !state.flipH })}>
                <MirrorIcon />
            </OverlayButton>
            <OverlayButton label="Flip vertical" active={state.flipV} onClick={() => updateState(userId, { flipV: !state.flipV })}>
                <FlipIcon />
            </OverlayButton>
            <OverlayButton label="Zoom & pan: scroll to zoom, drag to pan, double-click to reset" active={interact} onClick={() => setInteract(!interact)}>
                <ZoomIcon />
            </OverlayButton>
            <OverlayButton label="Filters" active={showFilters} onClick={() => setShowFilters(!showFilters)}>
                <FilterIcon />
            </OverlayButton>
            <OverlayButton label="Screenshot" onClick={() => screenshotUser(userId)}>
                <CameraIcon />
            </OverlayButton>
            <OverlayButton label="Reset" onClick={() => {
                resetState(userId);
                setInteract(false);
                setShowFilters(false);
            }}>
                <ResetIcon />
            </OverlayButton>
            {showFilters && (
                <div style={slidersBoxStyle}>
                    <FilterSlider label="Brightness" value={state.brightness} onChange={v => updateState(userId, { brightness: v })} />
                    <FilterSlider label="Contrast" value={state.contrast} onChange={v => updateState(userId, { contrast: v })} />
                    <FilterSlider label="Saturation" value={state.saturation} onChange={v => updateState(userId, { saturation: v })} />
                </div>
            )}
        </div>
    );

    return (
        <div ref={rootRef} className="vc-sqol-root" style={rootStyle}>
            <style>{css}</style>
            {interact && (
                <div
                    ref={coverRef}
                    style={{ ...coverStyle, cursor: drag.current ? "grabbing" : "grab" }}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onClick={e => e.stopPropagation()}
                    onDoubleClick={e => {
                        e.stopPropagation();
                        updateState(userId, { zoom: 1, panX: 0, panY: 0 });
                        setInteract(false);
                    }}
                />
            )}
            {showPanel && ReactDOM.createPortal(panel, container)}
        </div>
    );
}


export default definePlugin({
    name: "StreamQoL",
    description: "Rotate, mirror, flip, zoom, pan, color-correct and screenshot streams and cameras, locally on your client",
    authors: [{ name: "sfdb", id: 870276689912012810n }],
    tags: ["Voice", "Media", "Utility"],
    settings,
    patches: [
        {
            find: "\"data-selenium-video-tile\":",
            replacement: {
                match: /(?<=function\((\i),\i\)\{.{0,100})(?=let.{20,40},style:)/,
                replace: "$1.children=$self.wrapTile($1);"
            }
        }
    ],

    wrapTile(props: any) {
        const id = props?.participantUserId;
        if (!id) return props.children;
        return (
            <>
                {props.children}
                <ErrorBoundary noop>
                    <TileOverlay participantId={String(id)} />
                </ErrorBoundary>
            </>
        );
    },

    async start() {
        if (!settings.store.rememberPerUser) return;
        const saved = await dsGet<Record<string, Partial<TileState>>>(STORE_KEY);
        if (!saved) return;
        for (const [id, p] of Object.entries(saved)) {
            const merged = { ...DEFAULT_STATE, ...p };
            if (!isDefault(merged)) states.set(id, merged);
        }
        emit();
    },

    stop() {
        states.clear();
        emit();
    }
});
