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

import type { React } from "@webpack/common";

export function Flex(props: React.PropsWithChildren<{
    flexDirection?: React.CSSProperties["flexDirection"];
    style?: React.CSSProperties;
    className?: string;
} & React.HTMLProps<HTMLDivElement>>) {
    props.style ??= {};
    props.style.display = "flex";
    // TODO(ven): Remove me, what was I thinking??
    props.style.gap ??= "1em";
    props.style.flexDirection ||= props.flexDirection;
    delete props.flexDirection;
    return (
        <div {...props}>
            {props.children}
        </div>
    );
}
