/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
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
