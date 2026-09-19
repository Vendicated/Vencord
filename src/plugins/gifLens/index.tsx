/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addGlobalContextMenuPatch, findGroupChildrenByChildId, removeGlobalContextMenuPatch } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { Divider } from "@components/Divider";
import { Flex } from "@components/Flex";
import { Heading } from "@components/Heading";
import { EyeIcon } from "@components/Icons";
import { Paragraph } from "@components/Paragraph";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import {
    Menu,
    Modal,
    openModal,
    Text,
    useEffect,
    useState } from "@webpack/common";

import {
    clearAllRecords,
    findCachedRecord,
    getAllGifRecords,
    getGifRecord,
    getMemoryCache,
    getStoredRecordCount,
    saveGifRecord } from "./db";
import {
    addProgressListener,
    extractTextFromMedia,
    startBackgroundIndexing,
    stopBackgroundIndexing,
    terminateOcrWorker,
    togglePauseBackgroundIndexing } from "./ocr";
import { searchFavorites } from "./search";
import { extractSlugTokens } from "./slug";
import type {
    Gif,
    IndexingProgress
} from "./types";

const settings = definePluginSettings({
    enableOcr: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Extract and search text from favorite GIFs and images using OCR"
    },
    deepScan: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Deep Multi-Frame Scan: checks multiple timestamps for late-appearing captions"
    },
    enableSlugSearch: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Search keywords from URL slugs and file names"
    },
    concurrency: {
        type: OptionType.NUMBER,
        default: 4,
        description: "Parallel background OCR threads (1 = Eco, 4 = Fast, 6 = Turbo)"
    }
});

let lastContextMenuTarget: HTMLElement | null = null;
let lastContextMenuTime = 0;
let liveIndexingProgress: IndexingProgress | null = null;

addProgressListener(p => {
    liveIndexingProgress = p.isIndexing && p.total > 0 ? p : null;
});

function onContextMenuCapture(e: MouseEvent) {
    lastContextMenuTarget = e.target as HTMLElement;
    lastContextMenuTime = Date.now();
}

function isCandidateUrl(url: any): boolean {
    if (!url || typeof url !== "string") return false;
    if (url.startsWith("data:image/") || url.startsWith("data:video/")) return true;
    if (!url.startsWith("http://") && !url.startsWith("https://")) return false;
    const lower = url.toLowerCase();
    return (
        lower.includes("tenor.com") ||
        lower.includes("giphy.com") ||
        lower.includes("discordapp") ||
        lower.includes(".gif") ||
        lower.includes(".webp") ||
        lower.includes(".png") ||
        lower.includes(".jpg") ||
        lower.includes(".jpeg") ||
        lower.includes(".mp4") ||
        lower.includes(".webm") ||
        lower.includes("format=")
    );
}

function getFiber(node: Node | null): any {
    if (!node) return null;
    const key = Object.keys(node).find(
        k => k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$")
    );
    return key ? (node as any)[key] : null;
}

function findUrlInFiber(fiber: any): { url?: string; src?: string; } | null {
    let curr = fiber;
    let depth = 0;
    while (curr && depth < 25) {
        const p = curr.memoizedProps;
        if (p) {
            let u = typeof p.url === "string" && isCandidateUrl(p.url) ? p.url : undefined;
            let s = typeof p.src === "string" && isCandidateUrl(p.src) ? p.src : undefined;
            if (p.item) {
                u = u || (typeof p.item.url === "string" && isCandidateUrl(p.item.url) ? p.item.url : undefined);
                s = s || (typeof p.item.src === "string" && isCandidateUrl(p.item.src) ? p.item.src : undefined);
                s = s || (typeof p.item.gif_src === "string" && isCandidateUrl(p.item.gif_src) ? p.item.gif_src : undefined);
            }
            if (p.gif) {
                u = u || (typeof p.gif.url === "string" && isCandidateUrl(p.gif.url) ? p.gif.url : undefined);
                s = s || (typeof p.gif.src === "string" && isCandidateUrl(p.gif.src) ? p.gif.src : undefined);
            }
            if (u || s) return { url: u, src: s };
        }
        curr = curr.return;
        depth++;
    }
    return null;
}

