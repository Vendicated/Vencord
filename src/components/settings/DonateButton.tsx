/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { LinkIcon } from "@components/Icons";
import { ButtonProps } from "@vencord/discord-types";
import { Button } from "@webpack/common";
import type { PropsWithChildren } from "react";

export const VRR_INVITE_URL = "https://discord.gg/UDQxtE6PdQ";

export default function DonateButton({
    look = Button.Looks.LINK,
    color = Button.Colors.TRANSPARENT,
    children = "Join Server",
    ...props
}: PropsWithChildren<Partial<ButtonProps>>) {
    return (
        <Button
            {...props}
            look={look}
            color={color}
            onClick={() => VencordNative.native.openExternal(VRR_INVITE_URL)}
            className="vc-donate-button"
        >
            <LinkIcon height={16} width={16} className="vc-join-link-icon" />
            {children}
        </Button>
    );
}
