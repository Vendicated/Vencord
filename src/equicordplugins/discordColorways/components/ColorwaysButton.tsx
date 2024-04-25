/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { openModal } from "@utils/modal";
import { FluxDispatcher, Text, Tooltip, useEffect, useState } from "@webpack/common";
import { FluxEvents } from "@webpack/types";

import { PalleteIcon } from "./Icons";
import SelectorModal from "./SelectorModal";

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

    useEffect(() => {
        setButtonVisibility();
    });

    FluxDispatcher.subscribe("COLORWAYS_UPDATE_BUTTON_HEIGHT" as FluxEvents, ({ isTall }) => {
        setIsThin(isTall);
    });

    FluxDispatcher.subscribe("COLORWAYS_UPDATE_BUTTON_VISIBILITY" as FluxEvents, ({ isVisible }) => {
        setVisibility(isVisible);
    });

    if (!isThin) {
        return (<Tooltip text={[
            <span>Colorways</span>,
            <Text variant="text-xs/normal" style={{ color: "var(--text-muted)", fontWeight: 500 }}>{"Active Colorway: " + activeColorway}</Text>
        ]} position="right" tooltipContentClassName={listItemTooltipClass}
        >
            {({ onMouseEnter, onMouseLeave, onClick }) => visibility ? <div className={listItemClass}>
                <div
                    className={listItemWrapperClass + " ColorwaySelectorBtn"}
                    onMouseEnter={async () => {
                        onMouseEnter();
                        setActiveColorway(await DataStore.get("actveColorwayID") || "None");
                    }}
                    onMouseLeave={onMouseLeave}
                    onClick={() => {
                        onClick();
                        openModal(props => <SelectorModal modalProps={props} />);
                    }}
                ><PalleteIcon /></div>
            </div> : <></>}
        </Tooltip>
        );
    } else {
        return (<Tooltip text={[
            <span>Colorways</span>,
            <Text variant="text-xs/normal" style={{ color: "var(--text-muted)", fontWeight: 500 }}>{"Active Colorway: " + activeColorway}</Text>
        ]} position="right" tooltipContentClassName={listItemTooltipClass}
        >
            {({ onMouseEnter, onMouseLeave, onClick }) => visibility ? <div className={listItemClass}>
                <div
                    className={listItemWrapperClass + " ColorwaySelectorBtn ColorwaySelectorBtn_thin"}
                    onMouseEnter={async () => {
                        onMouseEnter();
                        setActiveColorway(await DataStore.get("actveColorwayID") || "None");
                    }}
                    onMouseLeave={onMouseLeave}
                    onClick={() => {
                        onClick();
                        openModal(props => <SelectorModal modalProps={props} />);
                    }}
                ><Text variant="text-xs/normal" style={{ color: "var(--header-primary)", fontWeight: 700, fontSize: 9 }}>Colorways</Text></div>
            </div> : <></>}
        </Tooltip>
        );
    }
}