function findUrlInElement(el: HTMLElement | null): string | null {
    if (!el) return null;

    if (el instanceof HTMLImageElement && isCandidateUrl(el.src)) return el.src;
    if (el instanceof HTMLMediaElement && isCandidateUrl(el.currentSrc || el.src)) return el.currentSrc || el.src;
    if (el instanceof HTMLAnchorElement && isCandidateUrl(el.href)) return el.href;

    const img = el.querySelector("img");
    if (img && isCandidateUrl(img.src)) return img.src;

    const video = el.querySelector("video");
    if (video && isCandidateUrl(video.currentSrc || video.src)) return video.currentSrc || video.src;

    const source = el.querySelector("source");
    if (source && isCandidateUrl(source.src)) return source.src;

    const anchor = el.querySelector("a");
    if (anchor && isCandidateUrl(anchor.href)) return anchor.href;

    const closestAnchor = el.closest("a");
    if (closestAnchor && isCandidateUrl(closestAnchor.href)) return closestAnchor.href;

    const closestImg = el.closest("img");
    if (closestImg && isCandidateUrl(closestImg.src)) return closestImg.src;

    const parent = el.parentElement;
    if (parent) {
        const pImg = parent.querySelector("img");
        if (pImg && isCandidateUrl(pImg.src)) return pImg.src;
        const pVideo = parent.querySelector("video");
        if (pVideo && isCandidateUrl(pVideo.currentSrc || pVideo.src)) return pVideo.currentSrc || pVideo.src;
    }

    return null;
}

function findUrlInArgs(args: any[]): { url?: string; src?: string; } | null {
    for (const arg of args) {
        if (!arg || typeof arg !== "object") continue;
        let u = typeof arg.url === "string" && isCandidateUrl(arg.url) ? arg.url : undefined;
        let s = typeof arg.src === "string" && isCandidateUrl(arg.src) ? arg.src : undefined;
        s = s || (typeof arg.itemSrc === "string" && isCandidateUrl(arg.itemSrc) ? arg.itemSrc : undefined);
        u = u || (typeof arg.itemHref === "string" && isCandidateUrl(arg.itemHref) ? arg.itemHref : undefined);
        u = u || (typeof arg.href === "string" && isCandidateUrl(arg.href) ? arg.href : undefined);
        if (arg.item) {
            u = u || (typeof arg.item.url === "string" && isCandidateUrl(arg.item.url) ? arg.item.url : undefined);
            s = s || (typeof arg.item.src === "string" && isCandidateUrl(arg.item.src) ? arg.item.src : undefined);
        }
        if (arg.gif) {
            u = u || (typeof arg.gif.url === "string" && isCandidateUrl(arg.gif.url) ? arg.gif.url : undefined);
            s = s || (typeof arg.gif.src === "string" && isCandidateUrl(arg.gif.src) ? arg.gif.src : undefined);
        }
        if (arg.target && arg.target instanceof HTMLElement) {
            const el = findUrlInElement(arg.target);
            if (el) return { url: el, src: el };
            const fib = findUrlInFiber(getFiber(arg.target));
            if (fib) return fib;
        }
        if (u || s) return { url: u, src: s };
    }
    return null;
}

function findUrlInChildren(items: any[]): string | null {
    for (const item of items) {
        if (!item) continue;
        if (Array.isArray(item)) {
            const found = findUrlInChildren(item);
            if (found) return found;
        }
        if (item.props) {
            for (const key of ["url", "src", "href", "link", "target"]) {
                const val = item.props[key];
                if (typeof val === "string" && isCandidateUrl(val)) return val;
            }
            if (item.props.children) {
                const next = Array.isArray(item.props.children) ? item.props.children : [item.props.children];
                const found = findUrlInChildren(next);
                if (found) return found;
            }
        }
    }
    return null;
}

function resolveTargetMedia(args: any[], children: any[]): { url: string; src?: string; } | null {
    const fromArgs = findUrlInArgs(args);
    if (fromArgs && (fromArgs.url || fromArgs.src)) {
        return {
            url: fromArgs.url || fromArgs.src!,
            src: fromArgs.src || fromArgs.url
        };
    }

    if (lastContextMenuTarget && Date.now() - lastContextMenuTime < 2500) {
        const elUrl = findUrlInElement(lastContextMenuTarget);
        const fib = findUrlInFiber(getFiber(lastContextMenuTarget));

        if (fib && (fib.url || fib.src)) {
            return {
                url: fib.url || elUrl || fib.src!,
                src: fib.src || elUrl || fib.url
            };
        }

        if (elUrl) {
            return {
                url: elUrl,
                src: elUrl
            };
        }
    }

    const fromChildren = findUrlInChildren(children);
    if (fromChildren) {
        return {
            url: fromChildren,
            src: fromChildren
        };
    }

    return null;
}

