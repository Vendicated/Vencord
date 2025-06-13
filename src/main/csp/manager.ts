/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NativeSettings } from "@main/settings";
import { IpcEvents } from "@shared/IpcEvents";
import { dialog, ipcMain, IpcMainInvokeEvent } from "electron";

import { CspPolicies, ImageAndCssSrc } from ".";

export type CspRequestResult = "invalid" | "cancelled" | "unchecked" | "ok" | "conflict";

export function registerCspIpcHandlers() {
    ipcMain.handle(IpcEvents.CSP_REMOVE_OVERRIDE, removeCspRule);
    ipcMain.handle(IpcEvents.CSP_REQUEST_ADD_OVERRIDE, addCspRule);
    ipcMain.handle(IpcEvents.CSP_IS_DOMAIN_ALLOWED, isDomainAllowed);
}

function validate(url: string, directives: string[]) {
    try {
        const { host } = new URL(url);

        if (/[;'"\\]/.test(host)) return false;
    } catch {
        return false;
    }

    if (directives.length === 0) return false;
    if (directives.some(d => !ImageAndCssSrc.includes(d))) return false;

    return true;
}

function getMessage(url: string, directives: string[], callerName: string) {
    const domain = new URL(url).host;

    const message = `${callerName} wants to allow connections to ${domain}`;

    let detail =
        `Unless you recognise and fully trust ${domain}, you should cancel this request!\n\n` +
        `You will have to fully close and restart ${IS_DISCORD_DESKTOP ? "Discord" : "Vesktop"} for the changes to take effect.`;

    if (directives.length === 1 && directives[0] === "connect-src") {
        return { message, detail };
    }

    const contentTypes = directives
        .filter(type => type !== "connect-src")
        .map(type => {
            switch (type) {
                case "img-src":
                    return "Images";
                case "style-src":
                    return "CSS & Themes";
                case "font-src":
                    return "Fonts";
                default:
                    throw new Error(`Illegal CSP directive: ${type}`);
            }
        })
        .sort()
        .join(", ");

    detail = `The following types of content will be allowed to load from ${domain}:\n${contentTypes}\n\n${detail}`;

    return { message, detail };
}

async function addCspRule(_: IpcMainInvokeEvent, url: string, directives: string[], callerName: string): Promise<CspRequestResult> {
    if (!validate(url, directives)) {
        return "invalid";
    }

    const domain = new URL(url).host;

    if (domain in NativeSettings.store.customCspRules) {
        return "conflict";
    }

    const { checkboxChecked, response } = await dialog.showMessageBox({
        ...getMessage(url, directives, callerName),
        type: callerName ? "info" : "warning",
        title: "Vencord Host Permissions",
        buttons: ["Cancel", "Allow"],
        defaultId: 0,
        cancelId: 0,
        checkboxLabel: `I fully trust ${domain} and understand the risks of allowing connections to it.`,
        checkboxChecked: false,
    });

    if (response !== 1) {
        return "cancelled";
    }

    if (!checkboxChecked) {
        return "unchecked";
    }

    NativeSettings.store.customCspRules[domain] = directives;
    return "ok";
}

function removeCspRule(_: IpcMainInvokeEvent, domain: string) {
    if (domain in NativeSettings.store.customCspRules) {
        delete NativeSettings.store.customCspRules[domain];
        return true;
    }

    return false;
}

function isDomainAllowed(_: IpcMainInvokeEvent, url: string, directives: string[]) {
    try {
        const domain = new URL(url).host;

        const ruleForDomain = CspPolicies[domain] ?? NativeSettings.store.customCspRules[domain];
        if (!ruleForDomain) return false;

        return directives.every(d => ruleForDomain.includes(d));
    } catch (e) {
        return false;
    }
}
