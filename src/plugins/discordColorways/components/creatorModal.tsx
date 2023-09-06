/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
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
    Forms,
    Switch,
    Text,
    TextInput,
    UserStore,
    useState,
} from "@webpack/common";

import { ColorPicker } from "..";
import { generateCss } from "../css";
import { Colorway } from "../types";
import { ThemePreviewCategory } from "./themePreview";
export default function CreatorModal({
    modalProps,
}: {
    modalProps: ModalProps;
}) {
    const [accentColor, setAccentColor] = useState<string>("5865f2");
    const [primaryColor, setPrimaryColor] = useState<string>("313338");
    const [secondaryColor, setSecondaryColor] = useState<string>("2b2d31");
    const [tertiaryColor, setTertiaryColor] = useState<string>("1e1f22");
    const [colorwayName, setColorwayName] = useState<string>("");
    const [tintedText, setTintedText] = useState<boolean>(true);
    const [collapsedSettings, setCollapsedSettings] = useState<boolean>(true);
    return (
        <ModalRoot {...modalProps} className="colorwayCreator-modal">
            <ModalHeader>
                <Text variant="heading-lg/semibold" tag="h1">
                    Create Colorway
                </Text>
            </ModalHeader>
            <ModalContent className="colorwayCreator-menuWrapper">
                <Forms.FormTitle style={{ marginBottom: 0 }}>
                    Name:
                </Forms.FormTitle>
                <TextInput
                    placeholder="Give your Colorway a name"
                    value={colorwayName}
                    onChange={setColorwayName}
                ></TextInput>
                <Forms.FormTitle style={{ marginBottom: 0 }}>
                    Colors:
                </Forms.FormTitle>
                <div className="colorwayCreator-colorPreviews">
                    <ColorPicker
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
                <div
                    className={`colorwaysCreator-settingCat${collapsedSettings
                        ? " colorwaysCreator-settingCat-collapsed" : ""}`}
                >
                    <div
                        className="colorwaysCreator-settingItm colorwaysCreator-settingHeader"
                        onClick={() =>
                            collapsedSettings === true
                                ? setCollapsedSettings(false)
                                : setCollapsedSettings(true)
                        }
                    >
                        <Forms.FormTitle style={{ marginBottom: 0 }}>
                            Settings
                        </Forms.FormTitle>
                        <svg
                            className="expand-3Nh1P5 transition-30IQBn directionDown-2w0MZz"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                            role="img"
                        >
                            <path
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M7 10L12 15 17 10"
                                aria-hidden="true"
                            ></path>
                        </svg>
                    </div>
                    <div className="colorwaysCreator-settingItm">
                        <Text variant="eyebrow" tag="h5">
                            Use colored text
                        </Text>
                        <Switch
                            value={tintedText}
                            onChange={setTintedText}
                            hideBorder={true}
                            style={{ marginBottom: 0 }}
                        ></Switch>
                    </div>
                </div>
                <ThemePreviewCategory
                    isCollapsed={false}
                    accent={"#" + accentColor}
                    primary={"#" + primaryColor}
                    secondary={"#" + secondaryColor}
                    tertiary={"#" + tertiaryColor}
                ></ThemePreviewCategory>
            </ModalContent>
            <ModalFooter>
                <Button
                    style={{ marginLeft: 8 }}
                    color={Button.Colors.BRAND}
                    size={Button.Sizes.MEDIUM}
                    look={Button.Looks.FILLED}
                    onClick={e => {
                        const customColorwayCSS = generateCss(
                            primaryColor,
                            secondaryColor,
                            tertiaryColor,
                            accentColor,
                            tintedText
                        );
                        const customColorway: Colorway = {
                            name: colorwayName || "Colorway",
                            import: customColorwayCSS,
                            accent: "#" + accentColor,
                            primary: "#" + primaryColor,
                            secondary: "#" + secondaryColor,
                            tertiary: "#" + tertiaryColor,
                            author: UserStore.getCurrentUser().username,
                            authorID: UserStore.getCurrentUser().id,
                        };
                        const customColorwaysArray: Colorway[] = [
                            customColorway,
                        ];
                        DataStore.get("customColorways").then(
                            customColorways => {
                                customColorways.forEach(
                                    (color: Colorway, i: number) => {
                                        if (
                                            color.name !== customColorway.name
                                        ) {
                                            customColorwaysArray.push(color);
                                        }
                                    }
                                );
                                DataStore.set(
                                    "customColorways",
                                    customColorwaysArray
                                );
                            }
                        );
                        modalProps.onClose();
                        document
                            .getElementById("colorway-refreshcolorway")
                            ?.click();
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
                    color={Button.Colors.PRIMARY}
                    size={Button.Sizes.MEDIUM}
                    look={Button.Looks.FILLED}
                    onClick={() => {
                        modalProps.onClose();
                    }}
                >
                    Cancel
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
}
