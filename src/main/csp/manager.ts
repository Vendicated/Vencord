/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NativeSettings } from "@main/settings";
import { IpcEvents } from "@shared/IpcEvents";
import { dialog, ipcMain } from "electron";

import { CspPolicies, ImageAndCssSrc } from ".";

export type CspRequestResult = "invalid" | "cancelled" | "unchecked" | "ok" | "conflict";

export function registerCspIpcHandlers() {
    ipcMain.handle(IpcEvents.CSP_REMOVE_OVERRIDE, (_, domain: string) => removeCspRule(domain));
    ipcMain.handle(IpcEvents.CSP_REQUEST_ADD_OVERRIDE, async (_, url: string, directives: string[], callerName: string) =>
        addCspRule(url, directives, callerName)
    );
    ipcMain.handle(IpcEvents.CSP_IS_DOMAIN_ALLOWED, (_, url: string, directives: string[]) => {
        try {
            const domain = new URL(url).hostname;
            const ruleForDomain = CspPolicies[domain] ?? NativeSettings.store.customCspRules[domain];
            return ruleForDomain && directives.every(d => ruleForDomain.includes(d));
        } catch (e) {
            return false;
        }
    });
}

// TODO: remove this when URL.canParse is more mature
const isUrlValid = URL.canParse || ((url: string) => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
});

function validate(domain: string, directives: string[]) {
    if (!isUrlValid(domain)) return false;
    if (directives.length === 0) return false;
    if (directives.some(d => !ImageAndCssSrc.includes(d))) return false;

    return true;
}

function getMessage(url: string, directives: string[], callerName: string) {
    const domain = new URL(url).hostname;

    const message = `${callerName} wants to allow connections to ${domain}.`;

    let detail = `Unless you recognise and fully trust ${domain}, you should cancel this request!\n\nYou will have to fully close and restart the app for the changes to take effect.`;

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

    detail = `The following types of content will be allowed to load from ${domain}: ${contentTypes}\n\n${detail}`;

    return { message, detail };
}

async function addCspRule(url: string, directives: string[], callerName: string): Promise<CspRequestResult> {
    if (!validate(url, directives)) {
        return "invalid";
    }

    const domain = new URL(url).hostname;

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

function removeCspRule(domain: string) {
    if ((domain in NativeSettings.store)) {
        delete NativeSettings.store.customCspRules[domain];
        return true;
    }
    return false;
}
