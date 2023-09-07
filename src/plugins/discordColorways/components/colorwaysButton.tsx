/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { openModal } from "@utils/modal";
import { SettingsRouter, Text, Tooltip, useState } from "@webpack/common";

import { LazySwatchLoaded } from "..";
import { Colorway } from "../types";
import SelectorModal from "./selectorModal";
import Spinner from "./spinner";
import { ToolboxModal } from "./toolbox";

export default function ColorwaysButton({
    listItemClass = "ColorwaySelectorBtnContainer",
    listItemWrapperClass = "",
    listItemTooltipClass = "colorwaysBtn-tooltipContent",
}: {
    listItemClass?: string;
    listItemWrapperClass?: string;
    listItemTooltipClass?: string;
}) {
    const [activeColorway, setActiveColorway] = useState<string>("None");
    const [isLoading, setLoading] = useState<boolean>(false);
    return (
        <Tooltip
            text={[
                <span>Colorways</span>,
                <Text
                    variant="text-xs/normal"
                    style={{ color: "var(--text-muted)", fontWeight: 500 }}
                >
                    {"Active Colorway: " + activeColorway}
                </Text>,
            ]}
            position="right"
            tooltipContentClassName={listItemTooltipClass}
        >
            {({ onMouseEnter, onMouseLeave, onClick, onContextMenu }) => {
                return (
                    <div className={listItemClass}>
                        <div
                            onContextMenu={() => {
                                onContextMenu();
                                openModal(props => (
                                    <ToolboxModal modalProps={props} />
                                ));
                            }}
                            className={
                                listItemWrapperClass + " ColorwaySelectorBtn"
                            }
                            onMouseEnter={e => {
                                onMouseEnter();
                                DataStore.get("actveColorwayID").then(
                                    (actveColorwayID: string) =>
                                        setActiveColorway(
                                            actveColorwayID || "None"
                                        )
                                );
                            }}
                            onMouseLeave={onMouseLeave}
                            onClick={() => {
                                onClick();
                                var colorways = new Array<Colorway>();
                                DataStore.get("colorwaySourceFiles").then(
                                    colorwaySourceFiles => {
                                        setLoading(true);
                                        colorwaySourceFiles.forEach(
                                            (colorwayList: string, i: number) => {
                                                fetch(colorwayList)
                                                    .then(response =>
                                                        response.json()
                                                    )
                                                    .then((data: {
                                                        colorways: Colorway[];
                                                    }) => {
                                                        if (!data) return;
                                                        if (
                                                            !data.colorways
                                                                ?.length
                                                        )
                                                            return;
                                                        data.colorways.map(
                                                            (
                                                                color: Colorway
                                                            ) => {
                                                                colorways.push(
                                                                    color
                                                                );
                                                            }
                                                        );
                                                        if (
                                                            i + 1 ===
                                                            colorwaySourceFiles.length
                                                        ) {
                                                            DataStore.get(
                                                                "customColorways"
                                                            ).then(
                                                                customColorways => {
                                                                    DataStore.get(
                                                                        "actveColorwayID"
                                                                    ).then(
                                                                        (
                                                                            actveColorwayID: string
                                                                        ) => {
                                                                            if (
                                                                                LazySwatchLoaded ===
                                                                                false
                                                                            ) {
                                                                                SettingsRouter.open(
                                                                                    "Appearance"
                                                                                );
                                                                            }
                                                                            openModal(
                                                                                props => (
                                                                                    <SelectorModal
                                                                                        modalProps={
                                                                                            props
                                                                                        }
                                                                                        colorwayProps={
                                                                                            colorways
                                                                                        }
                                                                                        customColorwayProps={
                                                                                            customColorways
                                                                                        }
                                                                                        activeColorwayProps={
                                                                                            actveColorwayID
                                                                                        }
                                                                                    />
                                                                                )
                                                                            );
                                                                            setLoading(
                                                                                false
                                                                            );
                                                                        }
                                                                    );
                                                                }
                                                            );
                                                        }
                                                    })
                                                    .catch(err => {
                                                        console.log(err);
                                                        return null;
                                                    });
                                            }
                                        );
                                    }
                                );
                            }}
                        >
                            {isLoading === false ? (
                                <div className="colorwaySelectorIcon"></div>
                            ) : (
                                <Spinner />
                            )}
                        </div>
                    </div>
                );
            }}
        </Tooltip>
    );
}
