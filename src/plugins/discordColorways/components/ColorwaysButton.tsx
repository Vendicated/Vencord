/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore, FluxDispatcher, FluxEvents, openModal, PluginProps, useEffect, useState } from "..";
import { getAutoPresets } from "../css";
import { ColorwayObject } from "../types";
import { PalleteIcon } from "./Icons";
import ListItem from "./ListItem";
import Selector from "./MainModal";

export default function () {
    const [activeColorway, setActiveColorway] = useState<string>("None");
    const [visibility, setVisibility] = useState<boolean>(true);
    const [autoPreset, setAutoPreset] = useState<string>("hueRotation");
    useEffect(() => {
        (async function () {
            setVisibility(await DataStore.get("showColorwaysButton") as boolean);
            setAutoPreset(await DataStore.get("activeAutoPreset") as string);
        })();

        FluxDispatcher.subscribe("COLORWAYS_UPDATE_BUTTON_VISIBILITY" as FluxEvents, ({ isVisible }) => setVisibility(isVisible));

        return () => {
            FluxDispatcher.unsubscribe("COLORWAYS_UPDATE_BUTTON_VISIBILITY" as FluxEvents, ({ isVisible }) => setVisibility(isVisible));
        };
    });

    return (visibility || PluginProps.clientMod === "BetterDiscord") ? <ListItem
        hasPill
        tooltip={
            <>
                <span>Colorways</span>
                <span style={{ color: "var(--text-muted)", fontWeight: 500, fontSize: 12 }}>{"Active Colorway: " + activeColorway}</span>
                {activeColorway === "Auto" ? <span style={{ color: "var(--text-muted)", fontWeight: 500, fontSize: 12 }}>{"Auto Preset: " + (autoPreset ? getAutoPresets()[autoPreset].name : "None")}</span> : <></>}
            </>
        }>
        {({ onMouseEnter, onMouseLeave, isActive, onClick }) => {
            return <div
                className="ColorwaySelectorBtn"
                onMouseEnter={async e => {
                    onMouseEnter(e);
                    setActiveColorway((await DataStore.get("activeColorwayObject") as ColorwayObject).id || "None");
                    setAutoPreset(await DataStore.get("activeAutoPreset") as string);
                }}
                onMouseLeave={e => {
                    onMouseLeave(e);
                }}
                onClick={e => {
                    onClick(e);
                    isActive(false);
                    openModal((props: any) => <Selector modalProps={props} />);
                }}
            >
                <PalleteIcon />
            </div>;
        }}
    </ListItem> : <></>;
}
