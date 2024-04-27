/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { PalleteIcon } from "@components/Icons";
import { openModal } from "@utils/modal";
import { FluxDispatcher, Text, Tooltip, useCallback, useEffect, useState } from "@webpack/common";
import { FluxEvents } from "@webpack/types";

import Selector from "./Selector";

export default function ({
    listItemClass = "ColorwaySelectorBtnContainer",
    listItemWrapperClass = "",
    listItemTooltipClass = "colorwaysBtn-tooltipContent"
}: {
    listItemClass?: string;
    listItemWrapperClass?: string;
    listItemTooltipClass?: string;
}) {
    const [activeColorway, setActiveColorway] = useState<string>("None");
    const [visibility, setVisibility] = useState<boolean>(true);
    const [isThin, setIsThin] = useState<boolean>(false);
    async function setButtonVisibility() {
        const [showColorwaysButton, useThinMenuButton] = await DataStore.getMany([
            "showColorwaysButton",
            "useThinMenuButton"
        ]);

        setVisibility(showColorwaysButton);
        setIsThin(useThinMenuButton);
    }

    const cached_setButtonVisibility = useCallback(setButtonVisibility, []);

    useEffect(() => {
        cached_setButtonVisibility();
    });

    FluxDispatcher.subscribe("COLORWAYS_UPDATE_BUTTON_HEIGHT" as FluxEvents, ({ isTall }) => {
        setIsThin(isTall);
    });

    FluxDispatcher.subscribe("COLORWAYS_UPDATE_BUTTON_VISIBILITY" as FluxEvents, ({ isVisible }) => {
        setVisibility(isVisible);
    });

    return <Tooltip text={
        !isThin ? <><span>Colorways</span><Text variant="text-xs/normal" style={{ color: "var(--text-muted)", fontWeight: 500 }}>{"Active Colorway: " + activeColorway}</Text></> : <span>{"Active Colorway: " + activeColorway}</span>
    } position="right" tooltipContentClassName="colorwaysBtn-tooltipContent"
    >
        {({ onMouseEnter, onMouseLeave, onClick }) => visibility ? <div className="ColorwaySelectorBtnContainer">
            <div
                className={"ColorwaySelectorBtn" + (isThin ? " ColorwaySelectorBtn_thin" : "")}
                onMouseEnter={async () => {
                    onMouseEnter();
                    setActiveColorway(await DataStore.get("actveColorwayID") || "None");
                }}
                onMouseLeave={onMouseLeave}
                onClick={() => {
                    onClick();
                    openModal((props: any) => <Selector modalProps={props} />);
                }}
            >{isThin ? <Text variant="text-xs/normal" style={{ color: "var(--header-primary)", fontWeight: 700, fontSize: 9 }}>Colorways</Text> : <PalleteIcon />}</div>
        </div> : <></>}
    </Tooltip>;
}
