/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Forms, Menu, TextInput, useState } from "@webpack/common";
import { cooldown, denormalize, normalize } from "./utils";

const settings = definePluginSettings({
    maxFPS: {
        description: "Max FPS for the range slider",
        default: 144,
        type: OptionType.COMPONENT,
        component: (props: any) => {
            const [value, setValue] = useState(settings.store.maxFPS);
            return <Forms.FormSection>
                <Forms.FormTitle>Max FPS for the range slider</Forms.FormTitle>
                <TextInput type="number" pattern="-?[0-9]+" onChange={value => { props.setValue(Math.max(Number.parseInt(value), 1)); setValue(value); }} value={value} />
            </Forms.FormSection>;
        }
    },
    maxResolution: {
        description: "Max Resolution for the range slider",
        default: 1080,
        type: OptionType.COMPONENT,
        component: (props: any) => {
            const [value, setValue] = useState(settings.store.maxResolution);
            return <Forms.FormSection>
                <Forms.FormTitle>Max Resolution for the range slider</Forms.FormTitle>
                <TextInput type="number" pattern="-?[0-9]+" onChange={value => { props.setValue(Math.max(Number.parseInt(value), 22)); setValue(value); }} value={value} />
            </Forms.FormSection>;
        }
    },
    roundValues: {
        description: "Round Resolution and FPS values to the nearest whole number",
        default: true,
        type: OptionType.BOOLEAN,
    },
    bitrates: {
        description: "ADVANCED: ONLY USE FOR TESTING PURPOSES!",
        default: false,
        type: OptionType.BOOLEAN,
        restartNeeded: false,
    },
    targetBitrate: {
        description: "Target Bitrate (seemingly no effect)",
        default: 600000,
        type: OptionType.NUMBER,
        hidden: true
    },
    minBitrate: {
        description: "Minimum Bitrate (forces the bitrate to be at LEAST this)",
        default: 500000,
        type: OptionType.NUMBER,
        hidden: true
    },
    maxBitrate: {
        description: "Maxmimum Bitrate (seems to not be reached most of the time)",
        default: 8000000,
        type: OptionType.NUMBER,
        hidden: true
    },
});

