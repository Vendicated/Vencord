/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
    ModalProps,
    ModalRoot,
} from "@utils/modal";
import { findByCode } from "@webpack";
import {
    Clipboard,
    ScrollerThin,
    TextInput,
    Toasts,
    useEffect,
    useState,
} from "@webpack/common";

import { LazySwatchLoaded } from "..";
import { colorVariables } from "../css";
import extractAndRequireModuleIds from "../util/requireModule";

interface ToolboxItem {
    title: string;
    onClick: () => void;
    id?: string;
    iconClassName?: string;
}

const ColorVarItems: ToolboxItem[] = colorVariables.map((colorVariable: string) => {
    return {
        title: "Copy " + colorVariable,
        onClick: () => {
            function getHex(str: string): string { return Object.assign(document.createElement("canvas").getContext("2d") as {}, { fillStyle: str }).fillStyle; }
            Clipboard.copy(getHex(getComputedStyle(document.body).getPropertyValue("--" + colorVariable)));
            Toasts.show({ message: "Color " + colorVariable + " copied to clipboard", id: "toolbox-color-var-copied", type: 1 });
        },
        id: colorVariable
    };
});

const ToolboxItems: ToolboxItem[] = [
    {
        title: "Copy Accent Color",
        onClick: () => {
            function getHex(str: string): string {
                return Object.assign(
                    document.createElement("canvas").getContext("2d") as {},
                    { fillStyle: str }
                ).fillStyle;
            }
            Clipboard.copy(
                getHex(
                    getComputedStyle(document.body).getPropertyValue(
                        "--brand-experiment"
                    )
                )
            );
            Toasts.show({
                message: "Accent color copied to clipboard",
                id: "toolbox-accent-color-copied",
                type: 1,
            });
        },
        id: "colorways-toolbox_copy-accent",
        iconClassName: "copy",
    },
    {
        title: "Copy Primary Color",
        onClick: () => {
            function getHex(str: string): string {
                return Object.assign(
                    document.createElement("canvas").getContext("2d") as {},
                    { fillStyle: str }
                ).fillStyle;
            }
            Clipboard.copy(
                getHex(
                    getComputedStyle(document.body).getPropertyValue(
                        "--background-primary"
                    )
                )
            );
            Toasts.show({
                message: "Primary color copied to clipboard",
                id: "toolbox-primary-color-copied",
                type: 1,
            });
        },
        id: "colorways-toolbox_copy-primary",
        iconClassName: "copy",
    },
    {
        title: "Copy Secondary Color",
        onClick: () => {
            function getHex(str: string): string {
                return Object.assign(
                    document.createElement("canvas").getContext("2d") as {},
                    { fillStyle: str }
                ).fillStyle;
            }
            Clipboard.copy(
                getHex(
                    getComputedStyle(document.body).getPropertyValue(
                        "--background-secondary"
                    )
                )
            );
            Toasts.show({
                message: "Secondary color copied to clipboard",
                id: "toolbox-secondary-color-copied",
                type: 1,
            });
        },
        id: "colorways-toolbox_copy-secondary",
        iconClassName: "copy",
    },
    {
        title: "Copy Tertiary Color",
        onClick: () => {
            function getHex(str: string): string {
                return Object.assign(
                    document.createElement("canvas").getContext("2d") as {},
                    { fillStyle: str }
                ).fillStyle;
            }
            Clipboard.copy(
                getHex(
                    getComputedStyle(document.body).getPropertyValue(
                        "--background-tertiary"
                    )
                )
            );
            Toasts.show({
                message: "Tertiary color copied to clipboard",
                id: "toolbox-tertiary-color-copied",
                type: 1,
            });
        },
        id: "colorways-toolbox_copy-tertiary",
        iconClassName: "copy",
    }
];

export function ColorPickerModal({ modalProps }: { modalProps: ModalProps; }) {
    const [colorVarItems, setColorVarItems] = useState<ToolboxItem[]>(ColorVarItems);
    let results: ToolboxItem[];
    function searchToolboxItems(e: string) {
        results = [];
        ColorVarItems.find((ToolboxItem: ToolboxItem) => {
            if (ToolboxItem.title.toLowerCase().includes(e.toLowerCase())) {
                results.push(ToolboxItem);
            }
        });
        setColorVarItems(results);
    }

    useEffect(() => {
        if (!LazySwatchLoaded) {
            extractAndRequireModuleIds(
                findByCode(
                    "Promise.all",
                    "openModalLazy",
                    "location_page"
                )
            );
        }
    });

    return (
        <ModalRoot {...modalProps} className="colorwayCreator-modal">
            <div className="colorwayToolbox-list">
                <TextInput
                    placeholder="Search for a color:"
                    onChange={searchToolboxItems}
                    className="colorwayToolbox-search"
                ></TextInput>
                <div className="ColorwaySelectorWrapper colorwayToolbox-itemList" style={{ justifyContent: "space-evenly" }}>
                    {ToolboxItems.map(
                        (
                            toolboxItem: ToolboxItem,
                            i: number
                        ) => {
                            return (
                                <div
                                    id={
                                        toolboxItem.id ||
                                        "colorways-toolbox_item-" +
                                        i
                                    }
                                    className="colorwayToolbox-listItem"
                                >
                                    <i
                                        onClick={
                                            toolboxItem.onClick
                                        }
                                        className={
                                            "bi bi-" +
                                            (toolboxItem.iconClassName ||
                                                "question-circle")
                                        }
                                    ></i>
                                    <span className="colorwaysToolbox-label">
                                        {toolboxItem.title}
                                    </span>
                                </div>
                            );
                        }
                    )}
                </div>
                <ScrollerThin className="colorwayToolbox-itemList">
                    {colorVarItems.map((toolboxItem: ToolboxItem) => {
                        return (
                            <div
                                id={
                                    "colorways-colorstealer-item_" +
                                    toolboxItem.id
                                }
                                className="colorwayToolbox-listItem"
                                onClick={toolboxItem.onClick}
                                style={
                                    {
                                        "--brand-experiment":
                                            "var(--" + toolboxItem.id + ")",
                                    } as React.CSSProperties
                                }
                            >
                                {toolboxItem.title}
                            </div>
                        );
                    })}
                </ScrollerThin>
            </div>
        </ModalRoot>
    );
}
