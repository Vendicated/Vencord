/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 OpenAsar
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

import { Link } from "../components/Link";
import { Devs } from "../utils/constants";
import definePlugin from "../utils/types";
import { FluxDispatcher, Forms, Toasts } from "../webpack/common";
import { showNotice, popNotice } from "../api/Notices";

let ws: WebSocket;
export default definePlugin({
    name: "WebRichPresence (arRPC)",
    description: "Client plugin for arRPC to enable RPC on Discord Web (experimental)",
    authors: [Devs.Ducko],
    target: "WEB",

    settingsAboutComponent: () => (
        <>
            <Forms.FormTitle tag="h3">How to use arRPC</Forms.FormTitle>
            <Forms.FormText>
                <Link href="https://github.com/OpenAsar/arrpc/tree/main#server">Follow the instructions in the GitHub repo</Link> to get the server running, and then enable the plugin.
            </Forms.FormText>
        </>
    ),

    async start() {
        if (ws) ws.close();
        ws = new WebSocket("ws://127.0.0.1:1337"); // try to open WebSocket

        const connectionSuccessful = await new Promise(res => setTimeout(() => res(ws.readyState === WebSocket.OPEN), 1000)); // check if open after 1s
        if (!connectionSuccessful) {
            showNotice("Failed to connect to arRPC, is it running?", "Retry", () => { // show notice about failure to connect, with retry/ignore
                popNotice();
                this.start();
            });
            return;
        }

        ws.onmessage = e => { // on message, set status to data
            const data = JSON.parse(e.data);
            FluxDispatcher.dispatch({ type: "LOCAL_ACTIVITY_UPDATE", ...data });
        };

        Toasts.show({ // show toast on success
            message: "Connected to arRPC",
            type: Toasts.Type.SUCCESS,
            id: Toasts.genId(),
            options: {
                duration: 1000,
                position: Toasts.Position.BOTTOM
            }
        });
    },

    stop() {
        FluxDispatcher.dispatch({ type: "LOCAL_ACTIVITY_UPDATE", activity: null }); // clear status
        ws.close(); // close WebSocket
    }
});
