/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 cegged
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { showToast } from "@webpack/common";

export const logger = new Logger("SoundPanel");

export function showError(message: string, err: unknown) {
    logger.error(message, err);
    showToast({ text: message, variant: "critical" });
}