export default definePlugin({
    name: "CustomScreenShare",
    description: "Stream any resolution and any FPS!",
    authors: [Devs.KawaiianPizza],
    settingsAboutComponent: () => (
        <Forms.FormSection>
            <Forms.FormTitle tag="h3">Usage</Forms.FormTitle>
            <Forms.FormText>
                Adds a slider for the quality and fps options submenu
            </Forms.FormText>
        </Forms.FormSection>),
    settings,
    patches: [
        {
            find: "ApplicationStreamSettingRequirements)",
            replacement: {
                match: /for\(let \i of \i\.ApplicationStreamSettingRequirements\).+?!1/,
                replace: "return !0"
            }
        },
        {
            find: "ApplicationStreamFPSButtonsWithSuffixLabel.map",
            replacement: {
                match: /(\i=)(.{19}FPS.+?(\i).{11}>(\i).\i,(\i),\i,([A-z.]+).+?\}\)),/,
                replace: (_, g1, g2, g3, g4, g5, g6) => `${g1}[$self.CustomRange(${g4},${g5},${g3},${g6},'fps'),...${g2}],`
            }
        },
        {
            find: "ApplicationStreamResolutionButtonsWithSuffixLabel.map",
            replacement: {
                match: /(\i=)(.{19}Resolution.+?(\i).{11}>(\i).\i,\i,(\i),([A-z.]+).+?\}\));/,
                replace: (_, g1, g2, g3, g4, g5, g6) => `${g1}[$self.CustomRange(${g4},${g3},${g5},${g6},'resolution'),...${g2}];`
            }
        },
        {
            find: "\"remoteSinkWantsPixelCount\",\"remoteSinkWantsMaxFramerate\"",
            replacement: {
                match: /(max:|\i=)4e6,/,
                replace: (_, g1) => `${g1}8e6,`
            }
        },
        {
            find: "\"remoteSinkWantsPixelCount\",\"remoteSinkWantsMaxFramerate\"",
            replacement: {
                match: /(\i)=15e3/, // disable discord idle fps reduction
                replace: (_, g1) => `${g1}=15e8`
            }
        },
        {
            find: "updateRemoteWantsFramerate(){",
            replacement: {
                match: /updateRemoteWantsFramerate\(\)\{/, // disable discord mute fps reduction
                replace: (match) => `${match}return;`
            }
        },
        {
            find: "{getQuality(",
            replacement: {
                match: /bitrateMin:.+?,bitrateMax:.+?,bitrateTarget:.+?,/,
                replace: "bitrateMin:$self.getMinBitrate(),bitrateMax:$self.getMaxBitrate(),bitrateTarget:$self.getTargetBitrate(),"
            }
        },
        {
            find: "ApplicationStreamResolutionButtonsWithSuffixLabel.map",
            replacement: {
                match: /stream-settings-resolution-.+?children:\[/,
                replace: (match) => `${match}$self.settings.store.bitrates?$self.BitrateGroup():null,`
            }
        }
    ],
    CustomRange(changeRes: Function, res: number, fps: number, analytics: string, group: "fps" | "resolution") {
        const [value, setValue] = useState(group === "fps" ? fps : res);
        const { maxFPS, maxResolution, roundValues } = settings.store;

        let maxValue = group === "fps" ? maxFPS : maxResolution,
            minValue = group === "fps" ? 1 : 22; // 0 FPS freezes (obviously) and anything less than 22p doesn't work

        let onChange = (number: number) => {
            let tmp = denormalize(number, minValue, maxValue);
            if (roundValues)
                tmp = Math.round(tmp);
            setValue(tmp);
            cooldown(() => changeRes(true, group === "resolution" ? tmp : res, group === "fps" ? tmp : fps, analytics));
        };
        return (<Menu.MenuControlItem group={`stream-settings-${group}`} id={`stream-settings-${group}-custom`}>
            <Menu.MenuSliderControl
                onChange={onChange}
                renderValue={() => value + (group === "fps" ? " FPS" : "p")}
                value={normalize((group === "fps" ? fps : res), minValue, maxValue) || 0}
                minValue={0}
                maxValue={100}>
            </Menu.MenuSliderControl>
        </Menu.MenuControlItem>);
    },
    BitrateGroup() {
        const bitrates: Array<"target" | "min" | "max"> = ["min", "target", "max"];

        return (<Menu.MenuGroup label="Bitrate (Min/Target/Max)">
            {bitrates.map(e => this.BitrateSlider(e))}
        </Menu.MenuGroup>);
    },
    BitrateSlider(name: "target" | "min" | "max") {
        const [bitrate, setBitrate] = useState(this.settings.store[name + "Bitrate"]);
        const { minBitrate, maxBitrate } = settings.store;
        let onChange = (number: number) => {
            const tmp = denormalize(number, name === "min" ? 1000 : minBitrate, name === "max" ? 20000000 : maxBitrate);
            setBitrate(tmp);
            this.settings.store[name + "Bitrate"] = Math.round(tmp);
        };
        return (<Menu.MenuControlItem group={`stream-settings-bitrate-${name}`} id={`stream-settings-bitrate-${name}-custom`}>
            <Menu.MenuSliderControl
                onChange={onChange}
                renderValue={() => Math.round(bitrate / 1000) + "kbps"}
                value={normalize(bitrate, name === "min" ? 1000 : minBitrate, name === "max" ? 20000000 : maxBitrate) || 0}
                minValue={0}
                maxValue={100}>
            </Menu.MenuSliderControl>
        </Menu.MenuControlItem>);
    },
    getMinBitrate() {
        const { minBitrate } = settings.store;
        return minBitrate;
    },
    getTargetBitrate() {
        const { targetBitrate } = settings.store;
        return targetBitrate;
    },
    getMaxBitrate() {
        const { maxBitrate } = settings.store;
        return maxBitrate;
    }
});


