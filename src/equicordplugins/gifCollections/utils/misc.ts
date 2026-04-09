/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@utils/css";
import { Logger } from "@utils/Logger";

export const cl = classNameFactory("vc-gif-collections-");
export const logger = new Logger("GifCollections");

export function stripPrefix(name: string): string {
    return name.includes(":") ? name.replace(/.+?:/, "") : name;
}
