/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { ErrorBoundary } from "@components/index";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

import FullPreview, { EditorState, updateOffset } from "./Preview";

const settings = definePluginSettings({
    ezPFP: {
        type: OptionType.BOOLEAN,
        description: "Enable EzPFP",
        default: true
    },
});

export default definePlugin({
    name: "EzPFP",
    description: "Preview your profile picture before saving and getting rate limited when you can't get it right",
    authors: [Devs.RandomCat],
    settings,
    patches: [
        {
            find: "keyboardStep:.025",
            replacement: [
                {
                    match: /(?<=minValue:1,maxValue:)2(?=,keyboardStep:\.025)/,
                    replace: "arguments[0].uploadType === 'AVATAR' ? 5 : 2",
                },
                {
                    match: /(\{cropDimensions:(\i),dragBoundaries:\i,imageDimensions:(\i),imageRotation:(\i),imageTransformCoordinates:\i,zoomRatio:(\i),startingCoordinates:\i,isDragging:\i,hasImageEdits:\i\}=\i)/,
                    replace: "$1,ezpfpState={crop:$2,image:$3,rotation:$4,zoom:$5}"
                },
                {
                    match: /(showUpsell:!0,position:"inline",className:\i\.\i\}\))(?=\])/,
                    replace: "$1,$self.renderPreview(arguments[0].imageUri,ezpfpState,arguments[0].uploadType==='AVATAR')"
                },
                {
                    match: /(\i)\.current=\(0,\i\.\i\)\(\i,\i,\i\),/,
                    replace: "$&$self.updateOffset($1.current),"
                },
                {
                    match: /(?<=size:)"md"(?=,actionBarInput)/,
                    replace: "arguments[0].uploadType === 'AVATAR' ? 'lg' : 'md'"
                }
            ],
        },
    ],

    updateOffset,

    renderPreview: (src: string, state: EditorState, isPFPModal: boolean) => (
        <ErrorBoundary noop>
            <FullPreview src={src} state={state} isPFPModal={isPFPModal} />
        </ErrorBoundary>
    ),
});

function ReactComponent() {
    const { ezPFP } = settings.use(["ezPFP"]);

    return <div>{ezPFP ? "EzPFP is enabled" : "EzPFP is disabled"}</div>;
}
