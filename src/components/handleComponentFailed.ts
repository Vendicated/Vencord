/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { maybePromptToUpdate } from "@utils/updater";

export function handleComponentFailed() {
    maybePromptToUpdate(
        "Uh Oh! Failed to render this Page." +
        " However, there is an update available that might fix it." +
        " Would you like to update and restart now?"
    );
}
