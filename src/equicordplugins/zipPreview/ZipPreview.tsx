/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { React, useEffect, useState } from "@webpack/common";

import openFilePreview from "./FilePreview";
import { unzipBlob, ZipEntry } from "./unzip";

const ArrowExpandDown = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M22,4V2H2V4H11V18.17L5.5,12.67L4.08,14.08L12,22L19.92,14.08L18.5,12.67L13,18.17V4H22Z" /></svg>;
const ArrowExpandUp = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M2,20V22H22V20H13V5.83L18.5,11.33L19.92,9.92L12,2L4.08,9.92L5.5,11.33L11,5.83V20H2Z" /></svg>;
const FolderArrowLeft = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20,18H4V8H20M20,6H12L10,4H4A2,2 0 0,0 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8A2,2 0 0,0 20,6M14,10V12H10V15L6,11.5L10,8V10H14Z" /></svg>;

function formatSize(n: number) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(2)} KB`;
    if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
    return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export default function ZipPreview({ blob, name, expanded: expandedProp, onExpandedChange }: { blob: Blob; name?: string; expanded?: boolean; onExpandedChange?: (v: boolean) => void; }) {
    const [internalExpanded, setInternalExpanded] = useState(true);
    const expanded = typeof expandedProp === "boolean" ? expandedProp : internalExpanded;
    const setExpanded = (next: boolean) => {
        if (onExpandedChange) onExpandedChange(next);
        if (typeof expandedProp !== "boolean") setInternalExpanded(next);
    };
    const [tree, setTree] = useState<any | null>(null);
    const [zipName, setZipName] = useState<string | null>(name ?? null);
    const [zipSize, setZipSize] = useState<number | null>(null);

    useEffect(() => {
        (async () => {
            setZipSize((blob as any).size ?? null);
            if (!zipName) {
                try {
                    // try to hint name from blob if available (some native helpers attach name)
                    const anyb = blob as any;
                    if (anyb?.name) setZipName(anyb.name);
                } catch { }
            }

            const { entries, readEntry } = await unzipBlob(blob);
            const root = { folders: {}, files: {}, path: "/", parent: null } as any;
            for (const e of entries) {
                if (e.isDirectory) continue;
                const parts = e.name.split("/").filter(Boolean);
                let cur = root;
                for (let i = 0; i < parts.length - 1; i++) {
                    const p = parts[i];
                    cur.folders[p] = cur.folders[p] || { folders: {}, files: {}, path: cur.path + p + "/", parent: cur };
                    cur = cur.folders[p];
                }
                cur.files[parts[parts.length - 1]] = { entry: e, read: () => readEntry(e) };
            }
            setTree(root);
        })();
    }, [blob]);

    async function openFile(name: string, file: { entry: ZipEntry; read: () => Promise<ArrayBuffer>; }) {
        const ab = await file.read();
        // Get proper MIME type based on file extension
        const ext = name.split(".").pop()?.toLowerCase() ?? "";
        const mimeTypes: Record<string, string> = {
            png: "image/png",
            jpg: "image/jpeg",
            jpeg: "image/jpeg",
            gif: "image/gif",
            webp: "image/webp",
            avif: "image/avif",
            svg: "image/svg+xml",
            bmp: "image/bmp",
            ico: "image/x-icon",
        };
        const mimeType = mimeTypes[ext] || "application/octet-stream";
        const b = new Blob([ab], { type: mimeType });
        openFilePreview(name, b, ab);
    }

    return (
        <div>
            <div className="zp-card">
                <div className="zp-header">
                    <div className="zp-file-icon">
                        <svg width={36} height={36} viewBox="0 0 24 24" fill="none">
                            <path d="M6 2h7l3 3v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="rgba(0,150,200,0.08)" />
                            <path d="M9 8h6v2H9zM9 11h6v2H9z" fill="var(--text-link)" />
                        </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="zp-filename" title={zipName || "archive.zip"}>{zipName || "archive.zip"}</div>
                        <div className="zp-zipmeta">{zipSize ? formatSize(zipSize) : ""}</div>
                    </div>
                </div>

                <div className={"zp-zip-preview" + (expanded ? " expanded" : "")}>
                    {tree ? (
                        <>
                            <div className="zp-path">
                                <div className="zp-folder-return" onClick={() => { if (tree.parent) setTree(tree.parent); }}>
                                    <FolderArrowLeft />
                                </div>
                                <div className="zp-path-text">{tree.path}</div>
                            </div>
                            {Object.keys(tree.folders).map(name => (
                                <div key={name} className="zp-entry-row" onClick={() => setTree(tree.folders[name])}>
                                    <span className="zp-entry-name">{name}/</span>
                                </div>
                            ))}
                            {Object.entries(tree.files).map(([name, file]: any) => (
                                <div key={name} className="zp-entry-row" onClick={() => openFile(name, file)}>
                                    <span className="zp-entry-name">{name}</span>
                                    <span className="zp-entry-size">({formatSize((file as any).entry.size)})</span>
                                </div>
                            ))}
                        </>
                    ) : "Loading..."}
                </div>

                <div className="zp-dropdown-expander" onClick={() => setExpanded(!expanded)}>
                    {expanded ? <ArrowExpandUp /> : <ArrowExpandDown />}
                </div>
            </div>
        </div>
    );
}
