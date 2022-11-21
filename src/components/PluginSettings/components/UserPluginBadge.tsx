/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Linnea Gräf
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

import { PluginDef } from "../../../utils/types";
import { Badge } from ".";

export interface Props {
    plugin: PluginDef;
}
export default function UserPluginBadge({ plugin }: Props) {
    const badge = <Badge color={"rgb(88 101 242)"} text={"User"} />;
    return plugin.externalLink
        ? (
            <a href={plugin.externalLink} target={"_blank"}>
                {badge}
            </a>
        )
        : badge;
}