function hasMenuItem(items: any[], id: string): boolean {
    for (const item of items) {
        if (!item) continue;
        if (Array.isArray(item)) {
            if (hasMenuItem(item, id)) return true;
        }
        if (item.props?.id === id) return true;
        if (item.props?.children) {
            const next = Array.isArray(item.props.children) ? item.props.children : [item.props.children];
            if (hasMenuItem(next, id)) return true;
        }
    }
    return false;
}

function patchContextMenu(children: any[], args: any[]) {
    if (!children || !Array.isArray(children)) return;
    if (hasMenuItem(children, "giflens-inspect")) return;

    const media = resolveTargetMedia(args, children);
    if (!media) return;

    const inspectItem = (
        <Menu.MenuItem
            id="giflens-inspect"
            key="giflens-inspect"
            label="See Extracted Text"
            icon={EyeIcon}
            leadingAccessory={{ type: "icon", icon: EyeIcon }}
            action={() => openInspectModal(media.url, media.src)}
        />
    );

    const copyGroup = findGroupChildrenByChildId(
        ["copy-link", "copy-image-link", "copy-native-link", "copy"],
        children,
        true
    );

    if (copyGroup) {
        copyGroup.push(inspectItem);
    } else {
        children.push(
            <Menu.MenuGroup key="giflens-group" id="giflens-group">
                {inspectItem}
            </Menu.MenuGroup>
        );
    }
}

function IndexingProgressIndicator() {
    const [progress, setProgress] = useState<IndexingProgress | null>(liveIndexingProgress);

    useEffect(() => {
        return addProgressListener(p => {
            setProgress(p.isIndexing && p.total > 0 ? p : null);
        });
    }, []);

    if (!progress || !progress.isIndexing || progress.total === 0) {
        return null;
    }

    const percent = Math.min(100, Math.round((progress.completed / progress.total) * 100));
    const accentColor = progress.isPaused ? "var(--status-warning, #f0b232)" : "var(--brand-500, #5865f2)";

    return (
        <div style={{
            margin: "0 12px 10px 12px",
            padding: "8px 12px",
            background: "var(--background-secondary-alt, #232428)",
            border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
            borderRadius: 8,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)"
        }}>
            <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: accentColor,
                        boxShadow: `0 0 6px ${progress.isPaused ? "rgba(240, 178, 50, 0.6)" : "rgba(88, 101, 242, 0.6)"}`
                    }} />
                    <span style={{
                        color: "var(--text-normal, #dbdee1)",
                        fontSize: 13,
                        fontWeight: 500
                    }}>
                        {progress.isPaused ? "Indexing Paused" : "Indexing Favorites"}:{" "}
                        <strong style={{ color: "var(--header-primary, #ffffff)", fontWeight: 700 }}>
                            {progress.completed} / {progress.total}
                        </strong>{" "}
                        <span style={{ color: "var(--text-muted, #949ba4)" }}>({percent}%)</span>
                    </span>
                </div>
                <button
                    type="button"
                    onClick={e => {
                        e.stopPropagation();
                        togglePauseBackgroundIndexing();
                    }}
                    style={{
                        background: progress.isPaused ? "var(--status-warning, #f0b232)" : "var(--brand-500, #5865f2)",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: 4,
                        padding: "3px 10px",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        lineHeight: "16px"
                    }}
                >
                    {progress.isPaused ? "Resume" : "Pause"}
                </button>
            </div>
            <div style={{
                width: "100%",
                height: 5,
                background: "var(--background-tertiary, #1e1f22)",
                borderRadius: 3,
                overflow: "hidden"
            }}>
                <div style={{
                    width: `${percent}%`,
                    height: "100%",
                    background: accentColor,
                    borderRadius: 3,
                    transition: "width 0.25s ease"
                }} />
            </div>
        </div>
    );
}

