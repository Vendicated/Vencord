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

export const enum ServerListRenderPosition {
    Above,
    In,
}

const componentsAbove = new Set<ComponentType>();
const componentsBelow = new Set<ComponentType>();

function getRenderFunctions(position: ServerListRenderPosition) {
    return position === ServerListRenderPosition.Above ? componentsAbove : componentsBelow;
}

export function addServerListElement(position: ServerListRenderPosition, renderFunction: ComponentType) {
    getRenderFunctions(position).add(renderFunction);
}

export function removeServerListElement(position: ServerListRenderPosition, renderFunction: ComponentType) {
    getRenderFunctions(position).delete(renderFunction);
}

export const renderAll = (position: ServerListRenderPosition) => {
    return Array.from(
        getRenderFunctions(position),
        (Component, i) => (
            <ErrorBoundary noop key={i}>
                <Component />
            </ErrorBoundary>
        )
    );
};
