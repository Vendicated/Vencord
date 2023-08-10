/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";

const logger = new Logger("ServerListAPI");

export const enum ServerListRenderPosition {
    Above,
    In,
}

const renderFunctionsAbove = new Set<Function>();
const renderFunctionsIn = new Set<Function>();

function getRenderFunctions(position: ServerListRenderPosition) {
    return position === ServerListRenderPosition.Above ? renderFunctionsAbove : renderFunctionsIn;
}

export function addServerListElement(position: ServerListRenderPosition, renderFunction: Function) {
    getRenderFunctions(position).add(renderFunction);
}

export function removeServerListElement(position: ServerListRenderPosition, renderFunction: Function) {
    getRenderFunctions(position).delete(renderFunction);
}

export const renderAll = (position: ServerListRenderPosition) => {
    const ret: Array<JSX.Element> = [];

    for (const renderFunction of getRenderFunctions(position)) {
        try {
            ret.unshift(renderFunction());
        } catch (e) {
            logger.error("Failed to render server list element:", e);
        }
    }

    return ret;
};