function InspectModal({
    url,
    src,
    modalProps
}: {
    url: string;
    src?: string;
    modalProps: any;
}) {
    const displaySrc = src || url;
    const initialRecord = findCachedRecord(url) || (src ? findCachedRecord(src) : undefined);
    const [ocrText, setOcrText] = useState(initialRecord?.ocrText || "");
    const [slugTokens, setSlugTokens] = useState<string[]>(
        initialRecord?.slugTokens || extractSlugTokens(url)
    );
    const [isScanning, setIsScanning] = useState(false);

    useEffect(() => {
        if (!initialRecord) {
            getGifRecord(url).then(rec => {
                if (rec) {
                    setOcrText(rec.ocrText);
                    setSlugTokens(rec.slugTokens);
                }
            });
        }
    }, [url, initialRecord]);

    const handleRescan = async () => {
        setIsScanning(true);
        try {
            const text = await extractTextFromMedia(url, displaySrc, true);
            setOcrText(text);
            const tokens = extractSlugTokens(url);
            setSlugTokens(tokens);
            await saveGifRecord({
                url,
                src: displaySrc,
                ocrText: text,
                slugTokens: tokens,
                timestamp: Date.now()
            });
        } catch { }
        setIsScanning(false);
    };

    const isVideo = /\.(mp4|webm)(\?.*)?$/i.test(displaySrc) || displaySrc.startsWith("data:video/");

    return (
        <Modal
            {...modalProps}
            title="Inspect Extracted Text (GifLens)"
            subtitle="View detected OCR text and instant search keywords"
            actions={[
                {
                    text: isScanning ? "Scanning..." : "Re-scan with OCR",
                    variant: "primary",
                    onClick: handleRescan
                },
                {
                    text: "Close",
                    variant: "secondary",
                    onClick: modalProps.onClose
                }
            ]}
        >
            <Flex flexDirection="column" style={{ gap: 14 }}>
                <div style={{ textAlign: "center", background: "var(--background-secondary)", borderRadius: 8, padding: 8 }}>
                    {isVideo ? (
                        <video
                            src={displaySrc}
                            autoPlay
                            loop
                            muted
                            playsInline
                            controls
                            style={{ maxHeight: 200, maxWidth: "100%", objectFit: "contain", borderRadius: 6 }}
                        />
                    ) : (
                        <img
                            src={displaySrc}
                            alt="GIF Preview"
                            style={{ maxHeight: 200, maxWidth: "100%", objectFit: "contain", borderRadius: 6 }}
                        />
                    )}
                </div>

                <div>
                    <Heading tag="h5" style={{ marginBottom: 6 }}>Detected OCR Text:</Heading>
                    <div style={{ padding: 12, background: "var(--background-secondary)", borderRadius: 6, userSelect: "text" }}>
                        <Text variant="text-sm/normal" style={{ wordBreak: "break-word", fontFamily: "monospace" }}>
                            {ocrText ? `"${ocrText}"` : "(No text detected on image)"}
                        </Text>
                    </div>
                </div>

                <div>
                    <Heading tag="h5" style={{ marginBottom: 6 }}>URL Keywords (Instant Search):</Heading>
                    <div style={{ padding: 10, background: "var(--background-secondary)", borderRadius: 6, userSelect: "text" }}>
                        <Text variant="text-sm/normal" style={{ color: "var(--text-muted)", wordBreak: "break-word" }}>
                            {slugTokens.length > 0 ? slugTokens.join(", ") : "(None)"}
                        </Text>
                    </div>
                </div>
            </Flex>
        </Modal>
    );
}

function openInspectModal(url: string, src?: string) {
    openModal((modalProps: any) => <InspectModal url={url} src={src} modalProps={modalProps} />);
}

