/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./patch-worker";

import * as monaco from "monaco-editor/esm/vs/editor/editor.main.js";

declare global {
    const baseUrl: string;
    const getCurrentCss: () => Promise<string>;
    const setCss: (css: string) => void;
    const getTheme: () => string;
}

const BASE = "/dist/monaco/vs";

self.MonacoEnvironment = {
    getWorkerUrl(_moduleId: unknown, label: string) {
        const path = label === "css" ? "/language/css/css.worker.js" : "/editor/editor.worker.js";
        return new URL(BASE + path, baseUrl).toString();
    }
};

getCurrentCss().then(css => {
    const editor = monaco.editor.create(
        document.getElementById("container")!,
        {
            value: css,
            language: "css",
            theme: getTheme(),
        }
    );
    editor.onDidChangeModelContent(() =>
        setCss(editor.getValue())
    );
    window.addEventListener("resize", () => {
        // make monaco re-layout
        editor.layout();
    });
});
