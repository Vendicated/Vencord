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

import { MaskedLink, React, Tooltip } from "@webpack/common";
import { HTMLAttributes } from "react";

import { Badge } from "../entities";
import { cl } from "../utils";

export default function ReviewBadge(badge: Badge & { onClick?(): void; }) {
    const Wrapper = badge.redirectURL
        ? MaskedLink
        : (props: HTMLAttributes<HTMLDivElement>) => (
            <span {...props} role="button">{props.children}</span>
        );

    return (
        <Tooltip
            text={badge.name}>
            {({ onMouseEnter, onMouseLeave }) => (
                <Wrapper className={cl("blocked-badge")} href={badge.redirectURL!} onClick={badge.onClick}>
                    <img
                        className={cl("badge")}
                        width="22px"
                        height="22px"
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                        src={badge.icon}
                        alt={badge.description}
                    />
                </Wrapper>
            )}
        </Tooltip>
    );
}
