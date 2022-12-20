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

import { debounce } from "@utils/debounce";
import IpcEvents from "@utils/IpcEvents";
import { Queue } from "@utils/Queue";
import { find } from "@webpack";

import monacoHtml from "~fileContent/monacoWin.html";

const queue = new Queue();
const setCss = debounce((css: string) => {
    queue.push(() => VencordNative.ipc.invoke(IpcEvents.SET_QUICK_CSS, css));
});

export async function launchMonacoEditor() {
    const features = `popup,width=${Math.min(window.innerWidth, 1000)},height=${Math.min(window.innerHeight, 1000)}`;
    const win = open("about:blank", "VencordQuickCss", features);
    if (!win) {
        alert("Failed to open QuickCSS popup. Make sure to allow popups!");
        return;
    }

    win.setCss = setCss;
    win.getCurrentCss = () => VencordNative.ipc.invoke(IpcEvents.GET_QUICK_CSS);
    win.getTheme = () =>
        find(m =>
            m.ProtoClass?.typeName.endsWith("PreloadedUserSettings")
        )?.getCurrentValue()?.appearance?.theme === 2
            ? "vs-light"
            : "vs-dark";

    win.document.write(monacoHtml);

    window.__VENCORD_MONACO_WIN__ = new WeakRef(win);
}
