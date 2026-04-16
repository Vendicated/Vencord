/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs, EquicordDevs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { ReporterTestable } from "@utils/types";

import { migrateOldSettings } from "./migration";
import * as abs from "./services/audiobookshelf";
import * as gensokyoRadio from "./services/gensokyoRadio";
import * as jellyfin from "./services/jellyfin";
import * as listenbrainz from "./services/listenbrainz";
import * as statsfm from "./services/statsfm";
import * as tosu from "./services/tosu";
import { setOnServiceChange, settings, SettingsStore } from "./settings";
import { ServiceTab } from "./types";

type SettingsKey = keyof SettingsStore;

const logger = new Logger("RichPresence");

const services: Record<string, { start(): void; stop(): void; }> = {
    [ServiceTab.AudioBookShelf]: abs,
    [ServiceTab.Tosu]: tosu,
    [ServiceTab.StatsFm]: statsfm,
    [ServiceTab.Jellyfin]: jellyfin,
    [ServiceTab.ListenBrainz]: listenbrainz,
    [ServiceTab.GensokyoRadio]: gensokyoRadio,
};

const enableKeys: Record<string, SettingsKey> = {
    [ServiceTab.AudioBookShelf]: "abs_enabled",
    [ServiceTab.Tosu]: "tosu_enabled",
    [ServiceTab.StatsFm]: "sfm_enabled",
    [ServiceTab.Jellyfin]: "jf_enabled",
    [ServiceTab.ListenBrainz]: "lb_enabled",
    [ServiceTab.GensokyoRadio]: "gr_enabled",
};

const activeServices = new Set<string>();

function syncServices() {
    const globalEnabled = settings.store.enabled;

    for (const [id, service] of Object.entries(services)) {
        const shouldRun =
            globalEnabled && !!settings.store[enableKeys[id]];
        const isRunning = activeServices.has(id);

        if (shouldRun && !isRunning) {
            logger.info(`Starting ${id} service`);
            service.start();
            activeServices.add(id);
        } else if (!shouldRun && isRunning) {
            logger.info(`Stopping ${id} service`);
            service.stop();
            activeServices.delete(id);
        }
    }
}

function stopAllServices() {
    for (const id of activeServices) {
        logger.info(`Stopping ${id} service`);
        services[id].stop();
    }
    activeServices.clear();
}

export default definePlugin({
    name: "RichPresence",
    description: "Unified rich presence hub for AudioBookShelf, osu!, stats.fm, Jellyfin, ListenBrainz, and Gensokyo Radio.",
    tags: ["Activity"],
    authors: [
        EquicordDevs.vmohammad,
        Devs.AutumnVN,
        EquicordDevs.Crxa,
        Devs.SerStars,
        EquicordDevs.ZcraftElite,
        EquicordDevs.qouesm,
        Devs.RyanCaoDev,
        EquicordDevs.Prince527,
        EquicordDevs.creations,
    ],
    reporterTestable: ReporterTestable.None,

    settings,

    start() {
        migrateOldSettings();
        syncServices();
        setOnServiceChange(syncServices);
    },

    stop() {
        stopAllServices();
        setOnServiceChange(null);
    },
});
