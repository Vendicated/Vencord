/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { LazyComponent } from "@utils/react";
import { findByCode, findLazy } from "@webpack";
import { i18n, useToken } from "@webpack/common";

const ColorMap = findLazy(m => m.colors?.INTERACTIVE_MUTED?.css);
const VerifiedIconComponent = LazyComponent(() => findByCode(".CONNECTIONS_ROLE_OFFICIAL_ICON_TOOLTIP"));

export function VerifiedIcon() {
    const color = useToken(ColorMap.colors.INTERACTIVE_MUTED).hex();
    const forcedIconColor = useToken(ColorMap.colors.INTERACTIVE_ACTIVE).hex();

    return (
        <VerifiedIconComponent
            color={color}
            forcedIconColor={forcedIconColor}
            size={16}
            tooltipText={i18n.Messages.CONNECTION_VERIFIED}
        />
    );
}