function SettingsComponent() {
    const [storedCount, setStoredCount] = useState(0);
    const [progress, setProgress] = useState<IndexingProgress>({
        total: 0,
        completed: 0,
        currentUrl: "",
        isIndexing: false,
        isPaused: false,
        activeThreads: 0
    });

    useEffect(() => {
        getStoredRecordCount().then(setStoredCount);
        const unsubscribe = addProgressListener(p => {
            setProgress(p);
            getStoredRecordCount().then(setStoredCount);
        });
        return unsubscribe;
    }, []);

    const handleClear = async () => {
        stopBackgroundIndexing();
        await clearAllRecords();
        setStoredCount(0);
    };

    const handleTogglePause = () => {
        togglePauseBackgroundIndexing();
    };

    return (
        <section>
            <Heading tag="h3">GifLens Index Status</Heading>
            <Paragraph style={{ marginBottom: 12 }}>
                High-speed parallel OCR and keyword indexing for your favorited GIFs.
            </Paragraph>

            <Flex flexDirection="column" style={{ gap: 8, marginBottom: 16 }}>
                <Text variant="text-md/normal">
                    Stored in Cache: <strong>{storedCount}</strong> GIFs
                </Text>
                {progress.isIndexing && (
                    <Text variant="text-sm/normal" style={{ color: progress.isPaused ? "var(--status-warning)" : "var(--brand-500)" }}>
                        {progress.isPaused
                            ? `Indexing paused: ${progress.completed} / ${progress.total}`
                            : `Indexing in progress (${progress.activeThreads} threads): ${progress.completed} / ${progress.total}`}
                    </Text>
                )}
            </Flex>

            <Flex flexDirection="row" style={{ gap: 8 }}>
                {progress.isIndexing && (
                    <Button
                        variant="secondary"
                        size="small"
                        onClick={handleTogglePause}
                    >
                        {progress.isPaused ? "Resume Indexing" : "Pause Indexing"}
                    </Button>
                )}
                <Button
                    variant="dangerPrimary"
                    size="small"
                    onClick={handleClear}
                >
                    Clear Cache
                </Button>
            </Flex>
            <Divider style={{ marginTop: 16 }} />
        </section>
    );
}

export default definePlugin({
    name: "GifLens",
    description: "Instant smart search for favorite GIFs using multi-threaded OCR and URL indexing",
    authors: [Devs.Stern],
    tags: ["Media", "Utility", "Emotes"],

    settings,

    settingsAboutComponent: SettingsComponent,

    globalContextMenuCallback: null as any,

    async start() {
        window.addEventListener("contextmenu", onContextMenuCapture, true);
        this.globalContextMenuCallback = (_navId: string, children: any[], ...args: any[]) => {
            patchContextMenu(children, args);
        };
        addGlobalContextMenuPatch(this.globalContextMenuCallback);
        await getAllGifRecords();
    },

    stop() {
        window.removeEventListener("contextmenu", onContextMenuCapture, true);
        if (this.globalContextMenuCallback) {
            removeGlobalContextMenuPatch(this.globalContextMenuCallback);
            this.globalContextMenuCallback = null;
        }
        stopBackgroundIndexing();
        terminateOcrWorker();
        getMemoryCache().clear();
    },

    filterFavorites(favorites: Gif[], query: string): Gif[] {
        if (!favorites || !Array.isArray(favorites)) return favorites;

        const cache = getMemoryCache();
        const unindexed = favorites.filter(g => !cache.has(g.url));
        if (unindexed.length > 0) {
            startBackgroundIndexing(
                unindexed,
                settings.store.enableOcr,
                Number(settings.store.concurrency) || 4,
                Boolean(settings.store.deepScan)
            );
        }

        if (!query || !query.trim()) return favorites;
        return searchFavorites(query, favorites, cache);
    },

    renderHeaderWithProgress(originalHeader: any) {
        return (
            <Flex flexDirection="column" style={{ width: "100%" }}>
                {originalHeader}
                <IndexingProgressIndicator />
            </Flex>
        );
    },

    getSearchPlaceholder(original: string): string {
        if (liveIndexingProgress && liveIndexingProgress.isIndexing && liveIndexingProgress.total > 0) {
            if (liveIndexingProgress.isPaused) {
                return `Search Favorites (Paused: ${liveIndexingProgress.completed}/${liveIndexingProgress.total})...`;
            }
            return `Search Favorites (Indexing: ${liveIndexingProgress.completed}/${liveIndexingProgress.total})...`;
        }
        return original;
    },

    contextMenus: {
        "image-context": (children: any[], ...args: any[]) => patchContextMenu(children, args),
        "expression-picker": (children: any[], ...args: any[]) => patchContextMenu(children, args),
        "message": (children: any[], ...args: any[]) => patchContextMenu(children, args)
    },

    patches: [
        {
            find: "renderHeaderContent(){",
            replacement: [
                {
                    match: /data:(\i===\i\.\i\.FAVORITES\?)function\([^)]+?\)\{.+?\}\((\i),(\i)\)/,
                    replace: "data:$1$self.filterFavorites($2,$3)"
                },
                {
                    match: /(\i\.renderHeaderContent\(\))/,
                    replace: "$self.renderHeaderWithProgress($1)"
                },
                {
                    match: /(placeholder:)(\i)(?=,"aria-label":)/,
                    replace: "$1$self.getSearchPlaceholder($2)"
                }
            ]
        }
    ]
});
