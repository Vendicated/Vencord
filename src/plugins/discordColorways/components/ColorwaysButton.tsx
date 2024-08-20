/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { PalleteIcon } from "./Icons";

import { getAutoPresets } from "../css";
import { ColorwayObject } from "../types";
import Selector from "./MainModal";
import { DataStore, useEffect, useState, FluxDispatcher, FluxEvents, openModal, PluginProps } from "..";
import Tooltip from "./Tooltip";

export default function () {
    const [activeColorway, setActiveColorway] = useState<string>("None");
    const [visibility, setVisibility] = useState<boolean>(true);
    const [isThin, setIsThin] = useState<boolean>(false);
    const [autoPreset, setAutoPreset] = useState<string>("hueRotation");
    useEffect(() => {
        (async function () {
            setVisibility(await DataStore.get("showColorwaysButton") as boolean);
            setIsThin(await DataStore.get("useThinMenuButton") as boolean);
            setAutoPreset(await DataStore.get("activeAutoPreset") as string);
        })();
    });

    FluxDispatcher.subscribe("COLORWAYS_UPDATE_BUTTON_HEIGHT" as FluxEvents, ({ isTall }) => {
        setIsThin(isTall);
    });

    FluxDispatcher.subscribe("COLORWAYS_UPDATE_BUTTON_VISIBILITY" as FluxEvents, ({ isVisible }) => {
        setVisibility(isVisible);
    });

    return <Tooltip text={
        <>
            {!isThin ? <>
                <span>Colorways</span>
                <span style={{ color: "var(--text-muted)", fontWeight: 500, fontSize: 12 }}>{"Active Colorway: " + activeColorway}</span>
            </> : <span>{"Active Colorway: " + activeColorway}</span>}
            {activeColorway === "Auto" ? <span style={{ color: "var(--text-muted)", fontWeight: 500, fontSize: 12 }}>{"Auto Preset: " + (getAutoPresets()[autoPreset].name || "None")}</span> : <></>}
        </>
    } position="right"
    >
        {({ onMouseEnter, onMouseLeave, onClick }) => (visibility || PluginProps.clientMod === "BetterDiscord") ? <div className="ColorwaySelectorBtnContainer">
            <div
                className={"ColorwaySelectorBtn" + (isThin ? " ColorwaySelectorBtn_thin" : "")}
                onMouseEnter={async () => {
                    onMouseEnter();
                    setActiveColorway((await DataStore.get("activeColorwayObject") as ColorwayObject).id || "None");
                    setAutoPreset(await DataStore.get("activeAutoPreset") as string);
                }}
                onMouseLeave={onMouseLeave}
                onClick={() => {
                    onClick();
                    openModal((props: any) => <Selector modalProps={props} />);
                }}
            >{isThin ? <span style={{ color: "var(--header-primary)", fontWeight: 700, fontSize: 9 }}>Colorways</span> : <PalleteIcon />}</div>
        </div> : <></>}
    </Tooltip>;
}
