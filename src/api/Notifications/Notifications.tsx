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

import { Queue } from "@utils/Queue";
import { ReactDOM } from "@webpack/common";
import type { ReactNode } from "react";
import type { Root } from "react-dom/client";

import NotificationComponent from "./NotificationComponent";

const NotificationQueue = new Queue();

let reactRoot: Root;
let id = 42;

function getRoot() {
    if (!reactRoot) {
        const container = document.createElement("div");
        container.id = "vc-notification-container";
        document.body.append(container);
        reactRoot = ReactDOM.createRoot(container);
    }
    return reactRoot;
}

export interface NotificationData {
    title: string;
    body: ReactNode;
    icon?: string;
    onClick?(): void;
    onClose?(): void;
    color?: string;
}

function _showNotification(notification: NotificationData, id: number) {
    const root = getRoot();
    return new Promise<void>(resolve => {
        root.render(
            <NotificationComponent {...notification} id={id} onClose={() => {
                notification.onClose?.();
                root.render(null);
                resolve();
            }} />,
        );
    });
}

export function showNotification(notification: NotificationData) {
    NotificationQueue.push(() => _showNotification(notification, id++));
}
