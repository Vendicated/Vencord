/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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
