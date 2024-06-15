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

import { Logger } from "@utils/Logger";
import type { JSX } from "react";

const logger = new Logger("ServerListAPI");

export const enum ServerListRenderPosition {
    Above,
    In,
}

const renderFunctionsAbove = new Set<(...args: unknown[]) => any>();
const renderFunctionsIn = new Set<(...args: unknown[]) => any>();

function getRenderFunctions(position: ServerListRenderPosition) {
    return position === ServerListRenderPosition.Above ? renderFunctionsAbove : renderFunctionsIn;
}

export function addServerListElement(position: ServerListRenderPosition, renderFunction: (...args: unknown[]) => any) {
    getRenderFunctions(position).add(renderFunction);
}

export function removeServerListElement(position: ServerListRenderPosition, renderFunction: (...args: unknown[]) => any) {
    getRenderFunctions(position).delete(renderFunction);
}

export const renderAll = (position: ServerListRenderPosition) => {
    const ret: JSX.Element[] = [];

    for (const renderFunction of getRenderFunctions(position)) {
        try {
            ret.unshift(renderFunction());
        } catch (e) {
            logger.error("Failed to render server list element:", e);
        }
    }

    return ret;
};
