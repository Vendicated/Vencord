/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// import { popNotice, showNotice } from "@api/Notices";
// import { Link } from "@components/Link";
import { Devs } from "@utils/constants";
import definePlugin, { PluginNative } from "@utils/types";
// import { findByCodeLazy } from "@webpack";
// import { ApplicationAssetUtils, FluxDispatcher, Forms, Toasts } from "@webpack/common";
const Native = VencordNative.pluginHelpers.DBusBindings as PluginNative<typeof import("./native")>;


export default definePlugin({
    name: "DBusBindings",
    description: "DBus Bindings for Vencord, an attempt at global keybinds",
    authors: [Devs.f7c7],

    // settingsAboutComponent: () => (
    //     <>
    //         <Forms.FormTitle tag="h3">How to use DBus Bindings</Forms.FormTitle>
    //         <Forms.FormText>
    //         </Forms.FormText>
    //     </>
    // ),
    //
    // async handleEvent(e: MessageEvent<any>) {
    //     console.log(e);
    //     // const data = JSON.parse(e.data);
    //     //
    //     // const { activity } = data;
    //     // const assets = activity?.assets;
    //     //
    //     // if (assets?.large_image) assets.large_image = await lookupAsset(activity.application_id, assets.large_image);
    //     // if (assets?.small_image) assets.small_image = await lookupAsset(activity.application_id, assets.small_image);
    //     //
    //     // if (activity) {
    //     //     const appId = activity.application_id;
    //     //     apps[appId] ||= await lookupApp(appId);
    //     //
    //     //     const app = apps[appId];
    //     //     activity.name ||= app.name;
    //     // }
    //     //
    //     // FluxDispatcher.dispatch({ type: "LOCAL_ACTIVITY_UPDATE", ...data });
    // },
    //
    // startAt: StartAt.Init,

    async start() {

        // Webpack.onceReady.then(() => {
        // const { Variant } = dbus;
        // const {
        //     Interface, property, method, signal, DBusError,
        //     ACCESS_READ, ACCESS_WRITE, ACCESS_READWRITE
        // } = dbus.interface;
        //
        // const bus = dbus.sessionBus();
        const Session = await Native.GScreateSession();
        console.log("rat", Session);
        // this.startDbus();

    },

    stop() {
        // FluxDispatcher.dispatch({ type: "LOCAL_ACTIVITY_UPDATE", activity: null }); // clear status
        // ws?.close(); // close WebSocket
    },

    async log(string) {
        console.log("dbuslogger", string);
    }
    // async startDbus() {
    //     console.log(Object.keys(Native));
    //     return "rat";
    // }
});



