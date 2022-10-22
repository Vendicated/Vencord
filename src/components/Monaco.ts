/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/


import { IpcEvents } from "../utils";
import { debounce } from "../utils/debounce";
import { find } from "../webpack/webpack";

const setCss = debounce((css: string) => {
    VencordNative.ipc.invoke(IpcEvents.SET_QUICK_CSS, css);
});

// FIXME: Discord Desktop support.
// open() fails to create the popup and returns null. Probably have to
// do some logic in main

// adapted from https://stackoverflow.com/a/63179814
export async function launchMonacoEditor() {
    const win = open("about:blank", void 0, "popup,width=1000,height=1000")!;

    win.getCurrentCss = () => VencordNative.ipc.invoke(IpcEvents.GET_QUICK_CSS);
    win.callback = (editor: any) => {
        editor.onDidChangeModelContent(() =>
            setCss(editor.getValue())
        );
    };

    let { theme } = find(m => m.ProtoClass?.typeName.endsWith("PreloadedUserSettings"))
        .getCurrentValue().appearance;
    theme = theme === 1 ? "vs-dark" : "vs-light";

    // problem?
    win.document.write(`

    <!doctype html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <title>QuickCss Editor</title>
        <link rel="stylesheet" data-name="vs/editor/editor.main" href="https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.34.0/min/vs/editor/editor.main.min.css">
        <style>
        html, body, #container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            overflow: hidden;
        }
        </style>
    </head>
    <body>
        <div id="container"></div>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.34.0/min/vs/loader.min.js"></script>

        <script>
            var editor;
            require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.34.0/min/vs' }});
            require(["vs/editor/editor.main"], () => {
                getCurrentCss().then(css => {
                    callback(editor = monaco.editor.create(document.getElementById('container'), {
                        value: css,
                        language: 'css',
                        theme: '${theme}',
                    }));
                });
            });

            window.addEventListener("resize", () => {
                // make monaco re-layout
                editor.layout();
            });
        </script>
    </body>
    </html>

`);
}
