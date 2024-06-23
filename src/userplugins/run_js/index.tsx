/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType, StartAt } from "@utils/types";
const suffix = "runjs-";
const settings = definePluginSettings({
    disableAll: {
        displayName: "Disable all scripts",
        description: "Disable all scripts",
        type: OptionType.BOOLEAN,
        default: false,
    },
    disableUrl: {
        displayName: "Disable URL scripts",
        description: "Disable URL scripts",
        type: OptionType.BOOLEAN,
        default: false,
    },

});
export default definePlugin({
    name: "RunJS",
    description: "Run custom JS on plugin start!\n\t!! USE AT YOUR OWN RISK ALL SCRIPTS WILL HAVE ACCESS TO VENCORD API !!",
    authors: [
        Devs.Neon,
        Devs.Zeon,
    ],
    settings,
    startAt: StartAt.DOMContentLoaded,
    // It might be likely you could delete these and go make patches above!
    start() {
        if (IS_WEB) return;
        const customSettingsSections = (
            Vencord.Plugins.plugins.Settings as any as { customSections: ((ID: Record<string, unknown>) => any)[]; }
        ).customSections;

        const CustomsJS = () => ({
            section: "CustomJS",
            label: "Custom JS",
            element: require("./components/ConfigTab").default,
            id: "CustomsJS"
        });

        customSettingsSections.push(CustomsJS);
        DataStore.get(suffix + "scripts").then(async scripts => {
            if (!scripts) return await DataStore.set(suffix + "scripts", []);
            if (settings.store.disableAll) return;
            for (const script of scripts) {
                if (script.disabled) continue;
                if (script.type === "choice") continue;
                try {
                    if (script.url && !settings.store.disableUrl) {
                        fetch(script.url)
                            .then(x => x.text())
                            .then(eval);
                    } else {
                        eval(script.script);
                    }
                } catch (e) {
                    console.error(e);
                }
            }
        });
        // run js sections first

    },
    stop() {
        const customSettingsSections = (
            Vencord.Plugins.plugins.Settings as any as { customSections: ((ID: Record<string, unknown>) => any)[]; }
        ).customSections;

        const i = customSettingsSections.findIndex(section => section({}).id === "CustomsJS");

        if (i !== -1) customSettingsSections.splice(i, 1);
        console.log("Byebye (i cant really disable the scripts so )");
    },
});