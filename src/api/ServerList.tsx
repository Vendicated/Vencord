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

import ErrorBoundary from "@components/ErrorBoundary";
import { ComponentType } from "react";

export { ServerListItem, type ServerListItemBadgeProps, type ServerListItemIconProps, type ServerListItemProps } from "@components/ServerListItem";

export const enum ServerListRenderPosition {
    Above,
    In,
    Below,
}

const componentsIn = new Map<ComponentType, number>();
const componentsAbove = new Map<ComponentType, number>();
const componentsBelow = new Map<ComponentType, number>();

function getRenderMap(position: ServerListRenderPosition) {
    switch (position) {
        case ServerListRenderPosition.Above:
            return componentsAbove;
        case ServerListRenderPosition.In:
            return componentsIn;
        case ServerListRenderPosition.Below:
            return componentsBelow;
    }
}

export function addServerListElement(position: ServerListRenderPosition, renderFunction: ComponentType, priority = 0) {
    getRenderMap(position).set(renderFunction, priority);
}

export function removeServerListElement(position: ServerListRenderPosition, renderFunction: ComponentType) {
    getRenderMap(position).delete(renderFunction);
}

export const renderAll = (position: ServerListRenderPosition) => {
    return Array.from(getRenderMap(position).entries())
        .sort((a, b) => b[1] - a[1])
        .map(([Component], i) => (
            <ErrorBoundary noop key={i}>
                <Component />
            </ErrorBoundary>
        ));
};
