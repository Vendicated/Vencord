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
    extendedZoom: {
        type: OptionType.BOOLEAN,
        description: "Allow zooming further than Discord's default in the avatar editor",
        default: true
    },
    maxZoom: {
        type: OptionType.SLIDER,
        description: "Maximum zoom multiplier",
        markers: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
        default: 5,
        stickToMarkers: true
    },

    showPreview: {
        type: OptionType.BOOLEAN,
        description: "Show previews in the avatar editor modal",
        default: true
    }
});

export default definePlugin({
    name: "EzPFP",
    description: "Preview your profile picture before saving and getting rate limited when you can't get it right",
    authors: [Devs.RandomCat],
    tags: ["Appearance", "Customisation", "Utility"],
    settings,
    patches: [
        {
            find: "keyboardStep:.025",
            replacement: [
                {
                    match: /(?<=minValue:1,maxValue:)2(?=,keyboardStep:\.025)/,
                    replace: "$self.getMaxZoom(arguments[0].uploadType)"
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
                    replace: "$self.getModalSize(arguments[0].uploadType)"
                }
            ],
        },
    ],

    updateOffset,

    getMaxZoom(uploadType: string) {
        const { extendedZoom, maxZoom } = settings.store;
        return extendedZoom && uploadType === "AVATAR" ? maxZoom : 2;
    },

    getModalSize(uploadType: string) {
        return settings.store.showPreview && uploadType === "AVATAR" ? "lg" : "md";
    },

    renderPreview(src: string, state: EditorState, isPFPModal: boolean) {
        return (
            <ErrorBoundary noop>
                <FullPreview src={src} state={state} isPFPModal={isPFPModal} />
            </ErrorBoundary>
        );
    }
});
