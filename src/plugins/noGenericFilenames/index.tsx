/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { closeAllModals } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { saveFile } from "@utils/web";
import { Button } from "@webpack/common";
import moment from "moment";

import FilenameUtil from "./utils/FilenameUtil";

const defaultSettings = definePluginSettings({
    includeMillis: {
        name: "Include millis",
        description: "Include milliseconds in the timestamp",
        type: OptionType.BOOLEAN,
        default: true,
    },
    // Todo: Make patterns separate themselves by pipes instead of commas
    coincidenceList: {
        name: "Generic names list",
        description: "Pipe symbol separated list of generic names.",
        type: OptionType.STRING,
        default: FilenameUtil.genericFilenamePatterns.join("|"),
    },
    resetSettings: {
        name: "Reset settings",
        description: "",
        type: OptionType.COMPONENT,
        component: () => (
            <Button onClick={() => plugin.resetSettings()}>
                Reset plugin settings to default values
            </Button >
        )
    }
});

const plugin = definePlugin({
    name: "NoGenericFilenames",
    description: "Prevent discord downloads from overwriting files with generic names by adding a timestamp.",
    settings: defaultSettings,
    authors: [Devs.Sphirye],

    patches: [
        {
            find: 'id:"save-image"',
            replacement: [
                {
                    match: /(?<=SAVE_IMAGE_MENU_ITEM,)action:/,
                    replace: "action:()=>$self.saveImage(arguments[0]),"
                },
            ]
        }
    ],

    getCurrentDate(): string {
        const { includeMillis } = settings.store;
        const m = moment();
        const date = m.format("YYYY-MM-DD");
        const time = m.format("H-MM-SS");
        const millis = includeMillis ? `.${m.milliseconds()}` : "";

        return `${date} ${time}${millis}`;
    },

    async saveImage(url: string) {
        const data = await fetchImage(url);

        if (!data) return;

        saveFile(FilenameUtil.resolveFile(url, data));
    },

    resetSettings() {
        settings.store.coincidenceList = FilenameUtil.genericFilenamePatterns.join("|");
        settings.store.includeMillis = false;
        closeAllModals();
    },

    get coincidenceList(): string {
        return settings.store.coincidenceList;
    },

    set coincidenceList(v: string) {
        settings.store.coincidenceList = v;
    },

});

const settings = defaultSettings;

async function fetchImage(url: string) {
    const res = await fetch(url);
    if (res.status !== 200) return;

    return await res.blob();
}

export default plugin;
