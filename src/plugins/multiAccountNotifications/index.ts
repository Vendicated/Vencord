/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
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

import { Devs } from "@utils/constants";
import definePlugin, { StartAt } from "@utils/types";

import { Accounts } from "./accounts";
import { Status } from "./types";

let accounts: Accounts;

export default definePlugin({
    name: "MultiAccountNotifications",
    authors: [Devs.Alyxia],
    description: "Shows a notification badge, on your account switcher when you got notifications on your other accounts.",
    startAt: StartAt.WebpackReady,
    start() {
        accounts = new Accounts();
        accounts.addEventListener("state", (e) => {
            const status = (e as CustomEvent).detail.type as Status;
            const notf = document.querySelector("#multiaccount-notification") as HTMLSpanElement;
            if (status === 'clear') {
                notf?.remove();
                return;
            }
            const color = status === 'ping' ? "var(--status-danger)" : "var(--header-primary)";
            if (notf) {
                notf.style.backgroundColor = color;
                return;
            }
            const span = document.createElement("span");
            span.style.width = "8px";
            span.style.height = "8px";
            span.style.borderRadius = "4px";
            span.style.backgroundColor = color;
            span.style.position = "absolute";
            span.style.top = "1em";
            span.style.right = "8.5em";
            span.id = "multiaccount-notification";
            document.querySelector(".avatarWrapper__500a6.withTagAsButton_e22174")?.appendChild(span);
        });
        accounts.connect();
    },
    stop() {
        accounts.stop();
        document.querySelector("#multiaccount-notification")?.remove();
    }
});

