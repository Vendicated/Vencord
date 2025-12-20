/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { copyToClipboard } from "@utils/clipboard";
import { React } from "@webpack/common";

export function useCopyCooldown(cooldown: number) {
    const [copyCooldown, setCopyCooldown] = React.useState(false);

    function copy(text: string) {
        copyToClipboard(text);
        setCopyCooldown(true);

        setTimeout(() => {
            setCopyCooldown(false);
        }, cooldown);
    }

    return [copyCooldown, copy] as const;
}
