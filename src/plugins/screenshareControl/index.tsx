/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
    to-do:
        maybe patch somewhere else, so that discord's default category buttons can be used rather than needing to be rebuilt
        remove repetition on overrideQuality
        maybe change name
*/

const CUSTOM_TAB_ID = 4;

import { definePluginSettings } from "@api/Settings";
import { Flex } from "@components/Flex";
import definePlugin, { OptionType } from "@utils/types";
import { filters, findBulk, findByPropsLazy, findExportedComponentLazy, proxyLazyWebpack } from "@webpack";
import { useState } from "@webpack/common";

const Classes = proxyLazyWebpack(() => {
    const modules = findBulk(
        filters.byProps("formItemTitleVerySlim"),
        filters.byProps("documentModeGroup"),
        filters.byProps("tooltipBlack"),
        filters.byProps("item", "group"),
        filters.byProps("selectorText", "selectorTextSelected", "selectorButton")
    );
    return Object.assign({}, ...modules);
}) as Record<"documentModeGroup" | "settingsGroup" | "formItemTitleSlim" | "formItemTitleVerySlim", string>;
const { documentModeGroup, settingsGroup, formItemTitleSlim, formItemTitleVerySlim } = Classes;

const SelectorClasses = proxyLazyWebpack(() => {
    const modules = findBulk(
        filters.byProps("item", "group"),
        filters.byProps("selectorText", "selectorTextSelected", "selectorButton")
    );
    return Object.assign({}, ...modules);
}) as Record<"selectorText" | "selectorTextSelected" | "selectorButton" | "selectorButtonSelected" | "item" | "group", string>;

const AppStreamModule = findByPropsLazy("ApplicationStreamFPSButtons");
const { Messages } = findByPropsLazy("Messages", "initialLanguageLoad");

// components
const Text = findExportedComponentLazy("Text");
const TextInput = findExportedComponentLazy("TextInput");
const FormText = findExportedComponentLazy("FormText");
const FormItem = findExportedComponentLazy("FormItem");
const FocusRing = findExportedComponentLazy("FocusRing");

/*
    custom components
*/
function ButtonSelector({ data, setValue, currentValue }) {
    const { selectorText, selectorTextSelected, selectorButton, selectorButtonSelected } = SelectorClasses;
    const { item, group } = SelectorClasses;

    var Buttons = data.map(val => (
        <FocusRing>
            <button
                type="button"
                className={`${item} ${selectorButton} ${val.value === currentValue ? selectorButtonSelected : ""}`}
                onClick={() => { setValue(val.value); }}
            >
                <Text
                    variant="text-xs/normal"
                    className={val.value === currentValue ? selectorTextSelected : selectorText}
                >
                    {val.label}
                </Text>
            </button>
        </FocusRing>
    ));

    return (
        <div className={group} role="group">
            {Buttons}
        </div>
    );
}

function NumberInput({ defaultValue, changeCallback, title }) {
    var [value, setValue] = useState(defaultValue);

    function sanitizeNumber(val) {
        if (val === undefined || val === 0 || isNaN(val) || val == null) return undefined;
        return val;
    }

    return (
        <>
            <FormText tag="h4" titleClassName={formItemTitleVerySlim} className={documentModeGroup}>
                {title}
            </FormText>
            <TextInput
                value={sanitizeNumber(value) || ""}
                spellCheck={false}
                onChange={(str: string) => {
                    changeCallback(sanitizeNumber(parseInt(str)));
                    setValue(sanitizeNumber(parseInt(str)));
                }}
            />
        </>
    );
}

function SettingInput({ entries }) {
    var Content: JSX.Element[] = [];
    entries.forEach(entry => {
        Content.push(<Flex flexDirection="column" style={{ flexGrow: 1, gap: "0.5em" }}>
            <NumberInput
                title={entry.title}
                defaultValue={settings.store[entry.id]}
                changeCallback={(str: string) => {
                    settings.store[entry.id] = parseInt(str);
                }}
            />
        </Flex>);
    });
    return (<Flex flexDirection="row" style={{ flexGrow: 1, gap: "0.5em" }}>
        {Content}
    </Flex>);
}

