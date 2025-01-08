/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import dbus from "dbus-next";
import { app, IpcMainInvokeEvent } from "electron";
// import dbus from "dbus-native";

const { Variant } = dbus;
const { Message } = dbus;
const PORTAL_TARGET = "org.freedesktop.portal.Desktop";
const PORTAL_OBJECT = "/org/freedesktop/portal/desktop";
const PORTAL_INTERFACE = "org.freedesktop.portal.GlobalShortcuts";
const sessionBus = dbus.sessionBus();
let requestTokenCounter = 0;

function getRequestToken() {
    requestTokenCounter += 1;
    // return requestTokenCounter;
    return String(requestTokenCounter);
}

function parentWindowId(e: IpcMainInvokeEvent) {
    e.sender.executeJavaScript(`Vencord.Plugins.plugins.DBusBindings.log('${JSON.stringify(Object.keys(app))}')`);
    e.sender.executeJavaScript(`Vencord.Plugins.plugins.DBusBindings.log('${app.getApplicationNameForProtocol()}')`);
    // return e.sender.id;
    return "";
}

async function gotGSCreateSessionResponse(e: IpcMainInvokeEvent, results: dbus.Message) {
    if (!results.body[0]) {
        e.sender.executeJavaScript(`Vencord.Plugins.plugins.DBusBindings.log('${JSON.stringify(results)}')`);
    }
    const obj = await sessionBus.getProxyObject(PORTAL_TARGET, PORTAL_OBJECT);

    const globalShortcutsifate = obj.getInterface(PORTAL_INTERFACE);


    const session_handle = results.body[1].session_handle.value;

    const shortcuts = ["Vesktop", { "description": new Variant("s", "Generic"), "preferred_trigger": new Variant("s", "CTRL+SHIFT+O") }];



    const bindShortcut = await globalShortcutsifate.BindShortcuts(new Variant("o", session_handle), shortcuts, parentWindowId(e), [{ "handle_token": new Variant("s", getRequestToken()) }]);

}



export async function GScreateSession(e: IpcMainInvokeEvent) {

    const handleResponse = rat => e.sender.executeJavaScript(`Vencord.Plugins.plugins.DBusBindings.log('${rat}')`);
    // const handleResponse = rat => e.sender.executeJavaScript(`console.log('${rat}')`);
    // const

    const obj = await sessionBus.getProxyObject(PORTAL_TARGET, PORTAL_OBJECT);

    const globalShortcutsifate = obj.getInterface(PORTAL_INTERFACE);

    const createSession = await globalShortcutsifate.CreateSession({ "session_handle_token": new Variant("s", "Vesktop"), "handle_token": new Variant("s", getRequestToken()) });
    // return createSession;

    // const response = new Message({
    //     path: createSession,
    //     interface: "org.freedesktop.portal.Request",
    //     member: "Response"
    // });
    // let rat2 = "";
    handleResponse("test");
    //     handleResponse(JSON.stringify(msg));
    // });

    sessionBus.on("message", msg => {
        // handleResponse(JSON.stringify(msg));
        if (msg.path === createSession &&
            msg.interface === "org.freedesktop.portal.Request"
            && msg.member === "Response") {
            // handle the method by sending a reply
            // console.error("DBUS", msg);
            gotGSCreateSessionResponse(e, msg);
            const handle = msg; // .body[1].session_handle.value;
            handleResponse(JSON.stringify(handle));
            return true;
        }
    });
    // return rat2;


    // const reply = await sessionBus.call(response);
    // return reply.body[0];
}

