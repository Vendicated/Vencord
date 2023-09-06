/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { ModalProps, ModalRoot, openModal } from "@utils/modal";
import { Clipboard, SettingsRouter, TextInput, Toasts, useState } from "@webpack/common";

import { LazySwatchLoaded } from "..";
import { colorVariables } from "../css";
import { Colorway } from "../types";
import { ColorPickerModal, ColorStealerModal } from "./colorPicker";
import CreatorModal from "./creatorModal";
import SelectorModal from "./selectorModal";

export interface ToolboxItem {
    title: string,
    onClick: () => void,
    id?: string;
}

export const ColorVarItems: ToolboxItem[] = colorVariables.map((colorVariable: string) => {
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
        title: "Colorway Selector",
        onClick: () => {
            var colorways = new Array<Colorway>;
            DataStore.get("colorwaySourceFiles").then(colorwaySourceFiles => {
                colorwaySourceFiles.forEach((colorwayList, i) => {
                    fetch(colorwayList)
                        .then(response => response.json())
                        .then(data => {
                            if (!data) return;
                            if (!data.colorways?.length) return;
                            data.colorways.map((color: Colorway) => {
                                colorways.push(color);
                            });
                            if (i + 1 === colorwaySourceFiles.length) {
                                DataStore.get("customColorways").then(customColorways => {
                                    DataStore.get("actveColorwayID").then((actveColorwayID: string) => {
                                        if (LazySwatchLoaded === false) {
                                            SettingsRouter.open("Appearance");
                                        }
                                        openModal(props => <SelectorModal modalProps={props} colorwayProps={colorways} customColorwayProps={customColorways} activeColorwayProps={actveColorwayID} />);
                                    });
                                });
                            }
                        })
                        .catch(err => {
                            console.log(err);
                            return null;
                        });
                });
            });
        },
        id: "colorways-toolbox_colorways-selector"
    },
    {
        title: "Colorway Creator",
        onClick: () => {
            if (LazySwatchLoaded === false) {
                SettingsRouter.open("Appearance");
            }
            openModal(props => <CreatorModal modalProps={props} />);
        },
        id: "colorways-toolbox_colorways-creator"
    },
    {
        title: "Color Picker",
        onClick: () => {
            if (LazySwatchLoaded === false) {
                SettingsRouter.open("Appearance");
            }
            openModal(props => <ColorPickerModal modalProps={props} />);
        },
        id: "colorways-toolbox_colorpicker"
    },
    {
        title: "Copy Accent Color",
        onClick: () => {
            function getHex(str: string): string { return Object.assign(document.createElement("canvas").getContext("2d") as {}, { fillStyle: str }).fillStyle; }
            Clipboard.copy(getHex(getComputedStyle(document.body).getPropertyValue("--brand-experiment")));
            Toasts.show({ message: "Accent color copied to clipboard", id: "toolbox-accent-color-copied", type: 1 });
        },
        id: "colorways-toolbox_copy-accent"
    },
    {
        title: "Copy Primary Color",
        onClick: () => {
            function getHex(str: string): string { return Object.assign(document.createElement("canvas").getContext("2d") as {}, { fillStyle: str }).fillStyle; }
            Clipboard.copy(getHex(getComputedStyle(document.body).getPropertyValue("--background-primary")));
            Toasts.show({ message: "Primary color copied to clipboard", id: "toolbox-primary-color-copied", type: 1 });
        },
        id: "colorways-toolbox_copy-primary"
    },
    {
        title: "Copy Secondary Color",
        onClick: () => {
            function getHex(str: string): string { return Object.assign(document.createElement("canvas").getContext("2d") as {}, { fillStyle: str }).fillStyle; }
            Clipboard.copy(getHex(getComputedStyle(document.body).getPropertyValue("--background-secondary")));
            Toasts.show({ message: "Secondary color copied to clipboard", id: "toolbox-secondary-color-copied", type: 1 });
        },
        id: "colorways-toolbox_copy-secondary"
    },
    {
        title: "Copy Tertiary Color",
        onClick: () => {
            function getHex(str: string): string { return Object.assign(document.createElement("canvas").getContext("2d") as {}, { fillStyle: str }).fillStyle; }
            Clipboard.copy(getHex(getComputedStyle(document.body).getPropertyValue("--background-tertiary")));
            Toasts.show({ message: "Tertiary color copied to clipboard", id: "toolbox-tertiary-color-copied", type: 1 });
        },
        id: "colorways-toolbox_copy-tertiary"
    },
    {
        title: "Copy Other Colors",
        onClick: () => openModal(props => <ColorStealerModal modalProps={props} />),
        id: "colorways-toolbox_copy-other"
    }
];

export function ToolboxModal({ modalProps }: { modalProps: ModalProps; }) {
    const [toolboxItems, setToolboxItems] = useState<ToolboxItem[]>(ToolboxItems);
    let results: ToolboxItem[];
    function searchToolboxItems(e: string) {
        results = [];
        ToolboxItems.find((ToolboxItem: ToolboxItem) => {
            if (ToolboxItem.title.toLowerCase().includes(e.toLowerCase())) {
                results.push(ToolboxItem);
            }
        });
        setToolboxItems(results);
    }
    return (<ModalRoot {...modalProps}>
        <div className="colorwayToolbox-list">
            <TextInput placeholder="Search for an action:" onChange={searchToolboxItems} className="colorwayToolbox-search"></TextInput>
            <div className="colorwayToolbox-itemList">
                {toolboxItems.map((toolboxItem: ToolboxItem, i: number) => {
                    return <div id={toolboxItem.id || "colorways-toolbox_item-" + i} className="colorwayToolbox-listItem" onClick={toolboxItem.onClick}>{toolboxItem.title}</div>;
                })}
            </div>
        </div>
    </ModalRoot>);
}
