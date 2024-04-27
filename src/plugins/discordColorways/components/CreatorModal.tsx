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
    ScrollerThin,
    Switch,
    Text,
    TextInput,
    useEffect,
    UserStore,
    useState,
} from "@webpack/common";

import { ColorPicker } from "..";
import { knownThemeVars } from "../constants";
import { generateCss, getPreset } from "../css";
import { Colorway } from "../types";
import { colorToHex, getHex, hexToString } from "../utils";
import ConflictingColorsModal from "./ConflictingColorsModal";
import InputColorwayIdModal from "./InputColorwayIdModal";
import ThemePreviewCategory from "./ThemePreview";
export default function ({
    modalProps,
    loadUIProps,
    colorwayID
}: {
    modalProps: ModalProps;
    loadUIProps?: () => Promise<void>;
    colorwayID?: string;
}) {
    const [accentColor, setAccentColor] = useState<string>("5865f2");
    const [primaryColor, setPrimaryColor] = useState<string>("313338");
    const [secondaryColor, setSecondaryColor] = useState<string>("2b2d31");
    const [tertiaryColor, setTertiaryColor] = useState<string>("1e1f22");
    const [colorwayName, setColorwayName] = useState<string>("");
    const [tintedText, setTintedText] = useState<boolean>(true);
    const [discordSaturation, setDiscordSaturation] = useState<boolean>(true);
    const [collapsedSettings, setCollapsedSettings] = useState<boolean>(true);
    const [collapsedPresets, setCollapsedPresets] = useState<boolean>(true);
    const [preset, setPreset] = useState<string>("default");
    const [presetColorArray, setPresetColorArray] = useState<string[]>(["accent", "primary", "secondary", "tertiary"]);

    const colorProps = {
        accent: {
            get: accentColor,
            set: setAccentColor,
            name: "Accent"
        },
        primary: {
            get: primaryColor,
            set: setPrimaryColor,
            name: "Primary"
        },
        secondary: {
            get: secondaryColor,
            set: setSecondaryColor,
            name: "Secondary"
        },
        tertiary: {
            get: tertiaryColor,
            set: setTertiaryColor,
            name: "Tertiary"
        }
    };

    useEffect(() => {
        const parsedID = colorwayID?.split("colorway:")[1];
        if (parsedID) {
            const allEqual = (arr: any[]) => arr.every(v => v === arr[0]);
            if (!parsedID) {
                throw new Error("Please enter a Colorway ID");
            } else if (parsedID.length < 62) {
                throw new Error("Invalid Colorway ID");
            } else if (!hexToString(parsedID).includes(",")) {
                throw new Error("Invalid Colorway ID");
            } else if (!allEqual(hexToString(parsedID).split(",").map((e: string) => e.match("#")!.length)) && hexToString(parsedID).split(",").map((e: string) => e.match("#")!.length)[0] !== 1) {
                throw new Error("Invalid Colorway ID");
            } else {
                const colorArray: string[] = hexToString(parsedID).split(",");
                setAccentColor(colorArray[0].split("#")[1]);
                setPrimaryColor(colorArray[1].split("#")[1]);
                setSecondaryColor(colorArray[2].split("#")[1]);
                setTertiaryColor(colorArray[3].split("#")[1]);
            }
        }
    });
    const colorPickerProps = {
        suggestedColors: [
            "#313338",
            "#2b2d31",
            "#1e1f22",
            "#5865f2",
        ],
        showEyeDropper: true
    };

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
                />
                <div className="colorwaysCreator-settingCat">
                    <Forms.FormTitle style={{ marginBottom: 0, paddingLeft: "8px" }}>
                        Colors:
                    </Forms.FormTitle>
                    <div className="colorwayCreator-colorPreviews">
                        {presetColorArray.map(presetColor => {
                            return <ColorPicker
                                label={<Text className="colorwaysPicker-colorLabel">{colorProps[presetColor].name}</Text>}
                                color={parseInt(colorProps[presetColor].get, 16)}
                                onChange={(color: number) => {
                                    let hexColor = color.toString(16);
                                    while (hexColor.length < 6) {
                                        hexColor = "0" + hexColor;
                                    }
                                    colorProps[presetColor].set(hexColor);
                                }}
                                {...colorPickerProps}
                            />;
                        })}
                    </div>
                </div>
                <div className={`colorwaysCreator-settingCat${collapsedSettings ? " colorwaysCreator-settingCat-collapsed" : ""}`}>
                    <div
                        className="colorwaysCreator-settingItm colorwaysCreator-settingHeader"
                        onClick={() => setCollapsedSettings(!collapsedSettings)}>
                        <Forms.FormTitle style={{ marginBottom: 0 }}>Settings</Forms.FormTitle>
                        <svg className="expand-3Nh1P5 transition-30IQBn directionDown-2w0MZz" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" role="img">
                            <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M7 10L12 15 17 10" aria-hidden="true" />
                        </svg>
                    </div>
                    <ScrollerThin orientation="vertical" className="colorwaysCreator-settingsList" paddingFix>
                        <div className="colorwaysCreator-settingItm" onClick={() => setTintedText(!tintedText)}>
                            <Text variant="eyebrow" tag="h5">Use colored text</Text>
                            <Switch value={tintedText} onChange={setTintedText} hideBorder={true} style={{ marginBottom: 0 }} />
                        </div>
                        <div className="colorwaysCreator-settingItm" onClick={() => setDiscordSaturation(!discordSaturation)}>
                            <Text variant="eyebrow" tag="h5">Use Discord's saturation</Text>
                            <Switch value={discordSaturation} onChange={setDiscordSaturation} hideBorder={true} style={{ marginBottom: 0 }} />
                        </div>
                    </ScrollerThin>
                </div>
                <div className={`colorwaysCreator-settingCat${collapsedPresets ? " colorwaysCreator-settingCat-collapsed" : ""}`}>
                    <div
                        className="colorwaysCreator-settingItm colorwaysCreator-settingHeader"
                        onClick={() => setCollapsedPresets(!collapsedPresets)}>
                        <Forms.FormTitle style={{ marginBottom: 0 }}>Presets</Forms.FormTitle>
                        <svg className="expand-3Nh1P5 transition-30IQBn directionDown-2w0MZz" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" role="img">
                            <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M7 10L12 15 17 10" aria-hidden="true" />
                        </svg>
                    </div>
                    <ScrollerThin orientation="vertical" className="colorwaysCreator-settingsList">
                        <div className="colorwaysCreator-settingItm colorwaysCreator-preset" onClick={() => {
                            setPreset("default");
                            setPresetColorArray(["primary", "secondary", "tertiary", "accent"]);
                        }}>
                            <svg aria-hidden="true" role="img" width="24" height="24" viewBox="0 0 24 24">
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="currentColor" />
                                {preset === "default" && <circle cx="12" cy="12" r="5" className="radioIconForeground-3wH3aU" fill="currentColor" />}
                            </svg>
                            <Text variant="eyebrow" tag="h5">Default</Text>
                        </div>
                        {Object.values(getPreset()).map(pre => {
                            return <div className="colorwaysCreator-settingItm colorwaysCreator-preset" onClick={() => {
                                setPreset(pre.id);
                                setPresetColorArray(pre.colors);
                            }}>
                                <svg aria-hidden="true" role="img" width="24" height="24" viewBox="0 0 24 24">
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="currentColor" />
                                    {preset === pre.id && <circle cx="12" cy="12" r="5" className="radioIconForeground-3wH3aU" fill="currentColor" />}
                                </svg>
                                <Text variant="eyebrow" tag="h5">{pre.name}</Text>
                            </div>;
                        })}
                    </ScrollerThin>
                </div>
                <ThemePreviewCategory isCollapsed={false} accent={"#" + accentColor} primary={"#" + primaryColor} secondary={"#" + secondaryColor} tertiary={"#" + tertiaryColor} />
            </ModalContent>
            <ModalFooter>
                <Button
                    style={{ marginLeft: 8 }}
                    color={Button.Colors.BRAND}
                    size={Button.Sizes.MEDIUM}
                    look={Button.Looks.FILLED}
                    onClick={e => {
                        var customColorwayCSS: string = "";
                        if (preset === "default") {
                            customColorwayCSS = generateCss(
                                primaryColor,
                                secondaryColor,
                                tertiaryColor,
                                accentColor,
                                tintedText,
                                discordSaturation
                            );
                        } else {
                            (getPreset()[preset].id === "gradientType1" || getPreset()[preset].id === "gradientType2") ?
                                customColorwayCSS = getPreset(
                                    primaryColor,
                                    secondaryColor,
                                    tertiaryColor,
                                    accentColor
                                )[preset].preset(discordSaturation).full : customColorwayCSS = getPreset(
                                    primaryColor,
                                    secondaryColor,
                                    tertiaryColor,
                                    accentColor
                                )[preset].preset(discordSaturation);
                        }
                        const customColorway: Colorway = {
                            name: (colorwayName || "Colorway") + (preset === "default" ? "" : ": Made for " + getPreset()[preset].name),
                            "dc-import": customColorwayCSS,
                            accent: "#" + accentColor,
                            primary: "#" + primaryColor,
                            secondary: "#" + secondaryColor,
                            tertiary: "#" + tertiaryColor,
                            colors: presetColorArray,
                            author: UserStore.getCurrentUser().username,
                            authorID: UserStore.getCurrentUser().id,
                            isGradient: getPreset()[preset].id === "gradientType1" || getPreset()[preset].id === "gradientType2",
                            linearGradient: (getPreset()[preset].id === "gradientType1" || getPreset()[preset].id === "gradientType2") ? getPreset(
                                primaryColor,
                                secondaryColor,
                                tertiaryColor,
                                accentColor
                            )[preset].preset(discordSaturation).base : null
                        };
                        const customColorwaysArray: Colorway[] = [customColorway];
                        DataStore.get("customColorways").then(
                            customColorways => {
                                customColorways.forEach(
                                    (color: Colorway, i: number) => {
                                        if (color.name !== customColorway.name) {
                                            customColorwaysArray.push(color);
                                        }
                                    }
                                );
                                DataStore.set("customColorways", customColorwaysArray);
                            }
                        );
                        modalProps.onClose();
                        loadUIProps!();
                    }}
                >Finish</Button>
                <Button
                    style={{ marginLeft: 8 }}
                    color={Button.Colors.PRIMARY}
                    size={Button.Sizes.MEDIUM}
                    look={Button.Looks.OUTLINED}
                    onClick={() => {
                        function setAllColors({ accent, primary, secondary, tertiary }: { accent: string, primary: string, secondary: string, tertiary: string; }) {
                            setAccentColor(accent.split("#")[1]);
                            setPrimaryColor(primary.split("#")[1]);
                            setSecondaryColor(secondary.split("#")[1]);
                            setTertiaryColor(tertiary.split("#")[1]);
                        }
                        var copiedThemes = ["Discord"];
                        Object.values(knownThemeVars).map((theme: { variable: string; variableType?: string; }, i: number) => {
                            if (getComputedStyle(document.body).getPropertyValue(theme.variable)) {
                                copiedThemes.push(Object.keys(knownThemeVars)[i]);
                            }
                        });
                        if (copiedThemes.length > 1) {
                            openModal(props => <ConflictingColorsModal modalProps={props} onFinished={setAllColors} />);
                        } else {
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
                        }
                    }}
                >
                    Copy Current Colors
                </Button>
                <Button
                    style={{ marginLeft: 8 }}
                    color={Button.Colors.PRIMARY}
                    size={Button.Sizes.MEDIUM}
                    look={Button.Looks.OUTLINED}
                    onClick={() => openModal((props: any) => <InputColorwayIdModal modalProps={props} onColorwayId={colorwayID => {
                        const setColor = [
                            setAccentColor,
                            setPrimaryColor,
                            setSecondaryColor,
                            setTertiaryColor
                        ];
                        hexToString(colorwayID).split(/,#/).forEach((color: string, i: number) => setColor[i](colorToHex(color)));
                    }} />)}
                >
                    Enter Colorway ID
                </Button>
                <Button
                    style={{ marginLeft: 8 }}
                    color={Button.Colors.PRIMARY}
                    size={Button.Sizes.MEDIUM}
                    look={Button.Looks.OUTLINED}
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
