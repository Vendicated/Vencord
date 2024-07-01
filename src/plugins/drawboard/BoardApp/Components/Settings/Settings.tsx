/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { React, TextInput } from "@webpack/common";

import { overlayAction, overlayImage, overlayState, overlayText } from "../../hooks/overlayReducer";
import { editType } from "../../MainBoard";

type customConfigProps = {
    editting: editType | undefined,
    overlays: overlayState[],
    overlaydispatch: React.Dispatch<overlayAction>;
} & React.HTMLProps<React.ReactElement>;

const Settings = (props: customConfigProps): JSX.Element | null => {
    const { editting, overlays, overlaydispatch, ...prop } = props;
    if (!editting) return null;
    switch (editting.type) {
        case "text": {
            const overlay = overlays.find(v => v.id === editting.id) as overlayText;
            return (
                <TextInput type="number" placeholder="lel" onChange={e => console.log(e)} />
                // <TextInput onChange={e => overlaydispatch({ type: "update", state: { type: "text", id: editting.id, value: { ...overlay?.value, text: e } } })} />
            );
        }
        case "image": {
            const overlay = overlays.find(v => v.id === editting.id) as overlayImage;
            return (
                <TextInput type="text" value={overlay.value.src} onChange={e => overlaydispatch({ type: "update", state: { type: "image", id: editting.id, value: { ...overlay.value, src: e } } })} />
            );
        }
    }
    return null;
};

export default Settings;
