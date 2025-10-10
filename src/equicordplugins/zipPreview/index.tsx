/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { EquicordDevs } from "@utils/constants";
import { openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { Menu, React, showToast, useEffect, useState } from "@webpack/common";

import ZipPreview from "./ZipPreview";

async function fetchBlobWithDebug(url: string) {
    try {
        const res = await fetch("https://corsproxy.io/?url=" + encodeURIComponent(url));
        if (!res.ok) {
            console.error("ZipPreview: fetch failed", url, res.status, res.statusText);
            return null;
        }
        const blob = await res.blob();
        return blob;
    } catch (err) {
        console.error("ZipPreview: fetch error for", url, err);
        return null;
    }
}

async function tryNativeDownloadAttachment(attachment: any) {
    try {
        const helpers = (globalThis as any).VencordNative?.pluginHelpers?.MessageLoggerEnhanced;
        if (!helpers) return null;

        const filename = attachment?.filename || attachment?.title || attachment?.name || "";
        const extMatch = filename?.includes(".") ? `.${filename.split(".").pop()}` : "";
        const logged = {
            id: attachment?.id,
            url: attachment?.url || attachment?.proxy_url || attachment?.proxyUrl,
            oldUrl: attachment?.oldUrl || attachment?.url || attachment?.proxy_url || attachment?.proxyUrl,
            fileExtension: attachment?.fileExtension || extMatch,
            filename: filename,
            proxy_url: attachment?.proxy_url,
            content_type: attachment?.content_type
        };

        if (!logged.id || !logged.url) return null;

        const res = await helpers.downloadAttachment(logged);
        if (!res || res.error || !res.path) return null;

        // now retrieve raw bytes from native cache
        const bytes = await helpers.getImageNative(logged.id);
        if (!bytes) return null;

        // bytes may be Buffer-like or Uint8Array
        const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
        return new Blob([arr.buffer]);
    } catch (err) {
        console.error("ZipPreview: native download failed", err);
        return null;
    }
}

function MessageContextMenu(children: Array<any>, props: any) {
    try {
        const { mediaItem, message } = props ?? {};
        if (!mediaItem || !message) return;

        const attachment = (message.attachments || []).find((a: any) =>
            a?.proxy_url === mediaItem.proxyUrl || a?.url === mediaItem.url || a?.proxy_url === mediaItem.url || a?.url === mediaItem.proxyUrl
        );

        const filename = attachment?.filename || attachment?.title || mediaItem?.filename || mediaItem?.name || "";
        const contentType = (attachment?.content_type || mediaItem?.contentType || "").toLowerCase();

        const looksLikeZip = contentType.includes("zip") || filename.toLowerCase().endsWith(".zip") || (mediaItem?.url || "").toLowerCase().endsWith(".zip");
        if (!looksLikeZip) return;

        children.push(
            <Menu.MenuItem
                id="zippreview-open"
                label="Preview zip"
                action={async () => {
                    try {
                        const url = attachment?.proxy_url || attachment?.url || mediaItem?.proxyUrl || mediaItem?.url;
                        if (!url) return;

                        // try native download first to avoid CORS issues
                        let blob = await tryNativeDownloadAttachment(attachment || mediaItem);
                        if (!blob) blob = await fetchBlobWithDebug(url);

                        if (!blob || blob.size === 0) {
                            console.error("ZipPreview: fetched empty blob for", url);
                            showToast("Failed to fetch attachment for preview (empty response). Try Download.");
                            return;
                        }
                        openModal((props: any) => <ZipPreview blob={blob} name={filename} /> as any);
                    } catch (err) {
                        console.error("ZipPreview: failed to open from context menu", err);
                    }
                }}
            />
        );
    } catch (err) {
        // ignore
    }
}

// Store for expanded state and loaded blobs per attachment
const expandedState = new Map<string, boolean>();
const blobCache = new Map<string, Blob>();

// Component to render inside each zip attachment
function ZipAttachmentPreview({ attachment }: { attachment: any; }) {
    const key = attachment?.id || attachment?.url || attachment?.proxy_url;
    const ext = attachment.fileName.match(/\.tar\.\w+$|(\.\w+)$/)?.[0] ?? "";
    if (ext !== ".zip") return;

    const [blob, setBlob] = useState<Blob | null>(() => blobCache.get(key) || null);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<boolean>(() => expandedState.get(key) ?? false);

    useEffect(() => {
        // If already cached, skip fetch
        if (blobCache.has(key)) return;

        let mounted = true;
        (async () => {
            try {
                const url = attachment.proxy_url || attachment.url;
                if (!url) {
                    if (mounted) setError("No URL for attachment");
                    return;
                }
                let b = await tryNativeDownloadAttachment(attachment);
                if (!b) b = await fetchBlobWithDebug(url);
                if (!b || b.size === 0) {
                    if (mounted) setError("Failed to fetch archive");
                    return;
                }
                if (mounted) {
                    setBlob(b);
                    blobCache.set(key, b);
                }
            } catch {
                if (mounted) setError("Failed to fetch archive");
            }
        })();

        return () => { mounted = false; };
    }, [key]);

    if (error) return <div className="zp-error">{error}</div>;
    if (!blob) return <div className="zp-loading">Loading preview…</div>;

    return (
        <div className="zp-attachment-integrated">
            <ZipPreview
                blob={blob}
                name={attachment.filename || attachment.name || "archive.zip"}
                expanded={expanded}
                onExpandedChange={v => {
                    setExpanded(v);
                    expandedState.set(key, v);
                }}
            />
        </div>
    );
}

export default definePlugin({
    name: "ZipPreview",
    description: "Preview and navigate inside zip files without extracting.",
    authors: [EquicordDevs.justjxke],

    patches: [
        {
            find: "#{intl::ATTACHMENT_PROCESSING}",
            replacement: {
                match: /null!=\i&&\i\(\)(?<=renderAdjacentContent.*?\}=(\i);.*?)/,
                replace: "$&,$self.ZipAttachmentPreview({ attachment: $1 })"
            }
        }
    ],

    contextMenus: {
        "message": MessageContextMenu
    },

    ZipAttachmentPreview,
});
