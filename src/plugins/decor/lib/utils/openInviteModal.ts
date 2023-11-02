/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findByPropsLazy } from "@webpack";
import { FluxDispatcher } from "@webpack/common";

const InviteActions = findByPropsLazy("resolveInvite");

export default async function openInviteModal(key: string) {
    const { invite } = await InviteActions.resolveInvite(key, "Desktop Modal");

    FluxDispatcher.dispatch({
        type: "INVITE_MODAL_OPEN",
        invite,
        code: key,
        context: "APP"
    });
}
