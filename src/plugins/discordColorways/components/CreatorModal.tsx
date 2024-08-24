/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ColorPicker, openModal, useEffect, useState, useReducer, UserStore, PluginProps, DataStore, Slider } from "..";
import { knownThemeVars } from "../constants";
import { generateCss, getPreset, gradientPresetIds, PrimarySatDiffs, pureGradientBase } from "../css";
import { Colorway, ModalProps } from "../types";
import { colorToHex, getHex, HexToHSL, hexToString } from "../utils";
import { updateRemoteSources } from "../wsClient";
import ColorwayCreatorSettingsModal from "./ColorwayCreatorSettingsModal";
import ConflictingColorsModal from "./ConflictingColorsModal";
import InputColorwayIdModal from "./InputColorwayIdModal";
import SaveColorwayModal from "./SaveColorwayModal";
import ThemePreviewCategory from "./ThemePreview";
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
    const [tintedText, setTintedText] = useState<boolean>(true);
    const [discordSaturation, setDiscordSaturation] = useState<boolean>(true);
    const [preset, setPreset] = useState<string>("default");
    const [presetColorArray, setPresetColorArray] = useState<string[]>(["accent", "primary", "secondary", "tertiary"]);
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
                    if (prop.includes("p:")) {
                        if (Object.values(getPreset()).map(preset => preset.id).includes(prop.split("p:")[1])) {
                            setPreset(prop.split("p:")[1]);
                            setPresetColorArray(getPreset()[prop.split("p:")[1]].colors);
                        }
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
                        {colorProps.filter(color => presetColorArray.includes(color.id) || Object.keys(getPreset()[preset].calculated! || {}).includes(color.id)).map(presetColor => {
                            return <ColorPicker
                                label={<span className="colorwaysPicker-colorLabel">{Object.keys(getPreset()[preset].calculated! || {}).includes(presetColor.id) ? (presetColor.name + " (Calculated)") : presetColor.name}</span>}
                                color={!Object.keys(
                                    getPreset()[preset].calculated! || {}
                                ).includes(presetColor.id) ?
                                    parseInt(colors[presetColor.id], 16) :
                                    parseInt(
                                        colorToHex(
                                            getPreset(
                                                colors.primary,
                                                colors.secondary,
                                                colors.tertiary,
                                                colors.accent
                                            )[preset].calculated![presetColor.id]
                                        ),
                                        16
                                    )
                                }
                                onChange={(color: number) => {
                                    if (!Object.keys(getPreset()[preset].calculated! || {}).includes(presetColor.id)) {
                                        let hexColor = color.toString(16);
                                        while (hexColor.length < 6) {
                                            hexColor = "0" + hexColor;
                                        }
                                        updateColors({ task: presetColor.id as "accent" | "primary" | "secondary" | "tertiary", color: hexColor });
                                    }
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
                <div
                    className="colorwaysCreator-setting"
                    onClick={() => openModal((props: ModalProps) => <ColorwayCreatorSettingsModal
                        modalProps={props}
                        hasDiscordSaturation={discordSaturation}
                        hasTintedText={tintedText}
                        presetId={preset}
                        onSettings={({ presetId, tintedText, discordSaturation }) => {
                            setPreset(presetId);
                            setPresetColorArray(getPreset()[presetId].colors);
                            setDiscordSaturation(discordSaturation);
                            setTintedText(tintedText);
                        }} />)}>
                    <span className="colorwaysModalSectionHeader">Settings & Presets</span>
                    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" role="img" style={{ rotate: "-90deg" }}>
                        <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M7 10L12 15 17 10" aria-hidden="true" />
                    </svg>
                </div>
                <ThemePreviewCategory
                    accent={"#" + colors.accent}
                    primary={"#" + colors.primary}
                    secondary={"#" + colors.secondary}
                    tertiary={"#" + colors.tertiary}
                    previewCSS={gradientPresetIds.includes(getPreset()[preset].id) ? pureGradientBase + `.colorwaysPreview-modal,.colorwaysPreview-wrapper {--gradient-theme-bg: linear-gradient(${(getPreset(
                        colors.primary,
                        colors.secondary,
                        colors.tertiary,
                        colors.accent
                    )[preset].preset(discordSaturation) as { full: string, base: string; }).base})}` : (tintedText ? `.colorwaysPreview-modal,.colorwaysPreview-wrapper {
                        --primary-500: hsl(${HexToHSL("#" + colors.primary)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + colors.primary)[1] / 100) * (100 + PrimarySatDiffs[500])) * 10) / 10 : HexToHSL("#" + colors.primary)[1]}%) ${mutedTextBrightness || Math.min(HexToHSL("#" + colors.primary)[2] + (3.6 * 3), 100)}%);
                        --primary-360: hsl(${HexToHSL("#" + colors.secondary)[0]} calc(var(--saturation-factor, 1)*${discordSaturation ? Math.round(((HexToHSL("#" + colors.primary)[1] / 100) * (100 + PrimarySatDiffs[360])) * 10) / 10 : HexToHSL("#" + colors.primary)[1]}%) 90%);
                }` : "")}
                />
            </div>
            <div className="colorwaysModalFooter">
                <button
                    className="colorwaysPillButton colorwaysPillButton-onSurface"
                    onClick={async () => {
                        var customColorwayCSS: string = "";
                        if (preset === "default") {
                            customColorwayCSS = generateCss(
                                colors.primary,
                                colors.secondary,
                                colors.tertiary,
                                colors.accent,
                                tintedText,
                                discordSaturation,
                                mutedTextBrightness,
                                (colorwayName || "Colorway")
                            );
                        } else {
                            gradientPresetIds.includes(getPreset()[preset].id) ?
                                customColorwayCSS = `/**
                                * @name ${colorwayName || "Colorway"}
                                * @version ${PluginProps.creatorVersion}
                                * @description Automatically generated Colorway.
                                * @author ${UserStore.getCurrentUser().username}
                                * @authorId ${UserStore.getCurrentUser().id}
                                * @preset Gradient
                                */
                               ${(getPreset(colors.primary, colors.secondary, colors.tertiary, colors.accent)[preset].preset(discordSaturation) as { full: string; }).full}` : customColorwayCSS = `/**
                               * @name ${colorwayName || "Colorway"}
                               * @version ${PluginProps.creatorVersion}
                               * @description Automatically generated Colorway.
                               * @author ${UserStore.getCurrentUser().username}
                               * @authorId ${UserStore.getCurrentUser().id}
                               * @preset ${getPreset()[preset].name}
                               */
                               ${(getPreset(colors.primary, colors.secondary, colors.tertiary, colors.accent)[preset].preset(discordSaturation) as string)}`;
                        }
                        const customColorway: Colorway = {
                            name: (colorwayName || "Colorway"),
                            accent: "#" + colors.accent,
                            primary: "#" + colors.primary,
                            secondary: "#" + colors.secondary,
                            tertiary: "#" + colors.tertiary,
                            colors: presetColorArray,
                            author: UserStore.getCurrentUser().username,
                            authorID: UserStore.getCurrentUser().id,
                            isGradient: gradientPresetIds.includes(getPreset()[preset].id),
                            linearGradient: gradientPresetIds.includes(getPreset()[preset].id) ? (getPreset(
                                colors.primary,
                                colors.secondary,
                                colors.tertiary,
                                colors.accent
                            )[preset].preset(discordSaturation) as { base: string; }).base : "",
                            preset: getPreset()[preset].id,
                            creatorVersion: PluginProps.creatorVersion
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

