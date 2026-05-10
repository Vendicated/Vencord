/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { IconProps, OptionType, PluginNative } from "@utils/types";
import { Message, MessageAttachment } from "@vencord/discord-types";
import { Tooltip, useEffect, useMemo, useRef, useState } from "@webpack/common";
import type { ReactNode } from "react";

const Native = VencordNative.pluginHelpers.PdfViewer as PluginNative<typeof import("./native")>;

const logger = new Logger("PdfViewer");

const PDFJS_VERSION = "3.11.174";
const PDFJS_LIB_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
const PDFJS_WORKER_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];
const RENDER_PAGE_NEIGHBOURS = 1;

const settings = definePluginSettings({
    maxFileSizeMb: {
        type: OptionType.SLIDER,
        description: "Largest PDF that can be previewed inline",
        markers: [5, 10, 25, 50, 100],
        stickToMarkers: true,
        default: 25,
    },
    cacheEntries: {
        type: OptionType.SLIDER,
        description: "Number of recently opened PDFs to keep in memory",
        markers: [0, 1, 3, 5, 10],
        stickToMarkers: true,
        default: 3,
        onChange: () => trimCache(),
    },
});

interface PdfPageProxy {
    pageNumber: number;
    getViewport(opts: { scale: number; }): { width: number; height: number; };
    render(opts: { canvasContext: CanvasRenderingContext2D; viewport: any; }): { promise: Promise<void>; cancel(): void; };
    cleanup(): void;
}

interface PdfDocumentProxy {
    numPages: number;
    getPage(pageNumber: number): Promise<PdfPageProxy>;
    destroy(): Promise<void>;
}

interface PdfJsLib {
    GlobalWorkerOptions: { workerSrc: string; };
    getDocument(opts: any): { promise: Promise<PdfDocumentProxy>; };
}

declare global {
    interface Window { pdfjsLib?: PdfJsLib; }
}

interface CacheEntry {
    bytes: Uint8Array;
}

const cache = new Map<string, CacheEntry>();

function maxFileSizeBytes() {
    return Math.max(1, settings.store.maxFileSizeMb) * 1024 * 1024;
}

function cacheKey(attachment: MessageAttachment) {
    return `${attachment.id}:${attachment.url}`;
}

function trimCache() {
    const max = Math.max(0, Math.round(settings.store.cacheEntries));
    while (cache.size > max) {
        const oldest = cache.keys().next().value;
        if (!oldest) break;
        cache.delete(oldest);
    }
}

function clearCache() {
    cache.clear();
}

function getCached(key: string) {
    const entry = cache.get(key);
    if (!entry) return null;
    cache.delete(key);
    cache.set(key, entry);
    return entry.bytes;
}

function setCached(key: string, bytes: Uint8Array) {
    if (settings.store.cacheEntries <= 0) return;
    cache.delete(key);
    cache.set(key, { bytes });
    trimCache();
}

function toUint8Array(value: unknown): Uint8Array {
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (ArrayBuffer.isView(value)) {
        const v = value as ArrayBufferView;
        return new Uint8Array(v.buffer as ArrayBuffer, v.byteOffset, v.byteLength);
    }
    if (Array.isArray(value)) return new Uint8Array(value);
    if (value && typeof value === "object") {
        const obj = value as { data?: unknown; length?: number; };
        if (Array.isArray(obj.data)) return new Uint8Array(obj.data);
        if (typeof obj.length === "number") return new Uint8Array(value as ArrayLike<number>);
    }
    throw new Error("Native fetcher returned non-binary data");
}

async function loadBytes(attachment: MessageAttachment) {
    const key = cacheKey(attachment);
    const cached = getCached(key);
    if (cached) return cached;

    const raw = await Native.fetchPdf(attachment.url, maxFileSizeBytes());
    if (!raw) throw new Error("Native fetcher returned an empty payload");

    const view = toUint8Array(raw);
    if (view.byteLength < 4) throw new Error("Native fetcher returned a truncated payload");

    const dest = new Uint8Array(view.byteLength);
    dest.set(view);

    setCached(key, dest);
    return dest;
}

let pdfjsLoadPromise: Promise<PdfJsLib> | null = null;

