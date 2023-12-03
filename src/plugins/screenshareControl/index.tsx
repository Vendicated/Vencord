/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
    to-do:
        maybe patch somewhere else, so that discord's default category buttons can be used
        organize naming conventions
        maybe change name
*/

const CUSTOM_TAB_ID = 4;

import { definePluginSettings } from "@api/Settings";
import { Flex } from "@components/Flex";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { useState } from "@webpack/common";

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
        components and component helpers
    */
    makeSelector(data, setValue, selectedValue) {
        const ButtonGroup = Vencord.Webpack.wreq(140848).default;
        var SelectorClasses = Vencord.Webpack.wreq(986916);
        var { Text } = this.discordComponents;

        var Buttons = data.map(val => ({
            content: [
                <Text
                    variant="text-xs/normal"
                    className={val.value === selectedValue ? SelectorClasses.selectorTextSelected : SelectorClasses.selectorText}
                >
                    {val.label}
                </Text>,
            ],
            className: val.value === selectedValue ? SelectorClasses.selectorButtonSelected : SelectorClasses.selectorButton,
            onClick: () => { setValue(val.value); },
        }));

        return <ButtonGroup buttons={Buttons} />;
    },

    numberInput({ defaultValue, changeCallback, title }) {
        var [Value, setValue] = useState(defaultValue);
        var ThisPlugin = Vencord.Plugins.plugins["Screenshare Control"];
        var { FormText, TextInput } = ThisPlugin.discordComponents;

        function sanitizeNumber(val) {
            if (val === undefined || val === 0 || isNaN(val) || val == null) return undefined;
            return val;
        }

        return (
            <>
                <FormText tag="h4" titleClassName={ThisPlugin.discordClasses.formItemTitleVerySlim} className={ThisPlugin.discordClasses2.documentModeGroup}>
                    {title}
                </FormText>
                <TextInput
                    value={sanitizeNumber(Value) || ""}
                    spellCheck={false}
                    onChange={(str: string) => {
                        changeCallback(sanitizeNumber(parseInt(str)));
                        setValue(sanitizeNumber(parseInt(str)));
                    }}
                />
            </>
        );
    },

    /*
        hook functions
    */
    drawSettings(PresetInfo) {
        var { FormItem, Text } = this.discordComponents;

        var Localization = Vencord.Webpack.wreq(782340).default.Messages;

        switch (PresetInfo.selectedPreset) {
            case 1:
            case 3:
                var Resolutions = PresetInfo.captureDeviceSelected ? this.discordAppStreamStuff.GoLiveDeviceResolutionButtons : this.discordAppStreamStuff.ApplicationStreamResolutionButtons;
                var ResolutionPicker = this.makeSelector(Resolutions, PresetInfo.onResolutionChange, PresetInfo.selectedResolution);

                var FPSs = this.discordAppStreamStuff.ApplicationStreamFPSButtons;
                var FPSPicker = this.makeSelector(FPSs, PresetInfo.onFPSChange, PresetInfo.selectedFPS);

                return (
                    <>
                        <FormItem title={Localization.STREAM_RESOLUTION} titleClassName={this.discordClasses2.settingsGroup} className={this.discordClasses.formItemTitleSlim}>
                            {ResolutionPicker}
                        </FormItem>

                        <FormItem title={Localization.SCREENSHARE_FRAME_RATE} titleClassName={this.discordClasses.formItemTitleSlim} className={this.discordClasses2.documentModeGroup}>
                            {FPSPicker}
                        </FormItem>
                    </>
                );
            case 2:
                return (
                    <FormItem title={Localization.STREAM_RESOLUTION} titleClassName={this.discordClasses.formItemTitleSlim} className={this.discordClasses2.documentModeGroup}>
                        <Text variant="text-xs/normal">{Localization.STREAM_PRESET_DOCUMENTS_DESCRIPTION_NITRO.format({ fps: PresetInfo.selectedFPS })}</Text>
                    </FormItem>
                );
            case 4:
                return (
                    <>
                        <FormItem
                            title={Localization.STREAM_RESOLUTION}
                            titleClassName={this.discordClasses.formItemTitleSlim}
                        >
                            <Flex flexDirection="row" style={{ flexGrow: 1, gap: "0.5em" }}>
                                <Flex flexDirection="column" style={{ flexGrow: 1, gap: "0.5em" }}>
                                    <this.numberInput
                                        title="Width"
                                        defaultValue={this.settings.store.width}
                                        changeCallback={(str: string) => {
                                            this.settings.store.width = parseInt(str);
                                        }} />
                                </Flex>
                                <Flex flexDirection="column" style={{ flexGrow: 1, gap: "0.5em" }}>
                                    <this.numberInput
                                        title="Height"
                                        defaultValue={this.settings.store.height}
                                        changeCallback={(str: string) => {
                                            this.settings.store.height = parseInt(str);
                                        }} />
                                </Flex>
                                <Flex flexDirection="column" style={{ flexGrow: 1, gap: "0.5em" }}>
                                    <this.numberInput
                                        title="FPS"
                                        defaultValue={this.settings.store.fps}
                                        changeCallback={(str: string) => {
                                            this.settings.store.fps = parseInt(str);
                                        }} />
                                </Flex>
                            </Flex>
                        </FormItem>

                        <FormItem
                            title="Bitrate"
                            titleClassName={this.discordClasses.formItemTitleSlim}
                        >
                            <Flex flexDirection="row" style={{ flexGrow: 1, gap: "0.5em" }}>
                                <Flex flexDirection="column" style={{ flexGrow: 1, gap: "0.5em" }}>
                                    <this.numberInput
                                        title="Target bitrate"
                                        defaultValue={this.settings.store.brtarget}
                                        changeCallback={(str: string) => {
                                            this.settings.store.brtarget = parseInt(str);
                                        }} />
                                </Flex>
                                <Flex flexDirection="column" style={{ flexGrow: 1, gap: "0.5em" }}>
                                    <this.numberInput
                                        title="Max bitrate"
                                        defaultValue={this.settings.store.brmax}
                                        changeCallback={(str: string) => {
                                            this.settings.store.brmax = parseInt(str);
                                        }} />
                                </Flex>
                                <Flex flexDirection="column" style={{ flexGrow: 1, gap: "0.5em" }}>
                                    <this.numberInput
                                        title="Min bitrate"
                                        defaultValue={this.settings.store.brmin}
                                        changeCallback={(str: string) => {
                                            this.settings.store.brmin = parseInt(str);
                                        }} />
                                </Flex>
                            </Flex>
                        </FormItem>
                    </>
                );
            default:
                return (
                    <>
                        o no..,.
                    </>
                );
        }
    },

    lastPreset: 0,
    overrideQuality(Connection) {
        // don't affect connections that are not streams
        if (Connection.context !== "stream")
            return;

        if (this.lastPreset === 4) {
            for (let i = 0; i < Connection.videoStreamParameters.length; i++) {
                var Conn = Connection.videoStreamParameters[i];

                if (this.settings.store.brmax !== 0) Conn.maxBitRate = this.settings.store.brmax;

                Conn.maxFrameRate = this.settings.store.fps;
                Conn.maxResolution.type = "fixed";
                Conn.maxResolution.width = this.settings.store.width;
                Conn.maxResolution.height = this.settings.store.height;
                Conn.maxPixelCount = this.settings.store.width * this.settings.store.height;
                Conn.quality = 100; // TO-DO: add quality option? still gotta test if it's actually worth it

                Connection.videoStreamParameters[i] = Conn;
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
            Connection.videoQualityManager.setQuality(QualityOverrides);
        } else {
            // restore quality to what would be expected of the preset
            var QualityDefault = {
                capture: {
                    framerate: Connection.videoStreamParameters[0].maxFrameRate,
                    width: Connection.videoStreamParameters[0].maxResolution.width,
                    height: Connection.videoStreamParameters[0].maxResolution.height,
                    pixelCount: Connection.videoStreamParameters[0].maxResolution.width * Connection.videoStreamParameters[0].maxResolution.height
                },
                encode: {
                    framerate: Connection.videoStreamParameters[0].maxFrameRate,
                    width: Connection.videoStreamParameters[0].maxResolution.width,
                    height: Connection.videoStreamParameters[0].maxResolution.height,
                    pixelCount: Connection.videoStreamParameters[0].maxResolution.width * Connection.videoStreamParameters[0].maxResolution.height
                },
                bitrateMax: Connection.videoStreamParameters[0].maxBitRate,
                bitrateMin: undefined,
                bitrateTarget: undefined
            };
            Connection.videoQualityManager.setQuality(QualityDefault);
        }
    },

    /*
        discord modules
    */
    start() {
        this.discordComponents = findByPropsLazy("FormItem", "FormText");
        this.discordClasses = findByPropsLazy("formItemTitleVerySlim");
        this.discordClasses2 = findByPropsLazy("documentModeGroup");
        this.discordTooltipClasses = findByPropsLazy("tooltipBlack");
        this.discordAppStreamStuff = findByPropsLazy("GoLiveDeviceResolutionButtons");
    }
});
