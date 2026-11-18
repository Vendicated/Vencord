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
import { Notice } from "@vencord/discord-types";
import { filters, mapMangledModuleLazy } from "@webpack";
import { FluxDispatcher } from "@webpack/common";
import { ReactNode } from "react";

const { Notice, NoticeButton, NoticeCloseButton } = mapMangledModuleLazy(["APP_NOTICE_PRIMARY_CTA_OPENED", "minor:"], {
    Notice: filters.byCode(".DEFAULT,className:"),
    NoticeCloseButton: filters.byCode("APP_NOTICE_CLOSED"),
    NoticeButton: filters.byCode("minor:")
});

export const VENCORD_NOTICE_TYPE = "VencordNotice";
export const noticesQueue = [] as Notice[];
export let currentNotice: Notice | undefined = undefined;

export function dismissNotice(notice?: Pick<Notice, "id" | "type">) {
    return FluxDispatcher.dispatch({ type: "NOTICE_DISMISS", ...notice });
}

export async function popNotice() {
    const notice = currentNotice;
    if (notice) {
        currentNotice = undefined;
        await dismissNotice(notice);
    }

    nextNotice();
}

export function nextNotice() {
    currentNotice = noticesQueue.shift();

    if (currentNotice) {
        FluxDispatcher.dispatch({ type: "NOTICE_SHOW", notice: currentNotice });
    }
}

export function showNotice(message: ReactNode, buttonText: string, onOkClick: () => void) {
    const wrappedMessage = isPrimitiveReactNode(message)
        ? message
        : <ErrorBoundary fallback={() => "Error Showing Notice"}>{message}</ErrorBoundary>;

    noticesQueue.push({
        type: VENCORD_NOTICE_TYPE,
        id: crypto.randomUUID(),
        message: wrappedMessage,
        buttonText,
        callback: onOkClick
    });

    if (!currentNotice) nextNotice();
}

/** Don't use this. */
export function _renderNotice({ message, callback, buttonText }: Notice) {
    return (
        <Notice>
            <NoticeCloseButton onClick={popNotice} />
            {message}
            <NoticeButton onClick={callback}>{buttonText}</NoticeButton>
        </Notice>
    );
}