function loadPdfJs(): Promise<PdfJsLib> {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (pdfjsLoadPromise) return pdfjsLoadPromise;

    pdfjsLoadPromise = new Promise<PdfJsLib>((resolve, reject) => {
        const finish = () => {
            if (window.pdfjsLib) {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
                resolve(window.pdfjsLib);
            } else {
                reject(new Error("PDF.js loaded but window.pdfjsLib is missing"));
            }
        };

        const existing = document.querySelector(`script[data-vc-pdfjs="${PDFJS_VERSION}"]`) as HTMLScriptElement | null;
        if (existing) {
            existing.addEventListener("load", finish);
            existing.addEventListener("error", () => reject(new Error("Failed to load PDF.js")));
            return;
        }

        const script = document.createElement("script");
        script.src = PDFJS_LIB_URL;
        script.async = true;
        script.dataset.vcPdfjs = PDFJS_VERSION;
        script.addEventListener("load", finish);
        script.addEventListener("error", () => {
            pdfjsLoadPromise = null;
            reject(new Error("Failed to load PDF.js from cdnjs"));
        });
        document.head.appendChild(script);
    });

    return pdfjsLoadPromise;
}

function isPdfAttachment(attachment: MessageAttachment) {
    if (attachment.content_type === "application/pdf") return true;
    return attachment.filename?.toLowerCase().endsWith(".pdf") ?? false;
}

function formatBytes(bytes: number) {
    if (!Number.isFinite(bytes) || bytes < 0) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function getErrorMessage(error: unknown) {
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === "string" && error) return error;
    if (error && typeof error === "object" && "message" in (error as any) && (error as any).message) return String((error as any).message);
    return "Unknown error";
}

type SvgIconProps = IconProps & { size?: number; };

function SvgIcon({ children, size, height, width, className }: SvgIconProps & { children: ReactNode; }) {
    const dimension = size ?? height ?? width ?? 18;
    return (
        <svg
            aria-hidden="true"
            className={className}
            fill="none"
            height={dimension}
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            width={dimension}
        >
            {children}
        </svg>
    );
}

const FileIcon = (props: SvgIconProps) => (
    <SvgIcon {...props}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6" />
        <path d="M9 13h6" />
        <path d="M9 17h6" />
    </SvgIcon>
);

const EyeIcon = (props: SvgIconProps) => (
    <SvgIcon {...props}>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
    </SvgIcon>
);

const EyeOffIcon = (props: SvgIconProps) => (
    <SvgIcon {...props}>
        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
        <path d="m2 2 20 20" />
    </SvgIcon>
);

const ExternalIcon = (props: SvgIconProps) => (
    <SvgIcon {...props}>
        <path d="M15 3h6v6" />
        <path d="M10 14 21 3" />
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </SvgIcon>
);

const RetryIcon = (props: SvgIconProps) => (
    <SvgIcon {...props}>
        <path d="M21 12a9 9 0 1 1-3-6.7" />
        <path d="M21 4v5h-5" />
    </SvgIcon>
);

const ZoomInIcon = (props: SvgIconProps) => (
    <SvgIcon {...props}>
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
        <path d="M11 8v6" />
        <path d="M8 11h6" />
    </SvgIcon>
);

const ZoomOutIcon = (props: SvgIconProps) => (
    <SvgIcon {...props}>
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
        <path d="M8 11h6" />
    </SvgIcon>
);

const FitWidthIcon = (props: SvgIconProps) => (
    <SvgIcon {...props}>
        <path d="M4 5v14" />
        <path d="M20 5v14" />
        <path d="M8 12h8" />
        <path d="m8 12 3-3" />
        <path d="m8 12 3 3" />
        <path d="m16 12-3-3" />
        <path d="m16 12-3 3" />
    </SvgIcon>
);

function Spinner() {
    return <span aria-hidden="true" className="vc-pdfViewer-spinner" />;
}

interface IconButtonProps {
    label: string;
    children: ReactNode;
    disabled?: boolean;
    active?: boolean;
    onClick(): void;
}

