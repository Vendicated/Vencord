/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CodeBlock } from "@components/CodeBlock";
import { openImageModal } from "@utils/discord";
import { copyWithToast } from "@utils/misc";
import { ModalCloseButton, ModalContent, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { React, useEffect, useMemo } from "@webpack/common";

// SVG Icons
const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={20} height={20} fill="currentColor">
        <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
    </svg>
);

const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={20} height={20} fill="currentColor">
        <path d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z" />
    </svg>
);

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={20} height={20} fill="currentColor">
        <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z" />
    </svg>
);

// Map file extensions to language identifiers for syntax highlighting
function getLanguageFromExtension(filename: string): string {
    const ext = filename.split(".").pop()?.toLowerCase() ?? "";
    const langMap: Record<string, string> = {
        js: "javascript",
        jsx: "javascript",
        ts: "typescript",
        tsx: "typescript",
        py: "python",
        rb: "ruby",
        java: "java",
        c: "c",
        cpp: "cpp",
        cs: "csharp",
        go: "go",
        rs: "rust",
        php: "php",
        html: "html",
        css: "css",
        scss: "scss",
        sass: "sass",
        less: "less",
        json: "json",
        xml: "xml",
        yaml: "yaml",
        yml: "yaml",
        md: "markdown",
        sql: "sql",
        sh: "bash",
        bash: "bash",
        ps1: "powershell",
        r: "r",
        kt: "kotlin",
        swift: "swift",
        lua: "lua",
        diff: "diff",
        patch: "diff",
    };
    return langMap[ext] || "";
}

type TextFileModalProps = {
    name: string;
    blob: Blob;
    buffer: ArrayBuffer;
    transitionState: number;
    onClose: () => void;
};

interface CodeBlockWithDownloadProps {
    lang: string;
    content: string;
    onDownload: () => void;
}

