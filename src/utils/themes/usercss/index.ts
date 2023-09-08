/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { parse as originalParse, UserstyleHeader } from "usercss-meta";

const UserCSSLogger = new Logger("UserCSS", "#d2acf5");

export function parse(text: string, fileName: string): UserstyleHeader {
    var { metadata, errors } = originalParse(text.replace(/\r/g, ""), { allowErrors: true });

    if (errors.length) {
        UserCSSLogger.warn("Parsed", fileName, "with errors:", errors);
    }

    return {
        ...metadata,
        fileName,
    };
}
