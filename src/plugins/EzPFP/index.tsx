/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { ErrorBoundary } from "@components/index";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/index";
import definePlugin, { OptionType } from "@utils/types";

import Preview, { EditorState, updateOffset } from "./Preview";

const settings = definePluginSettings({
    ezPFP: {
        type: OptionType.BOOLEAN,
        description: "Enable EzPFP",
        default: true
    },
    partyMode: {
        type: OptionType.BOOLEAN,
        description: "Enable Party Mode",
        default: false
    }
});

const logger = new Logger("EzPFP", "#a6d189");

export default definePlugin({
    name: "EzPFP",
    description: "Tired of rechanging and rechecking your profile picture until it feels right?, This plugin will allow you to preview your profile picture in different contexts and sizes before saving it.",
    authors: [Devs.RandomCat],
    settings,
    patches: [
        {
            find: "keyboardStep:.025",
            replacement: [
                {
                    match: /(?<=minValue:1,maxValue:)2(?=,keyboardStep:\.025)/,
                    replace: "arguments[0].uploadType !== null && arguments[0].uploadType === 'AVATAR' ? 20 : 2",
                },

                {
                    match: /(\{cropDimensions:(\i),dragBoundaries:\i,imageDimensions:(\i),imageRotation:(\i),imageTransformCoordinates:\i,zoomRatio:(\i),startingCoordinates:\i,isDragging:\i,hasImageEdits:\i\}=\i)/,
                    replace: "$1,ezpfpState={crop:$2,image:$3,rotation:$4,zoom:$5}"
                },
                {
                    match: /(showUpsell:!0,position:"inline",className:\i\.\i\}\))(?=\])/,
                    replace: "$1,$self.renderPreview(arguments[0].imageUri,ezpfpState)"
                },
                {
                    match: /(\i)\.current=\(0,\i\.\i\)\(\i,\i,\i\),/,
                    replace: "$&$self.updateOffset($1.current),"
                }
            ],
        },
    ],

    updateOffset,

    renderPreview: (src: string, state: EditorState) => (
        <ErrorBoundary noop>
            <Preview src={src} state={state} />
        </ErrorBoundary>
    ),
});

function ReactComponent() {
    const { ezPFP } = settings.use(["ezPFP"]);

    return <div>{ezPFP ? "EzPFP is enabled" : "EzPFP is disabled"}</div>;
}
