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
import { isObject } from "@utils/misc";
import { isPrimitiveReactNode } from "@utils/react";
import type { Notice, NoticeColors as TNoticeColors } from "@vencord/discord-types";
import { filters, mapMangledModuleLazy } from "@webpack";
import { FluxDispatcher } from "@webpack/common";
import { ReactNode } from "react";

const { Notice, NoticeButton, NoticeCloseButton, _NoticeColors } = mapMangledModuleLazy(["APP_NOTICE_PRIMARY_CTA_OPENED", "DEFAULT:"], {
    Notice: filters.byCode(".DEFAULT,", '"div"'),
    NoticeCloseButton: filters.byCode("APP_NOTICE_CLOSED"),
    NoticeButton: filters.byCode('"button"'),
    _NoticeColors: filters.byProps("DEFAULT", "DANGER")
});

export const NoticeColors: TNoticeColors = _NoticeColors;

export const VENCORD_NOTICE_TYPE = "VencordNotice";
export const noticesQueue: Notice[] = [];
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

function buildLegacyNotice(message: ReactNode, buttonText: string, onOkClick: () => void): Notice {
    return {
        type: VENCORD_NOTICE_TYPE,
        id: crypto.randomUUID(),
        message,
        buttonText,
        callback: onOkClick
    };
}

export function showNotice(notice: Omit<Notice, "id" | "type">): void;
/** @deprecated use showNotice({ message, buttonText, callback }) */
export function showNotice(message: ReactNode, buttonText: string, onOkClick: () => void): void;
export function showNotice(messageOrNotice: ReactNode | Omit<Notice, "id" | "type">, buttonText?: string, onOkClick?: () => void) {
    const notice = isObject(messageOrNotice) && "message" in messageOrNotice
        ? messageOrNotice
        : buildLegacyNotice(messageOrNotice, buttonText!, onOkClick!);

    if (!isPrimitiveReactNode(notice.message))
        messageOrNotice = <ErrorBoundary fallback={() => "Error Showing Notice"}>{notice.message}</ErrorBoundary>;

    noticesQueue.push({
        id: crypto.randomUUID(),
        ...notice,
        type: VENCORD_NOTICE_TYPE
    });

    if (!currentNotice) nextNotice();
}

/** Don't use this. */
export function _renderNotice({ message, callback, buttonText, color, id }: Notice) {
    return (
        <Notice color={color} key={id}>
            <NoticeCloseButton onClick={popNotice} />
            {message}
            <NoticeButton onClick={callback}>{buttonText}</NoticeButton>
        </Notice>
    );
}
