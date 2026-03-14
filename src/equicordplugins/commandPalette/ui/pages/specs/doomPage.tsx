/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@utils/css";
import { Logger } from "@utils/Logger";
import { useEffect, useRef, useState } from "@webpack/common";

import { doomWasmBase64, doomWasmScriptSource, freedoomWadGzipBase64 } from "../../../doom/runtimeAssets";
import { getDoomBootstrapScript, getDoomRuntimeHtml } from "../../../doom/runtimeHtml";
import type { PalettePageSpec } from "../types";

const cl = classNameFactory("vc-command-palette-");
const logger = new Logger("CommandPalette", "DoomPage");

let focusDoomRuntime: (() => void) | null = null;

function base64ToBlobUrl(base64: string, type: string): string {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index++) {
        bytes[index] = binary.charCodeAt(index);
    }

    return URL.createObjectURL(new Blob([bytes], { type }));
}

function DoomRuntime() {
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const doomWasmScriptUrlRef = useRef<string | null>(null);
    const doomWasmUrlRef = useRef<string | null>(null);
    const wadGzipUrlRef = useRef<string | null>(null);
    const bootstrapUrlRef = useRef<string | null>(null);
    const [iframeSrcDoc, setIframeSrcDoc] = useState("");

    useEffect(() => {
        doomWasmScriptUrlRef.current = URL.createObjectURL(new Blob([
            doomWasmScriptSource
        ], { type: "text/javascript" }));
        doomWasmUrlRef.current = base64ToBlobUrl(doomWasmBase64, "application/wasm");
        wadGzipUrlRef.current = base64ToBlobUrl(freedoomWadGzipBase64, "application/gzip");
        bootstrapUrlRef.current = URL.createObjectURL(new Blob([
            getDoomBootstrapScript()
        ], { type: "text/javascript" }));
        setIframeSrcDoc(getDoomRuntimeHtml(bootstrapUrlRef.current));

        const focus = () => {
            iframeRef.current?.focus();
            iframeRef.current?.contentWindow?.postMessage("focus-doom", "*");
        };

        const onMessage = (event: MessageEvent) => {
            if (event.data?.type === "command-palette-doom-status" && typeof event.data?.message === "string") {
                logger.info(event.data.message);
            }
        };

        const onLoad = () => {
            if (!iframeRef.current?.contentWindow || !doomWasmScriptUrlRef.current || !doomWasmUrlRef.current || !wadGzipUrlRef.current) return;
            iframeRef.current.contentWindow.postMessage({
                type: "command-palette-doom-init",
                doomWasmScriptUrl: doomWasmScriptUrlRef.current,
                doomWasmUrl: doomWasmUrlRef.current,
                wadGzipUrl: wadGzipUrlRef.current
            }, "*");
        };

        focusDoomRuntime = focus;
        const timer = window.setTimeout(focus, 200);
        window.addEventListener("message", onMessage);
        iframeRef.current?.addEventListener("load", onLoad);

        return () => {
            window.clearTimeout(timer);
            window.removeEventListener("message", onMessage);
            iframeRef.current?.removeEventListener("load", onLoad);
            if (focusDoomRuntime === focus) {
                focusDoomRuntime = null;
            }
            if (bootstrapUrlRef.current) URL.revokeObjectURL(bootstrapUrlRef.current);
            if (doomWasmScriptUrlRef.current) URL.revokeObjectURL(doomWasmScriptUrlRef.current);
            if (doomWasmUrlRef.current) URL.revokeObjectURL(doomWasmUrlRef.current);
            if (wadGzipUrlRef.current) URL.revokeObjectURL(wadGzipUrlRef.current);
        };
    }, []);

    return (
        <div className={cl("doom-page")}>
            <iframe
                ref={iframeRef}
                className={cl("doom-iframe")}
                srcDoc={iframeSrcDoc}
                title="DOOM"
                allow="autoplay; fullscreen"
            />
        </div>
    );
}

const doomPageSpec: PalettePageSpec = {
    id: "doom",
    title: "DOOM",
    submitLabel: "Refocus DOOM",
    fields: [],
    async submit(context) {
        focusDoomRuntime?.();
        context.showSuccess("Focused DOOM.");
    },
    renderPage() {
        return <DoomRuntime />;
    }
};

export default doomPageSpec;
