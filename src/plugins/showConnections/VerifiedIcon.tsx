/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getIntlMessage } from "@utils/discord";
import { findComponentByCodeLazy, findLazy } from "@webpack";
import { useToken } from "@webpack/common";

const ColorMap = findLazy(m => m.colors?.INTERACTIVE_MUTED?.css);
const VerifiedIconComponent = findComponentByCodeLazy("#{intl::CONNECTIONS_ROLE_OFFICIAL_ICON_TOOLTIP}");

export function VerifiedIcon() {
    const color = useToken(ColorMap.colors.INTERACTIVE_MUTED).hex();
    const forcedIconColor = useToken(ColorMap.colors.INTERACTIVE_ICON_ACTIVE ?? ColorMap.colors.INTERACTIVE_ACTIVE).hex();

    return (
        <VerifiedIconComponent
            color={color}
            forcedIconColor={forcedIconColor}
            size={16}
            tooltipText={getIntlMessage("CONNECTION_VERIFIED")}
            className="vc-sc-tooltip-icon"
        />
    );
}
