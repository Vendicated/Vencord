/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// For handling overlays such as Text, Images

import moveIndex from "../utils/arrays";

const overlayReducer = (overlayState: Array<overlayState>, action: overlayAction) => {
    switch (action.type) {
        case "add": {
            return [
                ...overlayState,
                action.state
            ];
        }
        case "remove": {
            return overlayState.filter(state => state.id !== action.id);
        }
        case "update": {
            return overlayState.map(v => {
                if (action.state.id === v.id) {
                    return action.state;
                } else {
                    return v;
                }
            });
        }
        case "clear": {
            return [];
        }
        case "swapIndex": {
            const itemIndex = overlayState.findIndex(state => state.id === action.id);
            return moveIndex(overlayState, itemIndex, action.swapToIndex);
        }
        default: return [...overlayState];
    }
};

export default overlayReducer;

type overlayRemove = { type: "remove", id: number; };
type overlayAdd = { type: "add", state: overlayState; };
type overlayUpdate = { type: "update", state: overlayState; };
type overlayClear = { type: "clear"; };
type overlaySwapIndex = { type: "swapIndex", swapToIndex: number, id: number; };

export type overlayAction = overlayRemove | overlayAdd | overlayUpdate | overlayClear | overlaySwapIndex;

export type overlayState = overlayImage | overlayText;

export type overlayImage = {
    type: "image",
    id: number,
    node?: React.RefObject<HTMLCanvasElement>,
    value: {
        // image?: HTMLImageElement;
        style: imageStyleDef,
        src: string;
    };
};
export type overlayText = {
    type: "text",
    id: number,
    node?: React.RefObject<HTMLCanvasElement>,
    value: {
        style: textStyleDef,
        text: string;
    };
};

type imageStyleDef = { width?: number, height?: number, left?: number, top?: number; };
type textStyleDef = { fontSize: number, textAlign: CanvasTextAlign, color: string, fontFamily: string, left: number, top: number; };
