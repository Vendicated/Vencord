/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { React, TextInput } from "@webpack/common";

import { overlayAction, overlayState, overlayText } from "../../hooks/overlayStore";
import { edit } from "../../MainBoard";

type customConfigProps = {
    editting: edit | undefined,
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
            break;
        }
    }
    return null;
};

export default Settings;
