/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 OpenAsar
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { popNotice, showNotice } from "@api/Notices";
import { Link } from "@components/Link";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { filters, findByCodeLazy, mapMangledModuleLazy } from "@webpack";
import { FluxDispatcher, Forms, Toasts } from "@webpack/common";

const assetManager = mapMangledModuleLazy(
    "getAssetImage: size must === [number, number] for Twitch",
    {
        getAsset: filters.byCode("apply("),
    }
);

const lookupRpcApp = findByCodeLazy(".APPLICATION_RPC(");

async function lookupAsset(applicationId: string, key: string): Promise<string> {
    return (await assetManager.getAsset(applicationId, [key, undefined]))[0];
}

const apps: any = {};
async function lookupApp(applicationId: string): Promise<string> {
    const socket: any = {};
    await lookupRpcApp(socket, applicationId);
    return socket.application;
}

let ws: WebSocket;
export default definePlugin({
    name: "WebRichPresence (arRPC)",
    description: "Client plugin for arRPC to enable RPC on Discord Web (experimental)",
    authors: [Devs.Ducko],

    settingsAboutComponent: () => (
        <>
            <Forms.FormTitle tag="h3">How to use arRPC</Forms.FormTitle>
            <Forms.FormText>
                <Link href="https://github.com/OpenAsar/arrpc/tree/main#server">Follow the instructions in the GitHub repo</Link> to get the server running, and then enable the plugin.
            </Forms.FormText>
        </>
    ),

    async start() {
        // ArmCord comes with its own arRPC implementation, so this plugin just confuses users
        if ("armcord" in window) return;

        if (ws) ws.close();
        ws = new WebSocket("ws://127.0.0.1:1337"); // try to open WebSocket

        ws.onmessage = async e => { // on message, set status to data
            const data = JSON.parse(e.data);

            if (data.activity?.assets?.large_image) data.activity.assets.large_image = await lookupAsset(data.activity.application_id, data.activity.assets.large_image);
            if (data.activity?.assets?.small_image) data.activity.assets.small_image = await lookupAsset(data.activity.application_id, data.activity.assets.small_image);

            if (data.activity) {
                const appId = data.activity.application_id;
                apps[appId] ||= await lookupApp(appId);

                const app = apps[appId];
                data.activity.name ||= app.name;
            }

            FluxDispatcher.dispatch({ type: "LOCAL_ACTIVITY_UPDATE", ...data });
        };

        const connectionSuccessful = await new Promise(res => setTimeout(() => res(ws.readyState === WebSocket.OPEN), 1000)); // check if open after 1s
        if (!connectionSuccessful) {
            showNotice("Failed to connect to arRPC, is it running?", "Retry", () => { // show notice about failure to connect, with retry/ignore
                popNotice();
                this.start();
            });
            return;
        }

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
        ws?.close(); // close WebSocket
    }
});
