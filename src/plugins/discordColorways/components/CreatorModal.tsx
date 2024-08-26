/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ColorPicker, openModal, useEffect, useState, useReducer, UserStore, PluginProps, DataStore, Slider } from "..";
import { knownThemeVars } from "../constants";
import { generateCss, getPreset, gradientPresetIds } from "../css";
import { Colorway, ModalProps } from "../types";
import { colorToHex, getHex, HexToHSL, hexToString } from "../utils";
import { updateRemoteSources } from "../wsClient";
import ConflictingColorsModal from "./ConflictingColorsModal";
import InputColorwayIdModal from "./InputColorwayIdModal";
import SaveColorwayModal from "./SaveColorwayModal";
export default function ({
    modalProps,
    loadUIProps = () => new Promise(() => { }),
    colorwayID
}: {
    modalProps: ModalProps;
    loadUIProps?: () => Promise<void>;
    colorwayID?: string;
}) {
    const [colors, updateColors] = useReducer((colors: {
        accent: string,
        primary: string,
        secondary: string,
        tertiary: string;
    }, action: {
        task: "accent" | "primary" | "secondary" | "tertiary" | "all",
        color?: string;
        colorObj?: {
            accent: string,
            primary: string,
            secondary: string,
            tertiary: string;
        };
    }) => {
        if (action.task === "all") {
            return { ...action.colorObj } as {
                accent: string,
                primary: string,
                secondary: string,
                tertiary: string;
            };
        } else {
            return { ...colors, [action.task as "accent" | "primary" | "secondary" | "tertiary"]: action.color } as {
                accent: string,
                primary: string,
                secondary: string,
                tertiary: string;
            };
        }
    }, {
        accent: "5865f2",
        primary: "313338",
        secondary: "2b2d31",
        tertiary: "1e1f22"
    });
    const [colorwayName, setColorwayName] = useState<string>("");
    const [mutedTextBrightness, setMutedTextBrightness] = useState<number>(Math.min(HexToHSL("#" + colors.primary)[2] + (3.6 * 3), 100));
    const [theme, setTheme] = useState("discord");

    useEffect(() => {
        async function load() {
            setTheme(await DataStore.get("colorwaysPluginTheme") as string);
        }
        load();
    }, []);

    const setColor = [
        "accent",
        "primary",
        "secondary",
        "tertiary"
    ] as ("accent" | "primary" | "secondary" | "tertiary")[];

    const colorProps = [
        {
            name: "Accent",
            id: "accent"
        },
        {
            name: "Primary",
            id: "primary"
        },
        {
            name: "Secondary",
            id: "secondary"
        },
        {
            name: "Tertiary",
            id: "tertiary"
        }
    ];

    useEffect(() => {
        if (colorwayID) {
            if (!colorwayID.includes(",")) {
                throw new Error("Invalid Colorway ID");
            } else {
                colorwayID.split("|").forEach((prop: string) => {
                    if (prop.includes(",#")) {
                        prop.split(/,#/).forEach((color: string, i: number) => updateColors({ task: setColor[i], color: colorToHex(color) }));
                    }
                    if (prop.includes("n:")) {
                        setColorwayName(prop.split("n:")[1]);
                    }
                });
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
        <div className={`colorwaysModal ${modalProps.transitionState == 2 ? "closing" : ""} ${modalProps.transitionState == 4 ? "hidden" : ""}`} data-theme={theme}>
            <h2 className="colorwaysModalHeader">Create a Colorway</h2>
            <div className="colorwaysModalContent" style={{ minWidth: 500 }}>
                <span className="colorwaysModalSectionHeader">Name:</span>
                <input
                    type="text"
                    className="colorwayTextBox"
                    placeholder="Give your Colorway a name"
                    value={colorwayName}
                    onInput={e => setColorwayName(e.currentTarget.value)}
                />
                <div className="colorwaysCreator-settingCat">
                    <span className="colorwaysModalSectionHeader">Colors & Values:</span>
                    <div className="colorwayCreator-colorPreviews">
                        {colorProps.map(presetColor => {
                            return <ColorPicker
                                label={<span className="colorwaysPicker-colorLabel">{presetColor.name}</span>}
                                color={parseInt(colors[presetColor.id], 16)}
                                onChange={(color: number) => {
                                    let hexColor = color.toString(16);
                                    while (hexColor.length < 6) {
                                        hexColor = "0" + hexColor;
                                    }
                                    updateColors({ task: presetColor.id as "accent" | "primary" | "secondary" | "tertiary", color: hexColor });
                                }}
                                {...colorPickerProps}
                            />;
                        })}
                    </div>
                    <div className="colorwaysSettingsDivider" style={{ margin: "10px 0" }} />
                    <span className="colorwaysModalSectionHeader">Muted Text Brightness:</span>
                    <Slider
                        minValue={0}
                        maxValue={100}
                        initialValue={mutedTextBrightness}
                        onValueChange={setMutedTextBrightness}
                    />
                </div>
            </div>
            <div className="colorwaysModalFooter">
                <button
                    className="colorwaysPillButton colorwaysPillButton-onSurface"
                    onClick={async () => {
                        const customColorway: Colorway = {
                            name: (colorwayName || "Colorway"),
                            accent: "#" + colors.accent,
                            primary: "#" + colors.primary,
                            secondary: "#" + colors.secondary,
                            tertiary: "#" + colors.tertiary,
                            author: UserStore.getCurrentUser().username,
                            authorID: UserStore.getCurrentUser().id,
                            CSSVersion: PluginProps.CSSVersion
                        };
                        openModal(props => <SaveColorwayModal modalProps={props} colorways={[customColorway]} onFinish={() => {
                            modalProps.onClose();
                            loadUIProps();
                            updateRemoteSources();
                        }} />);
                    }}
                >
                    Finish
                </button>
                <button
                    className="colorwaysPillButton"
                    onClick={() => {
                        function setAllColors({ accent, primary, secondary, tertiary }: { accent: string, primary: string, secondary: string, tertiary: string; }) {
                            updateColors({
                                task: "all",
                                colorObj: {
                                    accent: accent.split("#")[1],
                                    primary: primary.split("#")[1],
                                    secondary: secondary.split("#")[1],
                                    tertiary: tertiary.split("#")[1]
                                }
                            });
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
                            updateColors({
                                task: "all", colorObj: {
                                    primary: getHex(
                                        getComputedStyle(
                                            document.body
                                        ).getPropertyValue("--primary-600")
                                    ).split("#")[1],
                                    secondary: getHex(
                                        getComputedStyle(
                                            document.body
                                        ).getPropertyValue("--primary-630")
                                    ).split("#")[1],
                                    tertiary: getHex(
                                        getComputedStyle(
                                            document.body
                                        ).getPropertyValue("--primary-700")
                                    ).split("#")[1],
                                    accent: getHex(
                                        getComputedStyle(
                                            document.body
                                        ).getPropertyValue("--brand-experiment")
                                    ).split("#")[1]
                                }
                            });
                        }
                    }}
                >
                    Copy Current Colors
                </button>
                <button
                    className="colorwaysPillButton"
                    onClick={() => openModal((props: any) => <InputColorwayIdModal modalProps={props} onColorwayId={colorwayID => {
                        hexToString(colorwayID).split(/,#/).forEach((color: string, i: number) => updateColors({ task: setColor[i], color: colorToHex(color) }));
                    }} />)}
                >
                    Enter Colorway ID
                </button>
                <button
                    className="colorwaysPillButton"
                    onClick={() => {
                        modalProps.onClose();
                    }}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}

