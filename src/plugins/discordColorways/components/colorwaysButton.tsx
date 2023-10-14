/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { PalleteIcon } from "@components/Icons";
import { openModal } from "@utils/modal";
import { Text, Tooltip, useState } from "@webpack/common";

import SelectorModal from "./selectorModal";

export default function ColorwaysButton({ listItemClass = "ColorwaySelectorBtnContainer", listItemWrapperClass = "", listItemTooltipClass = "colorwaysBtn-tooltipContent", }: { listItemClass?: string; listItemWrapperClass?: string; listItemTooltipClass?: string; }) {
    const [activeColorway, setActiveColorway] = useState<string>("None");
    return (<Tooltip text={<><span>Colorways</span>
        <Text variant="text-xs/normal" style={{ color: "var(--text-muted)", fontWeight: 500 }}>{"Active Colorway: " + activeColorway}</Text></>} position="right" tooltipContentClassName={listItemTooltipClass}>
        {({ onMouseEnter, onMouseLeave, onClick, onContextMenu }) => {
            return (
                <div className={listItemClass}>
                    <div
                        onContextMenu={() => {
                            onContextMenu();
                            openModal(props => <SelectorModal modalProps={props} visibleTabProps="toolbox" />);
                        }}
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
                </div>
            );
        }}
    </Tooltip>
    );
}
