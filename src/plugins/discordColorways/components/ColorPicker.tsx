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

import { colorVariables } from "../css";

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

export default function ({ modalProps }: { modalProps: ModalProps; }) {
    const [colorVarItems, setColorVarItems] = useState<ToolboxItem[]>(ColorVarItems);
    const [collapsedSettings, setCollapsedSettings] = useState<boolean>(true);
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

    return (
        <ModalRoot {...modalProps} className="colorwayColorpicker">
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
                    color={Button.Colors.TRANSPARENT}
                    onClick={() => setCollapsedSettings(!collapsedSettings)}
                >
                    <svg width="32" height="24" viewBox="0 0 24 24" aria-hidden="true" role="img">
                        <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M7 10L12 15 17 10" aria-hidden="true" />
                    </svg>
                </Button>
            </Flex>
            <ScrollerThin style={{ color: "var(--text-normal)" }} orientation="vertical" className={collapsedSettings ? " colorwaysColorpicker-collapsed" : ""} paddingFix>
                {colorVarItems.map((toolboxItem: ToolboxItem) => {
                    return (
                        <div
                            id={
                                "colorways-colorstealer-item_" +
                                toolboxItem.id
                            }
                            className="colorwaysCreator-settingItm colorwaysCreator-toolboxItm"
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
            <Flex style={{ justifyContent: "space-between", marginTop: "8px" }} wrap="wrap" className={collapsedSettings ? "" : " colorwaysColorpicker-collapsed"}>
                {ToolboxItems.map((toolboxItem: ToolboxItem, i: number) => <div
                    id={toolboxItem.id || `colorways-toolbox_item-${i}`}
                    className="colorwayToolbox-listItem"
                >
                    <CopyIcon onClick={toolboxItem.onClick} width={20} height={20} className="colorwayToolbox-listItemSVG" />
                    <span className="colorwaysToolbox-label">{toolboxItem.title}</span>
                </div>
                )}
            </Flex>
        </ModalRoot>
    );
}
