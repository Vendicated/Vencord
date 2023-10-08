/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { openModal } from "@utils/modal";
import { Text, Tooltip, useState } from "@webpack/common";

import { Colorway } from "../types";
import SelectorModal from "./selectorModal";
import Spinner from "./spinner";

function ColorwaysTooltip({ activeColorwayID = "None", colorwayLen = 0 }: { activeColorwayID?: string, colorwayLen?: number; }) {
    return (<>
        <span>Colorways</span>
        <Text variant="text-xs/normal" style={{ color: "var(--text-muted)", fontWeight: 500 }}>{"Active Colorway: " + activeColorwayID}</Text>
    </>);
}

export default function ColorwaysButton({ listItemClass = "ColorwaySelectorBtnContainer", listItemWrapperClass = "", listItemTooltipClass = "colorwaysBtn-tooltipContent", }: { listItemClass?: string; listItemWrapperClass?: string; listItemTooltipClass?: string; }) {
    const [activeColorway, setActiveColorway] = useState<string>("None");
    const [colorwayLen, setColorwayLen] = useState<number>(0);
    const [isLoading, setLoading] = useState<boolean>(false);
    return (<Tooltip text={<ColorwaysTooltip activeColorwayID={activeColorway} colorwayLen={colorwayLen} />} position="right" tooltipContentClassName={listItemTooltipClass}>
        {({ onMouseEnter, onMouseLeave, onClick, onContextMenu }) => {
            return (
                <div className={listItemClass}>
                    <div
                        onContextMenu={() => {
                            onContextMenu();
                            var colorways: Colorway[] = [];
                            DataStore.get("colorwaySourceFiles").then(
                                colorwaySourceFiles => {
                                    setLoading(true);
                                    colorwaySourceFiles.forEach(
                                        (colorwayList: string, i: number) => {
                                            fetch(colorwayList)
                                                .then(response => response.json())
                                                .then((data: { colorways: Colorway[]; }) => {
                                                    if (!data) {
                                                        DataStore.get("customColorways").then(customColorways => DataStore.get("actveColorwayID").then((actveColorwayID: string) => {
                                                            openModal(props => <SelectorModal modalProps={props} colorwayProps={[]} customColorwayProps={customColorways} activeColorwayProps={actveColorwayID} visibleTabProps="toolbox" />);
                                                            setLoading(false);
                                                            onClick();
                                                        }));
                                                    }
                                                    if (!data.colorways?.length) {
                                                        DataStore.get("customColorways").then(customColorways => DataStore.get("actveColorwayID").then((actveColorwayID: string) => {
                                                            openModal(props => <SelectorModal modalProps={props} colorwayProps={[]} customColorwayProps={customColorways} activeColorwayProps={actveColorwayID} visibleTabProps="toolbox" />);
                                                            setLoading(false);
                                                            onClick();
                                                        }));
                                                    }
                                                    data.colorways.map((color: Colorway) => colorways.push(color));
                                                    if (++i === colorwaySourceFiles.length) {
                                                        DataStore.get("customColorways").then(customColorways => DataStore.get("actveColorwayID").then((actveColorwayID: string) => {
                                                            openModal(props => <SelectorModal modalProps={props} colorwayProps={colorways} customColorwayProps={customColorways} activeColorwayProps={actveColorwayID} visibleTabProps="toolbox" />);
                                                            setLoading(false);
                                                            onClick();
                                                        }));
                                                    }
                                                })
                                                .catch(err => {
                                                    console.log(err);
                                                    DataStore.get("customColorways").then(customColorways => DataStore.get("actveColorwayID").then((actveColorwayID: string) => {
                                                        openModal(props => <SelectorModal modalProps={props} colorwayProps={[]} customColorwayProps={customColorways} activeColorwayProps={actveColorwayID} visibleTabProps="toolbox" />);
                                                        setLoading(false);
                                                        onClick();
                                                    }));
                                                });
                                        }
                                    );
                                }
                            );
                        }}
                        className={listItemWrapperClass + " ColorwaySelectorBtn"}
                        onMouseEnter={() => {
                            onMouseEnter();
                            DataStore.get("actveColorwayID").then(
                                (actveColorwayID: string) => {
                                    DataStore.get("customColorways").then(customColorways => {
                                        setActiveColorway(actveColorwayID || "None");
                                        setColorwayLen(customColorways.length);
                                    });
                                }
                            );
                        }}
                        onMouseLeave={onMouseLeave}
                        onClick={() => {
                            onClick();
                            var colorways: Colorway[] = [];
                            DataStore.get("colorwaySourceFiles").then(
                                colorwaySourceFiles => {
                                    setLoading(true);
                                    colorwaySourceFiles.forEach(
                                        (colorwayList: string, i: number) => {
                                            fetch(colorwayList)
                                                .then(response => response.json())
                                                .then((data: { colorways: Colorway[]; }) => {
                                                    if (!data) return;
                                                    if (!data.colorways?.length) return;
                                                    data.colorways.map((color: Colorway) => colorways.push(color));
                                                    if (++i === colorwaySourceFiles.length) {
                                                        DataStore.get("customColorways").then(customColorways => DataStore.get("actveColorwayID").then((actveColorwayID: string) => {
                                                            openModal(props => <SelectorModal modalProps={props} colorwayProps={colorways} customColorwayProps={customColorways} activeColorwayProps={actveColorwayID} />);
                                                            setLoading(false);
                                                            onClick();
                                                        }));
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
                        {!isLoading ? (<div className="colorwaySelectorIcon"></div>) : (<Spinner />)}
                    </div>
                </div>
            );
        }}
    </Tooltip>
    );
}
