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

import ErrorBoundary from "@components/ErrorBoundary";
import { isPrimitiveReactNode } from "@utils/react";
import { waitFor } from "@webpack";
import { ReactNode } from "react";

let NoticesModule: any;
waitFor(m => m.show && m.dismiss && !m.suppressAll, m => NoticesModule = m);

export const noticesQueue = [] as any[];
export let currentNotice: any = null;

export function popNotice() {
    NoticesModule.dismiss();
}

export function nextNotice() {
    currentNotice = noticesQueue.shift();

    if (currentNotice) {
        NoticesModule.show(...currentNotice, "VencordNotice");
    }
}

export function showNotice(message: ReactNode, buttonText: string, onOkClick: () => void) {
    const notice = isPrimitiveReactNode(message)
        ? message
        : <ErrorBoundary fallback={() => "Error Showing Notice"}>{message}</ErrorBoundary>;

    noticesQueue.push(["GENERIC", notice, buttonText, onOkClick]);
    if (!currentNotice) nextNotice();
}
