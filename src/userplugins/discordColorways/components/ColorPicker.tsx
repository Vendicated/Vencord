/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Flex } from "@components/Flex";
import { CopyIcon } from "@components/Icons";
import {
    ModalProps,
    ModalRoot,
} from "@utils/modal";
import {
    Button,
    Clipboard,
    ScrollerThin,
    TextInput,
    Toasts,
    useState,
} from "@webpack/common";

import { mainColors } from "../constants";
import { colorVariables } from "../css";
import { getHex } from "../utils";

export default function ({ modalProps }: { modalProps: ModalProps; }) {
    const [ColorVars, setColorVars] = useState<string[]>(colorVariables);
    const [collapsedSettings, setCollapsedSettings] = useState<boolean>(true);
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

    return <ModalRoot {...modalProps} className="colorwayColorpicker">
        <Flex style={{ gap: "8px", marginBottom: "8px" }}>
            <TextInput
                className="colorwaysColorpicker-search"
                placeholder="Search for a color:"
                onChange={e => {
                    searchToolboxItems(e);
                    if (e) {
                        setCollapsedSettings(false);
                    } else {
                        setCollapsedSettings(true);
                    }
                }}
            />
            <Button
                innerClassName="colorwaysSettings-iconButtonInner"
                size={Button.Sizes.ICON}
                color={Button.Colors.PRIMARY}
                look={Button.Looks.OUTLINED}
                onClick={() => setCollapsedSettings(!collapsedSettings)}
            >
                <svg width="32" height="24" viewBox="0 0 24 24" aria-hidden="true" role="img">
                    <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M7 10L12 15 17 10" aria-hidden="true" />
                </svg>
            </Button>
        </Flex>
        <ScrollerThin style={{ color: "var(--text-normal)" }} orientation="vertical" className={collapsedSettings ? " colorwaysColorpicker-collapsed" : ""} paddingFix>
            {ColorVars.map((colorVariable: string) => <div
                id={`colorways-colorstealer-item_${colorVariable}`}
                className="colorwaysCreator-settingItm colorwaysCreator-toolboxItm"
                onClick={() => {
                    Clipboard.copy(getHex(getComputedStyle(document.body).getPropertyValue("--" + colorVariable)));
                    Toasts.show({ message: "Color " + colorVariable + " copied to clipboard", id: "toolbox-color-var-copied", type: 1 });
                }} style={{ "--brand-experiment": `var(--${colorVariable})` } as React.CSSProperties}>
                {`Copy ${colorVariable}`}
            </div>)}
        </ScrollerThin>
        <Flex style={{ justifyContent: "space-between", marginTop: "8px" }} wrap="wrap" className={collapsedSettings ? "" : " colorwaysColorpicker-collapsed"}>
            {mainColors.map(mainColor => <div
                id={`colorways-toolbox_copy-${mainColor.name}`}
                className="colorwayToolbox-listItem"
            >
                <CopyIcon onClick={() => {
                    Clipboard.copy(getHex(getComputedStyle(document.body).getPropertyValue(mainColor.var)));
                    Toasts.show({ message: `${mainColor.title} color copied to clipboard`, id: `toolbox-${mainColor.name}-color-copied`, type: 1 });
                }} width={20} height={20} className="colorwayToolbox-listItemSVG" />
                <span className="colorwaysToolbox-label">{`Copy ${mainColor.title} Color`}</span>
            </div>
            )}
        </Flex>
    </ModalRoot>;
}
