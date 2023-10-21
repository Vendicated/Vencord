/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import "./index.css";

import { DataStore } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import { Flex } from "@components/Flex";
import { Devs } from "@utils/constants";
import { useForceUpdater } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { Forms, Text, TextInput } from "@webpack/common";

interface SoundReplacement {
    name: string;
    link: string;
}

let soundReplacements: SoundReplacement[] = [];
let availableSounds: string[] = [];

const settings = definePluginSettings({
    // Detune sounds are alternative, weird sounding versions of the default sounds. I don't know why they exist
    showDetuneSounds: {
        type: OptionType.BOOLEAN,
        description: "Show unused(?) \"detune\" sounds in SoundChanger settings. You probably don't need this enabled.",
        default: false,
        requiresRestart: true
    },

    replacements: {
        type: OptionType.COMPONENT,
        description: "",
        component: () => {
            const update = useForceUpdater();
            return (
                <>
                    <Forms.FormTitle tag="h4">Sounds</Forms.FormTitle>
                    <Flex flexDirection="column">
                        {
                            availableSounds.map(sound => (
                                <Flex
                                    key={sound}
                                    flexDirection="row"
                                    style={{ alignItems: "center", justifyContent: "space-between" }}
                                >
                                    <Text>{sound.slice(2, -4)}</Text>
                                    <TextInput
                                        className="sound-changer-link-input"
                                        value={soundReplacements.find(r => r.name === sound)?.link ?? ""}
                                        placeholder="Link to a sound..."
                                        onChange={link => {
                                            const index = soundReplacements.findIndex(r => r.name === sound);

                                            if (index === -1) {
                                                soundReplacements.push({ name: sound, link });
                                            } else {
                                                soundReplacements[index].link = link;
                                            }

                                            DataStore.set("SoundChange_replacements", soundReplacements);
                                            update();
                                        }}
                                    />
                                </Flex>
                            ))
                        }
                    </Flex>
                </>
            );
        }
    }
});

export default definePlugin({
    name: "SoundChanger",
    authors: [Devs.SpikeHD],
    description: "Change Discord sounds to be your own!",

    patches: [{
        find: "./message1.mp3",
        replacement: [
            // This only runs once, making it a good source for dynamically retrieving all of the sounds the user can change
            {
                match: /var (.{1,2})=(\{.+?\});/g,
                replace: "var $1=$2;$self.registerSoundFilenames($1);",
            },
            // This runs whenever Discord needs to play a sound
            {
                match: /(var .{1,2}=.{1,2}\((.{1,2})\));return (.{1,2}\(.{1,2}\))/g,
                replace: "$1;return $self.getSound($2) ?? $3"
            }
        ]
    }],

    settings,

    registerSoundFilenames: (names: Record<string, number>) => {
        availableSounds = Vencord.Plugins.plugins.SoundChanger.settings?.store.showDetuneSounds ? Object.keys(names) : Object.keys(names).filter(name => !name.includes("detune"));
    },

    getSound: (name: string) => {
        const replacement = soundReplacements.find(r => r.name === name);

        if (replacement?.link) {
            return replacement.link;
        }

        return null;
    },

    start: async () => {
        soundReplacements = await DataStore.get("SoundChange_replacements") ?? [];
    }
});
