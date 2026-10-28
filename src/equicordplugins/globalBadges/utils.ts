/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { classNameFactory } from "@utils/css";

import { settings } from "./settings";

export let GlobalBadges = {};
export const INVITE_LINK = "kwHCJPxp8t";
export const cl = classNameFactory("vc-global-badges-");
export const serviceMap: Record<string, string> = {
    badgevault: "BadgeVault",
    nekocord: "Nekocord",
    reviewdb: "ReviewDB",
    aero: "Aero",
    aliucord: "Aliucord",
    raincord: "Raincord",
    velocity: "Velocity",
    enmity: "Enmity",
    paicord: "Paicord",
    bunny: "Bunny",
    goosemod: "GooseMod",
    replugged: "Replugged",
    betterdiscord: "BetterDiscord",
    vendroidenhanced: "VendroidEnhanced",
    revenge: "Revenge",
    record: "ReCord",
    vencord: "Vencord",
    equicord: "Equicord"
};

const blockedMods = ["vencord", "equicord"];

export async function loadBadges() {
    const globalBadges = await fetch("https://badges.equicord.org/users", { cache: "no-cache" }).then(r => r.json());
    const filteredUsers: Record<string, typeof globalBadges.users[string]> = {};

    for (const key in globalBadges.users) {
        filteredUsers[key] = globalBadges.users[key].filter(b => {
            const { mod } = b;
            if (!mod || blockedMods.includes(mod)) return false;

            const conditionalMods = {
                aero: settings.store.showAero,
                velocity: settings.store.showVelocity,
                badgevault: settings.store.showCustom,
                nekocord: settings.store.showNekocord,
                reviewdb: settings.store.showReviewDB,
                aliucord: settings.store.showAliucord,
                raincord: settings.store.showRaincord,
                enmity: settings.store.showEnmity,
                paicord: settings.store.showPaicord,
                bunny: settings.store.showBunny,
                goosemod: settings.store.showGooseMod,
                replugged: settings.store.showReplugged,
                betterdiscord: settings.store.showBetterDiscord,
                vendroidenhanced: settings.store.showVendroidEnhanced,
                revenge: settings.store.showRevenge,
                record: settings.store.showReCord
            };

            if (mod in conditionalMods && !conditionalMods[mod]) return false;

            return true;
        }).map(b => {
            const modFormatted = serviceMap[b.mod];
            const prefix = settings.store.showModStyle === "prefix" ? `${modFormatted} - ` : "";
            const suffix = settings.store.showModStyle === "suffix" ? ` - ${modFormatted}` : "";

            const tooltip = prefix + b.tooltip + suffix;
            return {
                ...b,
                key: b.tooltip,
                tooltip
            };
        });
    }

    GlobalBadges = filteredUsers;
}
