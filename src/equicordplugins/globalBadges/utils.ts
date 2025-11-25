/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";

import { settings } from "./settings";
import { BadgeCache } from "./types";

const cache = new Map<string, BadgeCache>();
const EXPIRES = 1000 * 60 * 15;

export const cl = classNameFactory("vc-global-badges-");
export const INVITE_LINK = "kwHCJPxp8t";

export const fetchBadges = (id: string): BadgeCache["badges"] | undefined => {
    const cachedValue = cache.get(id);
    if (!cache.has(id) || (cachedValue && cachedValue.expires < Date.now())) {
        const services: string[] = [];
        if (settings.store.showNekocord) services.push("nekocord");
        if (settings.store.showReviewDB) services.push("reviewdb");
        if (settings.store.showAero) services.push("aero");
        if (settings.store.showAliucord) services.push("aliucord");
        if (settings.store.showRa1ncord) services.push("ra1ncord");
        if (settings.store.showVelocity) services.push("velocity");
        if (settings.store.showEnmity) services.push("enmity");
        if (settings.store.showReplugged) services.push("replugged");
        if (settings.store.showCustom) services.push("badgevault");

        if (services.length === 0) {
            cache.set(id, { badges: {}, expires: Date.now() + EXPIRES });
            return {};
        }

        fetch(`${settings.store.apiUrl}${id}?seperated=true&capitalize=true&services=${services.join(",")}`)
            .then(res => res.json() as Promise<{ status: number; badges: BadgeCache["badges"]; }>)
            .then(body => {
                cache.set(id, { badges: body.badges, expires: Date.now() + EXPIRES });
                return body.badges;
            })
            .catch(() => null);
    } else if (cachedValue) {
        return cachedValue.badges;
    }
};
