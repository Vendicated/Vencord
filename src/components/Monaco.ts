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
import monacoHtml from "@fileContent/monacoWin.html";
import { Queue } from "../utils/Queue";

const queue = new Queue();
const setCss = debounce((css: string) => {
    queue.add(() => VencordNative.ipc.invoke(IpcEvents.SET_QUICK_CSS, css));
});

export async function launchMonacoEditor() {
    const win = open("about:blank", void 0, "popup,width=1000,height=1000")!;

    win.setCss = setCss;
    win.getCurrentCss = () => VencordNative.ipc.invoke(IpcEvents.GET_QUICK_CSS);
    win.getTheme = () => find(m => m.ProtoClass?.typeName.endsWith("PreloadedUserSettings"))
        .getCurrentValue().appearance.theme === 1
        ? "vs-dark"
        : "vs-light";

    win.document.write(monacoHtml);
}
