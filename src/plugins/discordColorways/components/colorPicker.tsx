/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalProps,
    ModalRoot,
    openModal,
} from "@utils/modal";
import {
    Button,
    Clipboard,
    Forms,
    Text,
    TextInput,
    Toasts,
    useState,
} from "@webpack/common";

import { ColorPicker } from "..";
import { colorVariables } from "../css";
import { ToolboxItem } from "../types";

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

export function ColorPickerModal({ modalProps }: { modalProps: ModalProps; }) {
    const [accentColor, setAccentColor] = useState<string>("5865f2");
    const [primaryColor, setPrimaryColor] = useState<string>("313338");
    const [secondaryColor, setSecondaryColor] = useState<string>("2b2d31");
    const [tertiaryColor, setTertiaryColor] = useState<string>("1e1f22");
    return (
        <ModalRoot {...modalProps} className="colorwayCreator-modal">
            <ModalHeader>
                <Text variant="heading-lg/semibold" tag="h1">
                    Colorpicker
                </Text>
            </ModalHeader>
            <ModalContent className="colorwayCreator-menuWrapper">
                <Forms.FormTitle style={{ marginBottom: 0 }}>
                    Colors:
                </Forms.FormTitle>
                <div className="colorwayCreator-colorPreviews">
                    <ColorPicker
                        label={<Text className="colorwaysPicker-colorLabel">Primary</Text>}
                        color={parseInt(primaryColor, 16)}
                        onChange={(color: number) => {
                            let hexColor = color.toString(16);
                            while (hexColor.length < 6) {
                                hexColor = "0" + hexColor;
                            }
                            setPrimaryColor(hexColor);
                        }}
                        showEyeDropper={true}
                        suggestedColors={[
                            "#313338",
                            "#2b2d31",
                            "#1e1f22",
                            "#5865f2",
                        ]}
                    />
                    <ColorPicker
                        label={<Text className="colorwaysPicker-colorLabel">Secondary</Text>}
                        color={parseInt(secondaryColor, 16)}
                        onChange={(color: number) => {
                            let hexColor = color.toString(16);
                            while (hexColor.length < 6) {
                                hexColor = "0" + hexColor;
                            }
                            setSecondaryColor(hexColor);
                        }}
                        showEyeDropper={true}
                        suggestedColors={[
                            "#313338",
                            "#2b2d31",
                            "#1e1f22",
                            "#5865f2",
                        ]}
                    />
                    <ColorPicker
                        label={<Text className="colorwaysPicker-colorLabel">Tertiary</Text>}
                        color={parseInt(tertiaryColor, 16)}
                        onChange={(color: number) => {
                            let hexColor = color.toString(16);
                            while (hexColor.length < 6) {
                                hexColor = "0" + hexColor;
                            }
                            setTertiaryColor(hexColor);
                        }}
                        showEyeDropper={true}
                        suggestedColors={[
                            "#313338",
                            "#2b2d31",
                            "#1e1f22",
                            "#5865f2",
                        ]}
                    />
                    <ColorPicker
                        label={<Text className="colorwaysPicker-colorLabel">Accent</Text>}
                        color={parseInt(accentColor, 16)}
                        onChange={(color: number) => {
                            let hexColor = color.toString(16);
                            while (hexColor.length < 6) {
                                hexColor = "0" + hexColor;
                            }
                            setAccentColor(hexColor);
                        }}
                        showEyeDropper={true}
                        suggestedColors={[
                            "#313338",
                            "#2b2d31",
                            "#1e1f22",
                            "#5865f2",
                        ]}
                    />
                </div>
            </ModalContent>
            <ModalFooter>
                <Button
                    style={{ marginLeft: 8 }}
                    color={Button.Colors.PRIMARY}
                    size={Button.Sizes.MEDIUM}
                    look={Button.Looks.FILLED}
                    onClick={() => {
                        function getHex(str: string): string {
                            return Object.assign(
                                document
                                    .createElement("canvas")
                                    .getContext("2d") as {},
                                { fillStyle: str }
                            ).fillStyle;
                        }
                        setPrimaryColor(
                            getHex(
                                getComputedStyle(
                                    document.body
                                ).getPropertyValue("--background-primary")
                            ).split("#")[1]
                        );
                        setSecondaryColor(
                            getHex(
                                getComputedStyle(
                                    document.body
                                ).getPropertyValue("--background-secondary")
                            ).split("#")[1]
                        );
                        setTertiaryColor(
                            getHex(
                                getComputedStyle(
                                    document.body
                                ).getPropertyValue("--background-tertiary")
                            ).split("#")[1]
                        );
                        setAccentColor(
                            getHex(
                                getComputedStyle(
                                    document.body
                                ).getPropertyValue("--brand-experiment")
                            ).split("#")[1]
                        );
                    }}
                >
                    Copy Current Colors
                </Button>
                <Button
                    style={{ marginLeft: 8 }}
                    color={Button.Colors.PRIMARY}
                    size={Button.Sizes.MEDIUM}
                    look={Button.Looks.FILLED}
                    onClick={() => {
                        let colorwayID: string;
                        function setColorwayID(e: string) {
                            colorwayID = e;
                        }
                        const hexToString = (hex: string) => {
                            let str = "";
                            for (let i = 0; i < hex.length; i += 2) {
                                const hexValue = hex.substr(i, 2);
                                const decimalValue = parseInt(hexValue, 16);
                                str += String.fromCharCode(decimalValue);
                            }
                            return str;
                        };
                        openModal(props => {
                            return (
                                <ModalRoot
                                    {...props}
                                    className="colorwaysCreator-noMinHeight"
                                >
                                    <ModalContent className="colorwaysCreator-noHeader colorwaysCreator-noMinHeight">
                                        <Forms.FormTitle>
                                            Colorway ID:
                                        </Forms.FormTitle>
                                        <TextInput
                                            placeholder="Enter Colorway ID"
                                            onInput={e => {
                                                setColorwayID(
                                                    e.currentTarget.value
                                                );
                                            }}
                                        ></TextInput>
                                    </ModalContent>
                                    <ModalFooter>
                                        <Button
                                            style={{ marginLeft: 8 }}
                                            color={Button.Colors.BRAND}
                                            size={Button.Sizes.MEDIUM}
                                            look={Button.Looks.FILLED}
                                            onClick={() => {
                                                const allEqual = (arr: any[]) =>
                                                    arr.every(
                                                        v => v === arr[0]
                                                    );
                                                if (!colorwayID) {
                                                    throw new Error(
                                                        "Please enter a Colorway ID"
                                                    );
                                                } else if (
                                                    colorwayID.length < 62
                                                ) {
                                                    throw new Error(
                                                        "Invalid Colorway ID"
                                                    );
                                                } else if (
                                                    !hexToString(
                                                        colorwayID
                                                    ).includes(",")
                                                ) {
                                                    throw new Error(
                                                        "Invalid Colorway ID"
                                                    );
                                                } else if (
                                                    !allEqual(
                                                        hexToString(colorwayID)
                                                            .split(",")
                                                            .map(
                                                                (e: string) =>
                                                                    e.match(
                                                                        "#"
                                                                    )!.length
                                                            )
                                                    ) &&
                                                    hexToString(colorwayID)
                                                        .split(",")
                                                        .map(
                                                            (e: string) =>
                                                                e.match("#")!
                                                                    .length
                                                        )[0] !== 1
                                                ) {
                                                    throw new Error(
                                                        "Invalid Colorway ID"
                                                    );
                                                } else {
                                                    const colorArray: string[] =
                                                        hexToString(
                                                            colorwayID
                                                        ).split(",");
                                                    setAccentColor(
                                                        colorArray[0].split(
                                                            "#"
                                                        )[1]
                                                    );
                                                    setPrimaryColor(
                                                        colorArray[1].split(
                                                            "#"
                                                        )[1]
                                                    );
                                                    setSecondaryColor(
                                                        colorArray[2].split(
                                                            "#"
                                                        )[1]
                                                    );
                                                    setTertiaryColor(
                                                        colorArray[3].split(
                                                            "#"
                                                        )[1]
                                                    );
                                                    props.onClose();
                                                }
                                            }}
                                        >
                                            Finish
                                        </Button>
                                        <Button
                                            style={{ marginLeft: 8 }}
                                            color={Button.Colors.PRIMARY}
                                            size={Button.Sizes.MEDIUM}
                                            look={Button.Looks.FILLED}
                                            onClick={() => {
                                                props.onClose();
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                    </ModalFooter>
                                </ModalRoot>
                            );
                        });
                    }}
                >
                    Enter Colorway ID
                </Button>
                <Button
                    style={{ marginLeft: 8 }}
                    color={Button.Colors.BRAND}
                    size={Button.Sizes.MEDIUM}
                    look={Button.Looks.FILLED}
                    onClick={() => {
                        const stringToHex = (str: string) => {
                            let hex = "";
                            for (let i = 0; i < str.length; i++) {
                                const charCode = str.charCodeAt(i);
                                const hexValue = charCode.toString(16);

                                // Pad with zeros to ensure two-digit representation
                                hex += hexValue.padStart(2, "0");
                            }
                            return hex;
                        };
                        const colorwayIDArray = `#${accentColor},#${primaryColor},#${secondaryColor},#${tertiaryColor}`;
                        const colorwayID = stringToHex(colorwayIDArray);
                        Clipboard.copy(colorwayID);
                        Toasts.show({
                            message: "Copied Colorway ID Successfully",
                            type: 1,
                            id: "copy-colorway-id-notify",
                        });
                    }}
                >
                    Copy Colorway ID
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
}

export function ColorStealerModal({ modalProps }: { modalProps: ModalProps; }) {
    const [colorVarItems, setColorVarItems] =
        useState<ToolboxItem[]>(ColorVarItems);
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
        <ModalRoot {...modalProps}>
            <div className="colorwayToolbox-list">
                <TextInput
                    placeholder="Search for a color:"
                    onChange={searchToolboxItems}
                    className="colorwayToolbox-search"
                ></TextInput>
                <div className="colorwayToolbox-itemList">
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
                </div>
            </div>
        </ModalRoot>
    );
}