function IconButton({ label, children, disabled, active, onClick }: IconButtonProps) {
    return (
        <Tooltip text={label}>
            {tooltipProps => (
                <button
                    {...tooltipProps}
                    aria-label={label}
                    aria-pressed={active ? "true" : undefined}
                    className={`vc-pdfViewer-button${active ? " vc-pdfViewer-button-active" : ""}`}
                    disabled={disabled}
                    onClick={event => {
                        event.stopPropagation();
                        if (!disabled) onClick();
                    }}
                    type="button"
                >
                    {children}
                </button>
            )}
        </Tooltip>
    );
}

interface PageState {
    pageNumber: number;
    width: number;
    height: number;
}

function PdfPage({
    page,
    state,
    scale,
    shouldRender,
}: {
    page: PdfPageProxy | null;
    state: PageState;
    scale: number;
    shouldRender: boolean;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const renderedKeyRef = useRef<string | null>(null);

    const { width, height } = useMemo(() => {
        if (!page) return { width: state.width * scale, height: state.height * scale };
        const viewport = page.getViewport({ scale });
        return { width: viewport.width, height: viewport.height };
    }, [page, scale, state.width, state.height]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !page || !shouldRender) return;

        const key = `${state.pageNumber}@${scale.toFixed(3)}`;
        if (renderedKeyRef.current === key) return;

        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const viewport = page.getViewport({ scale: scale * dpr });
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${viewport.width / dpr}px`;
        canvas.style.height = `${viewport.height / dpr}px`;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const task = page.render({ canvasContext: ctx, viewport });
        let cancelled = false;
        task.promise
            .then(() => {
                if (!cancelled) renderedKeyRef.current = key;
            })
            .catch(err => {
                if (cancelled) return;
                if (err?.name === "RenderingCancelledException") return;
                logger.error("PDF page render failed", err);
            });

        return () => {
            cancelled = true;
            try { task.cancel(); } catch { /* */ }
        };
    }, [page, scale, shouldRender, state.pageNumber]);

    return (
        <div
            className="vc-pdfViewer-page"
            data-page-number={state.pageNumber}
            style={{ width, height }}
        >
            {shouldRender
                ? <canvas ref={canvasRef} />
                : <div className="vc-pdfViewer-pagePlaceholder"><Spinner /></div>}
            <div aria-hidden="true" className="vc-pdfViewer-pageBadge">page {state.pageNumber}</div>
        </div>
    );
}

function PdfDocumentView({ bytes }: { bytes: Uint8Array; }) {
    const [pdf, setPdf] = useState<PdfDocumentProxy | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [pageStates, setPageStates] = useState<PageState[]>([]);
    const [pages, setPages] = useState<Map<number, PdfPageProxy>>(new Map());
    const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([1]));
    const [scale, setScale] = useState<number | null>(null);
    const [containerWidth, setContainerWidth] = useState(0);

    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let cancelled = false;
        let docRef: PdfDocumentProxy | null = null;

        (async () => {
            try {
                const lib = await loadPdfJs();
                if (cancelled) return;

                const data = new Uint8Array(bytes.byteLength);
                data.set(bytes);

                const task = lib.getDocument({
                    data,
                    isEvalSupported: false,
                    disableAutoFetch: true,
                    disableStream: true,
                });
                const doc = await task.promise;
                if (cancelled) {
                    doc.destroy().catch(() => null);
                    return;
                }
                docRef = doc;
                setPdf(doc);

                const firstPage = await doc.getPage(1);
                if (cancelled) return;
                const v = firstPage.getViewport({ scale: 1 });
                const baseStates: PageState[] = [{ pageNumber: 1, width: v.width, height: v.height }];
                for (let i = 2; i <= doc.numPages; i++) {
                    baseStates.push({ pageNumber: i, width: v.width, height: v.height });
                }
                setPageStates(baseStates);
                setPages(prev => {
                    const next = new Map(prev);
                    next.set(1, firstPage);
                    return next;
                });
            } catch (err) {
                if (cancelled) return;
                logger.error("Failed to open PDF", err);
                const msg = getErrorMessage(err);
                setLoadError(msg.toLowerCase().includes("password") ? "This PDF is password-protected." : msg);
            }
        })();

        return () => {
            cancelled = true;
            if (docRef) docRef.destroy().catch(() => null);
        };
    }, [bytes]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const update = () => setContainerWidth(container.clientWidth);
        update();

        const ro = new ResizeObserver(update);
        ro.observe(container);
        return () => ro.disconnect();
    }, [pageStates.length]);

    useEffect(() => {
        if (!pdf || pageStates.length === 0) return;
        const container = containerRef.current;
        if (!container) return;

        const observer = new IntersectionObserver(entries => {
            setVisiblePages(prev => {
                const next = new Set(prev);
                let changed = false;
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue;
                    const num = Number((entry.target as HTMLElement).dataset.pageNumber);
                    if (!Number.isFinite(num)) continue;
                    for (let i = num - RENDER_PAGE_NEIGHBOURS; i <= num + RENDER_PAGE_NEIGHBOURS; i++) {
                        if (i >= 1 && i <= pdf.numPages && !next.has(i)) {
                            next.add(i);
                            changed = true;
                        }
                    }
                }
                return changed ? next : prev;
            });
        }, { root: container, rootMargin: "200px 0px 200px 0px" });

        for (const el of container.querySelectorAll<HTMLElement>(".vc-pdfViewer-page")) {
            observer.observe(el);
        }

        return () => observer.disconnect();
    }, [pdf, pageStates.length]);

    useEffect(() => {
        if (!pdf) return;
        let cancelled = false;
        const toFetch = [...visiblePages].filter(num => !pages.has(num));
        if (!toFetch.length) return;

        (async () => {
            const additions: [number, PdfPageProxy][] = [];
            for (const num of toFetch) {
                try {
                    const page = await pdf.getPage(num);
                    if (cancelled) return;
                    additions.push([num, page]);
                } catch (err) {
                    logger.error(`Failed to load page ${num}`, err);
                }
            }
            if (!additions.length || cancelled) return;
            setPages(prev => {
                const next = new Map(prev);
                for (const [num, p] of additions) next.set(num, p);
                return next;
            });
            setPageStates(prev => prev.map(state => {
                const fetched = additions.find(([n]) => n === state.pageNumber);
                if (!fetched) return state;
                const v = fetched[1].getViewport({ scale: 1 });
                return { pageNumber: state.pageNumber, width: v.width, height: v.height };
            }));
        })();

        return () => {
            cancelled = true;
        };
    }, [visiblePages, pdf]);

    const effectiveScale = useMemo(() => {
        if (scale != null) return scale;
        if (!pageStates.length || containerWidth <= 0) return 1;
        return Math.max(0.25, Math.min(3, (containerWidth - 32) / pageStates[0].width));
    }, [scale, pageStates, containerWidth]);

    const zoomIn = () => setScale(current => {
        const base = current ?? effectiveScale;
        return ZOOM_LEVELS.find(level => level > base + 0.001) ?? base;
    });

    const zoomOut = () => setScale(current => {
        const base = current ?? effectiveScale;
        return [...ZOOM_LEVELS].reverse().find(level => level < base - 0.001) ?? base;
    });

    if (loadError) {
        return (
            <div className="vc-pdfViewer-centeredState vc-pdfViewer-error">
                <span>Couldn't open PDF: {loadError}</span>
            </div>
        );
    }

    if (!pdf) {
        return (
            <div className="vc-pdfViewer-centeredState">
                <Spinner />
                <span>Opening PDF…</span>
            </div>
        );
    }

    return (
        <div className="vc-pdfViewer-document">
            <div className="vc-pdfViewer-toolbar">
                <span className="vc-pdfViewer-pageCount">
                    {pdf.numPages} {pdf.numPages === 1 ? "page" : "pages"}
                </span>
                <span className="vc-pdfViewer-toolbarSpacer" />
                <IconButton label="Zoom out" onClick={zoomOut}>
                    <ZoomOutIcon />
                </IconButton>
                <span className="vc-pdfViewer-zoomLabel">{Math.round(effectiveScale * 100)}%</span>
                <IconButton label="Zoom in" onClick={zoomIn}>
                    <ZoomInIcon />
                </IconButton>
                <IconButton label="Fit width" active={scale == null} onClick={() => setScale(null)}>
                    <FitWidthIcon />
                </IconButton>
            </div>
            <div className="vc-pdfViewer-pages" ref={containerRef}>
                {pageStates.map(state => (
                    <PdfPage
                        key={state.pageNumber}
                        page={pages.get(state.pageNumber) ?? null}
                        scale={effectiveScale}
                        shouldRender={visiblePages.has(state.pageNumber) && pages.has(state.pageNumber)}
                        state={state}
                    />
                ))}
            </div>
        </div>
    );
}

function PdfPreviewBody({ attachment }: { attachment: MessageAttachment; }) {
    const [bytes, setBytes] = useState<Uint8Array | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [reloadId, setReloadId] = useState(0);

    useEffect(() => {
        let cancelled = false;
        setBytes(null);
        setError(null);

        loadBytes(attachment)
            .then(buffer => {
                if (!cancelled) setBytes(buffer);
            })
            .catch(loadError => {
                logger.error("Failed to fetch PDF", loadError);
                if (!cancelled) setError(getErrorMessage(loadError));
            });

        return () => {
            cancelled = true;
        };
    }, [attachment.id, attachment.url, reloadId]);

    if (error) {
        return (
            <div className="vc-pdfViewer-centeredState vc-pdfViewer-error">
                <span>Couldn't load PDF: {error}</span>
                <button
                    className="vc-pdfViewer-textButton"
                    onClick={event => {
                        event.stopPropagation();
                        setReloadId(id => id + 1);
                    }}
                    type="button"
                >
                    <RetryIcon size={14} /> Retry
                </button>
            </div>
        );
    }

    if (!bytes) {
        return (
            <div className="vc-pdfViewer-centeredState">
                <Spinner />
                <span>Loading PDF…</span>
            </div>
        );
    }

    return <PdfDocumentView bytes={bytes} />;
}

function PdfAttachmentPreview({ attachment }: { attachment: MessageAttachment; }) {
    const tooLarge = attachment.size > maxFileSizeBytes();
    const [open, setOpen] = useState(false);
    const sizeLabel = useMemo(() => formatBytes(attachment.size), [attachment.size]);

    const togglePreview = () => {
        if (tooLarge) return;
        setOpen(value => !value);
    };

    return (
        <div className="vc-pdfViewer-shell" onClick={event => event.stopPropagation()}>
            <div className="vc-pdfViewer-fileBar">
                <FileIcon size={22} />
                <div className="vc-pdfViewer-fileMeta">
                    <span className="vc-pdfViewer-fileName" title={attachment.filename}>
                        {attachment.filename}
                    </span>
                    <span className="vc-pdfViewer-fileSize">
                        PDF · {sizeLabel}
                        {tooLarge && (
                            <span className="vc-pdfViewer-fileWarn">
                                {" "}· exceeds {settings.store.maxFileSizeMb} MB limit
                            </span>
                        )}
                    </span>
                </div>

                <IconButton
                    active={open}
                    disabled={tooLarge}
                    label={tooLarge
                        ? `Preview disabled — PDF is over ${settings.store.maxFileSizeMb} MB`
                        : open ? "Hide preview" : "Preview PDF"}
                    onClick={togglePreview}
                >
                    {open ? <EyeOffIcon /> : <EyeIcon />}
                </IconButton>

                <IconButton
                    label="Open in browser"
                    onClick={() => VencordNative.native.openExternal(attachment.url)}
                >
                    <ExternalIcon />
                </IconButton>
            </div>

            {open && <PdfPreviewBody attachment={attachment} />}
        </div>
    );
}

const WrappedPreview = ErrorBoundary.wrap(PdfAttachmentPreview, { noop: true });

export default definePlugin({
    name: "PdfViewer",
    description: "Preview PDF attachments inline without downloading them first",
    tags: ["Media", "Utility", "Chat"],
    authors: [Devs.vp9, Devs.semon009],
    settings,

    renderMessageAccessory({ message }) {
        const msg = message as Message;
        if (!msg?.attachments?.length) return null;

        const pdfAttachments = msg.attachments.filter(isPdfAttachment);
        if (!pdfAttachments.length) return null;

        return (
            <div className="vc-pdfViewer-stack">
                {pdfAttachments.map((attachment: MessageAttachment) => (
                    <WrappedPreview attachment={attachment} key={attachment.id} />
                ))}
            </div>
        );
    },

    stop() {
        clearCache();
    },
});
