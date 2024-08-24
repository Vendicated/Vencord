/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CopyIcon } from "./Icons";

import { mainColors } from "../constants";
import { colorVariables } from "../css";
import { getHex } from "../utils";
import { useState, useEffect, DataStore, Toasts } from "..";
import { ModalProps } from "../types";

export default function ({ modalProps }: { modalProps: ModalProps; }) {
    const [ColorVars, setColorVars] = useState<string[]>(colorVariables);
    const [collapsedSettings, setCollapsedSettings] = useState<boolean>(true);
    const [theme, setTheme] = useState("discord");

    useEffect(() => {
        async function load() {
            setTheme(await DataStore.get("colorwaysPluginTheme") as string);
        }
        load();
    }, []);

    let results: string[];
    function searchToolboxItems(e: string) {
        results = [];
        colorVariables.find((colorVariable: string) => {
            if (colorVariable.toLowerCase().includes(e.toLowerCase())) {
                results.push(colorVariable);
            }
        });
        setColorVars(results);
    }

    return <div className={`colorwaysModal ${modalProps.transitionState == 2 ? "closing" : ""} ${modalProps.transitionState == 4 ? "hidden" : ""}`} data-theme={theme}>
        <div style={{ gap: "8px", marginBottom: "8px", display: "flex" }}>
            <input
                type="text"
                className="colorwayTextBox"
                placeholder="Search for a color:"
                onChange={({ currentTarget: { value } }) => {
                    searchToolboxItems(value);
                    if (value) {
                        setCollapsedSettings(false);
                    } else {
                        setCollapsedSettings(true);
                    }
                }}
            />
            <button
                className="colorwaysPillButton"
                onClick={() => setCollapsedSettings(!collapsedSettings)}
            >
                <svg width="32" height="24" viewBox="0 0 24 24" aria-hidden="true" role="img">
                    <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M7 10L12 15 17 10" aria-hidden="true" />
                </svg>
            </button>
        </div>
        <div style={{ color: "var(--text-normal)", overflow: "hidden auto", scrollbarWidth: "none" }} className={collapsedSettings ? " colorwaysColorpicker-collapsed" : ""}>
            {ColorVars.map((colorVariable: string) => <div
                id={`colorways-colorstealer-item_${colorVariable}`}
                className="colorwaysCreator-settingItm colorwaysCreator-toolboxItm"
                onClick={() => {
                    navigator.clipboard.writeText(getHex(getComputedStyle(document.body).getPropertyValue("--" + colorVariable)));
                    Toasts.show({ message: "Color " + colorVariable + " copied to clipboard", id: "toolbox-color-var-copied", type: 1 });
                }} style={{ "--brand-experiment": `var(--${colorVariable})` } as React.CSSProperties}>
                {`Copy ${colorVariable}`}
            </div>)}
        </div>
        <div style={{ justifyContent: "space-between", marginTop: "8px", flexWrap: "wrap", gap: "1em" }} className={collapsedSettings ? "" : " colorwaysColorpicker-collapsed"}>
            {mainColors.map(mainColor => <div
                id={`colorways-toolbox_copy-${mainColor.name}`}
                className="colorwayToolbox-listItem"
            >
                <CopyIcon onClick={() => {
                    navigator.clipboard.writeText(getHex(getComputedStyle(document.body).getPropertyValue(mainColor.var)));
                    Toasts.show({ message: `${mainColor.title} color copied to clipboard`, id: `toolbox-${mainColor.name}-color-copied`, type: 1 });
                }} width={20} height={20} className="colorwayToolbox-listItemSVG" />
                <span className="colorwaysToolbox-label">{`Copy ${mainColor.title} Color`}</span>
            </div>
            )}
        </div>
    </div>;
}
