/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// import { popNotice, showNotice } from "@api/Notices";
// import { Link } from "@components/Link";
import { Devs } from "@utils/constants";
import definePlugin, { ReporterTestable } from "@utils/types";
// import dbus from "dbus-next";
// import { findByCodeLazy } from "@webpack";
// import { ApplicationAssetUtils, FluxDispatcher, Forms, Toasts } from "@webpack/common";



export default definePlugin({
    name: "DBus Bindings",
    description: "DBus Bindings for Vencord, an attempt at global keybinds",
    authors: [Devs.f7c7],
    reporterTestable: ReporterTestable.None,

    // settingsAboutComponent: () => (
    //     <>
    //         <Forms.FormTitle tag="h3">How to use DBus Bindings</Forms.FormTitle>
    //         <Forms.FormText>
    //         </Forms.FormText>
    //     </>
    // ),
    //
    async handleEvent(e: MessageEvent<any>) {
        console.log(e);
        // const data = JSON.parse(e.data);
        //
        // const { activity } = data;
        // const assets = activity?.assets;
        //
        // if (assets?.large_image) assets.large_image = await lookupAsset(activity.application_id, assets.large_image);
        // if (assets?.small_image) assets.small_image = await lookupAsset(activity.application_id, assets.small_image);
        //
        // if (activity) {
        //     const appId = activity.application_id;
        //     apps[appId] ||= await lookupApp(appId);
        //
        //     const app = apps[appId];
        //     activity.name ||= app.name;
        // }
        //
        // FluxDispatcher.dispatch({ type: "LOCAL_ACTIVITY_UPDATE", ...data });
    },

    async start() {
        // const { Variant } = dbus;
        // const {
        //     Interface, property, method, signal, DBusError,
        //     ACCESS_READ, ACCESS_WRITE, ACCESS_READWRITE
        // } = dbus.interface;
        //
        // const bus = dbus.sessionBus();
    },

    stop() {
        // FluxDispatcher.dispatch({ type: "LOCAL_ACTIVITY_UPDATE", activity: null }); // clear status
        // ws?.close(); // close WebSocket
    }
});