function CodeBlockWithDownload({ lang, content, onDownload }: CodeBlockWithDownloadProps) {
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!containerRef.current) return;

        // Wait for ShikiCodeBlocks to render
        const checkAndInject = () => {
            const codeContainer = containerRef.current?.querySelector(".vc-shiki-root") as HTMLElement;
            if (!codeContainer) return;

            // Check if download button already exists
            if (codeContainer.querySelector(".zp-download-btn")) return;

            // Ensure the code container has position relative
            if (!codeContainer.style.position || codeContainer.style.position === "static") {
                codeContainer.style.position = "relative";
            }

            // Move copy button to outer container so it's always visible
            const copyBtns = codeContainer.querySelector(".vc-shiki-btns") as HTMLElement;
            if (copyBtns && containerRef.current && !containerRef.current.querySelector(".vc-shiki-btns-moved")) {
                copyBtns.classList.add("vc-shiki-btns-moved");
                Object.assign(copyBtns.style, {
                    position: "absolute",
                    bottom: "12px",
                    right: "12px",
                    zIndex: "10",
                });
                // Move the actual element (preserves event listeners)
                containerRef.current.appendChild(copyBtns);
            }

            // Create download button
            const downloadBtn = document.createElement("button");
            downloadBtn.className = "zp-download-btn";
            downloadBtn.title = "Download";
            downloadBtn.onclick = onDownload;
            downloadBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z" />
                </svg>
            `;

            // Style as floating button at top-right
            Object.assign(downloadBtn.style, {
                position: "absolute",
                top: "12px",
                right: "12px",
                width: "24px",
                height: "24px",
                padding: "4px",
                background: "var(--background-floating)",
                border: "1px solid var(--background-modifier-accent)",
                borderRadius: "4px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--interactive-normal)",
                zIndex: "10",
                opacity: "0",
                transition: "opacity 0.15s ease",
            });

            downloadBtn.onmouseenter = () => {
                downloadBtn.style.opacity = "1";
                downloadBtn.style.color = "var(--interactive-hover)";
            };
            downloadBtn.onmouseleave = () => {
                downloadBtn.style.color = "var(--interactive-normal)";
            };

            // Insert into the code container (inside ShikiCodeBlocks)
            codeContainer.appendChild(downloadBtn);
        };

        // Check immediately and after a short delay
        checkAndInject();
        const timer = setTimeout(checkAndInject, 100);

        return () => clearTimeout(timer);
    }, [onDownload]);

    return (
        <div ref={containerRef} className="zp-code-modal" style={{
            background: "var(--background-secondary)",
            borderRadius: "8px",
            border: "2px solid var(--background-modifier-accent)",
            overflow: "hidden",
            maxHeight: "50vh",
            width: "100%",
            position: "relative",
        }}
            onMouseEnter={() => {
                const downloadBtn = containerRef.current?.querySelector(".zp-download-btn") as HTMLElement;
                const copyBtns = containerRef.current?.querySelector(".vc-shiki-btns-moved") as HTMLElement;
                if (downloadBtn) downloadBtn.style.opacity = "1";
                if (copyBtns) copyBtns.style.opacity = "1";
            }}
            onMouseLeave={() => {
                const downloadBtn = containerRef.current?.querySelector(".zp-download-btn") as HTMLElement;
                const copyBtns = containerRef.current?.querySelector(".vc-shiki-btns-moved") as HTMLElement;
                if (downloadBtn) downloadBtn.style.opacity = "0";
                if (copyBtns) copyBtns.style.opacity = "0";
            }}>
            <div style={{ overflow: "auto", maxHeight: "50vh" }}>
                <CodeBlock lang={lang} content={content} />
            </div>
        </div>
    );
}

function TextFileModal({ name, blob, buffer, transitionState, onClose }: TextFileModalProps) {
    const url = URL.createObjectURL(blob);
    useEffect(() => () => URL.revokeObjectURL(url), [url]);

    const text = useMemo(() => {
        try { return new TextDecoder().decode(new Uint8Array(buffer)); } catch { return null; }
    }, [buffer]);

    const language = useMemo(() => getLanguageFromExtension(name), [name]);

    const handleCopy = () => {
        if (text) {
            copyWithToast(text, "Text copied to clipboard!");
        }
    };

    const handleDownload = () => {
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
    };

    return (
        <ModalRoot transitionState={transitionState} size={ModalSize.LARGE}>
            <ModalHeader separator={false}>
                <div style={{
                    fontSize: "20px",
                    fontWeight: 600,
                    color: "var(--header-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1
                }}>{name}</div>
                <ModalCloseButton onClick={onClose} />
            </ModalHeader>
            <ModalContent style={{ padding: "16px", display: "flex", flexDirection: "column" }}>
                {text ? (
                    language ? (
                        <CodeBlockWithDownload
                            lang={language}
                            content={text}
                            onDownload={handleDownload}
                        />
                    ) : (
                        <div style={{
                            background: "var(--background-secondary)",
                            borderRadius: "8px",
                            border: "2px solid var(--background-modifier-accent)",
                            padding: "16px",
                            maxHeight: "50vh",
                            overflow: "auto",
                            overflowX: "auto",
                            width: "100%",
                            position: "relative",
                        }}
                            onMouseEnter={e => {
                                const btns = e.currentTarget.querySelector(".zp-hover-buttons") as HTMLElement;
                                if (btns) btns.style.opacity = "1";
                            }}
                            onMouseLeave={e => {
                                const btns = e.currentTarget.querySelector(".zp-hover-buttons") as HTMLElement;
                                if (btns) btns.style.opacity = "0";
                            }}>
                            <div className="zp-hover-buttons" style={{
                                position: "absolute",
                                top: "8px",
                                right: "8px",
                                display: "flex",
                                gap: "4px",
                                zIndex: 10,
                                opacity: 0,
                                transition: "opacity 0.15s ease",
                                pointerEvents: "all",
                            }}>
                                <button
                                    onClick={handleCopy}
                                    style={{
                                        background: "var(--background-floating)",
                                        border: "1px solid var(--background-modifier-accent)",
                                        borderRadius: "4px",
                                        padding: "4px 6px",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        color: "var(--interactive-normal)",
                                        fontSize: "12px",
                                        gap: "4px",
                                    }}
                                    title="Copy"
                                    onMouseEnter={e => e.currentTarget.style.color = "var(--interactive-hover)"}
                                    onMouseLeave={e => e.currentTarget.style.color = "var(--interactive-normal)"}
                                >
                                    <CopyIcon />
                                </button>
                                <button
                                    onClick={handleDownload}
                                    style={{
                                        background: "var(--background-floating)",
                                        border: "1px solid var(--background-modifier-accent)",
                                        borderRadius: "4px",
                                        padding: "4px 6px",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        color: "var(--interactive-normal)",
                                        fontSize: "12px",
                                        gap: "4px",
                                    }}
                                    title="Download"
                                    onMouseEnter={e => e.currentTarget.style.color = "var(--interactive-hover)"}
                                    onMouseLeave={e => e.currentTarget.style.color = "var(--interactive-normal)"}
                                >
                                    <DownloadIcon />
                                </button>
                            </div>
                            <pre style={{
                                whiteSpace: "pre",
                                wordBreak: "normal",
                                margin: 0,
                                fontFamily: "monospace",
                                fontSize: "14px",
                                lineHeight: "1.5",
                                color: "var(--header-primary)",
                            }}>{text}</pre>
                        </div>
                    )
                ) : (
                    <div style={{
                        background: "var(--background-secondary)",
                        borderRadius: "8px",
                        border: "2px solid var(--background-modifier-accent)",
                        color: "var(--text-muted)",
                        textAlign: "center",
                        padding: "20px",
                        width: "100%",
                    }}>
                        Cannot preview this binary file
                    </div>
                )}
            </ModalContent>
        </ModalRoot>
    );
}

export default function openFilePreview(name: string, blob: Blob, buffer: ArrayBuffer) {
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    const images = ["png", "jpg", "jpeg", "gif", "webp", "avif"];

    if (images.includes(ext)) {
        // Convert blob to data URL (won't expire like blob URLs)
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            openImageModal({
                url: dataUrl,
                original: dataUrl,
                width: 1920,
                height: 1080,
            });
        };
        reader.readAsDataURL(blob);
    } else {
        // open text file modal
        openModal(props => (
            <TextFileModal
                name={name}
                blob={blob}
                buffer={buffer}
                transitionState={props.transitionState}
                onClose={props.onClose}
            />
        ));
    }
}