/*
    actual module
*/
const settings = definePluginSettings({
    width: { description: "Screen width", type: OptionType.NUMBER, default: 1920 },
    height: { description: "Screen height", type: OptionType.NUMBER, default: 1080 },
    fps: { description: "Framerate", type: OptionType.NUMBER, default: 60 },
    brmin: { description: "Minimum bitrate", type: OptionType.NUMBER, default: 0 },
    brmax: { description: "Maximum bitrate", type: OptionType.NUMBER, default: 0 },
    brtarget: { description: "Target bitrate", type: OptionType.NUMBER, default: 0 },
});

export default definePlugin({
    name: "Screenshare Control",
    description: "Allows the use of custom resolutions, bitrate and framerate when screensharing.",
    settings,
    authors: [{ id: 1104474057916809226n, name: "neru" }],

    patches: [
        /*
            add custom option to dropdown
        */
        {
            find: "default.Messages.STREAM_PRESET_CUSTOM",
            replacement: {
                match: /default.Messages.STREAM_PRESET_CUSTOM/,
                replace: `default.Messages.STREAM_PRESET_CUSTOM }, { value: ${CUSTOM_TAB_ID}, label: "Manual resolution"`
            }
        },

        /*
            prevent indexing of custom value
        */
        {
            find: "ApplicationStreamPresetValues[",
            replacement: {
                match: /let (.{1,2})=(.{1,2})\.ApplicationStreamPresetValues\[(.{1,2})\];/,
                replace: `if ($3 == ${CUSTOM_TAB_ID}) return null;let $1=$2.ApplicationStreamPresetValues[$3];`
            }
        },

        /*
            override the drawing of stream settings
        */
        {
            find: "ApplicationStreamFPSButtons.map(",
            replacement: {
                match: /,(.{1,2})=(.{1,2})===(.{1,2}).ApplicationStreamPresets.PRESET_DOCUMENTS.+;/,
                replace: ";var $1 = $self.drawSettings(arguments[0]);"
            }
        },

        /*
            log last active preset to determine whether to apply quality or not
        */
        {
            find: "Received null target channel ID",
            replacement: {
                match: /\(0,S\.updateStreamSettings\)\({preset:(.{1,2}),resolution:(.{1,2}),frameRate:(.{1,2})}\);/,
                replace: "(0,S.updateStreamSettings)({preset:$1,resolution:$2,frameRate:$3});$self.lastPreset = $1;"
            }
        },

        /*
            hook after updateVideoQuality to apply patches
        */
        {
            find: "this.framerateReducer.destroy()",
            replacement: {
                match: /pickProperties\((.{1,2}),(.{1,2})\);/,
                replace: "pickProperties($1,$2);$self.overrideQuality(this);"
            }
        }
    ],

    /*
        hook functions
    */
    drawSettings(PresetInfo) {
        const { ApplicationStreamFPSButtons, GoLiveDeviceResolutionButtons, ApplicationStreamResolutionButtons } = AppStreamModule;

        switch (PresetInfo.selectedPreset) {
            case 1:
            case 3:
                var ResolutionList = PresetInfo.captureDeviceSelected ? GoLiveDeviceResolutionButtons : ApplicationStreamResolutionButtons;
                var FPSList = ApplicationStreamFPSButtons;
                return (
                    <>
                        <FormItem title={Messages.STREAM_RESOLUTION} titleClassName={settingsGroup} className={formItemTitleSlim}>
                            <ButtonSelector data={ResolutionList} setValue={PresetInfo.onResolutionChange} currentValue={PresetInfo.selectedResolution} />
                        </FormItem>
                        <FormItem title={Messages.SCREENSHARE_FRAME_RATE} titleClassName={formItemTitleSlim} className={documentModeGroup}>
                            <ButtonSelector data={FPSList} setValue={PresetInfo.onFPSChange} currentValue={PresetInfo.selectedFPS} />
                        </FormItem>
                    </>
                );
            case 2:
                return (
                    <FormItem title={Messages.STREAM_RESOLUTION} titleClassName={formItemTitleSlim} className={documentModeGroup}>
                        <Text variant="text-xs/normal">{Messages.STREAM_PRESET_DOCUMENTS_DESCRIPTION_NITRO.format({ fps: PresetInfo.selectedFPS })}</Text>
                    </FormItem>
                );
            case 4:
                return (
                    <>
                        <FormItem
                            title={Messages.STREAM_RESOLUTION}
                            titleClassName={formItemTitleSlim}
                        >
                            <SettingInput entries={[
                                { id: "width", title: "Width" },
                                { id: "height", title: "Height" },
                                { id: "fps", title: "FPS" },
                            ]} />
                        </FormItem>

                        <FormItem
                            title="Bitrate"
                            titleClassName={formItemTitleSlim}
                        >
                            <SettingInput entries={[
                                { id: "brtarget", title: "Target" },
                                { id: "brmax", title: "Max" },
                                { id: "brmin", title: "Min" },
                            ]} />
                        </FormItem>
                    </>
                );
        }
    },

    lastPreset: 0,
    overrideQuality(Connection) {
        if (Connection.context !== "stream") return;

        const { store } = this.settings;
        const { videoStreamParameters, videoQualityManager } = Connection;

        if (this.lastPreset === 4) {
            for (let i = 0; i < videoStreamParameters.length; i++) {
                var Conn = videoStreamParameters[i];

                if (this.settings.store.brmax !== 0) Conn.maxBitRate = this.settings.store.brmax;

                Conn.maxFrameRate = this.settings.store.fps;
                Conn.maxResolution.type = "fixed";
                Conn.maxResolution.width = this.settings.store.width;
                Conn.maxResolution.height = this.settings.store.height;
                Conn.maxPixelCount = this.settings.store.width * this.settings.store.height;
                Conn.quality = 100; // TO-DO: add quality option? still gotta test if it's actually worth it

                videoStreamParameters[i] = Conn;
            }

            var QualityOverrides = {
                capture: {
                    framerate: this.settings.store.fps,
                    width: this.settings.store.width,
                    height: this.settings.store.height,
                    pixelCount: this.settings.store.width * this.settings.store.height
                },
                encode: {
                    framerate: this.settings.store.fps,
                    width: this.settings.store.width,
                    height: this.settings.store.height,
                    pixelCount: this.settings.store.width * this.settings.store.height

                },
                bitrateMax: this.settings.store.brmax ? this.settings.store.brmax : undefined,
                bitrateMin: this.settings.store.brmin ? this.settings.store.brmin : undefined,
                bitrateTarget: this.settings.store.brtarget ? this.settings.store.brtarget : undefined
            };
            videoQualityManager.setQuality(QualityOverrides);
        } else {
            // restore quality to what would be expected of the preset
            var QualityDefault = {
                capture: {
                    framerate: videoStreamParameters[0].maxFrameRate,
                    width: videoStreamParameters[0].maxResolution.width,
                    height: videoStreamParameters[0].maxResolution.height,
                    pixelCount: videoStreamParameters[0].maxResolution.width * videoStreamParameters[0].maxResolution.height
                },
                encode: {
                    framerate: videoStreamParameters[0].maxFrameRate,
                    width: videoStreamParameters[0].maxResolution.width,
                    height: videoStreamParameters[0].maxResolution.height,
                    pixelCount: videoStreamParameters[0].maxResolution.width * videoStreamParameters[0].maxResolution.height
                },
                bitrateMax: videoStreamParameters[0].maxBitRate,
                bitrateMin: undefined,
                bitrateTarget: undefined
            };
            videoQualityManager.setQuality(QualityDefault);
        }
    },
});
