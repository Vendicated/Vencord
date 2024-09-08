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

import { findComponentByCodeLazy } from "@webpack";
import { i18n, tokens, useToken } from "@webpack/common";

const VerifiedIconComponent = findComponentByCodeLazy(".CONNECTIONS_ROLE_OFFICIAL_ICON_TOOLTIP");

export function VerifiedIcon() {
    const color = useToken(tokens.colors.INTERACTIVE_MUTED!).hex();
    const forcedIconColor = useToken(tokens.colors.INTERACTIVE_ACTIVE!).hex();

    return (
        <VerifiedIconComponent
            color={color}
            forcedIconColor={forcedIconColor}
            size={16}
            tooltipText={i18n.Messages.CONNECTION_VERIFIED}
        />
    );
}
