/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { Margins } from "@utils/margins";
import { copyWithToast } from "@utils/misc";
import { closeModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { Button, FluxDispatcher, Forms, RestAPI, showToast, Switch, Toasts, useEffect, useRef, UserStore, useState } from "@webpack/common";

import { BuilderButton } from "./components/BuilderButton";
import { openColorPickerModal } from "./components/ColorPickerModal";
import { openProfileEffectModal } from "./components/ProfileEffectModal";
import type { ColorPicker, CustomizationSection, ProfileEffect, RGBColor, UserProfile } from "./types";

let CustomizationSection: CustomizationSection = () => null;
let ColorPicker: ColorPicker = () => null;
let getPaletteForAvatar = (v: string) => Promise.resolve<RGBColor[]>([]);
let getComplimentaryPaletteForColor = (v: RGBColor): RGBColor[] => [];
const profileEffectModalClassNames: { [k: string]: string; } = {};
let [primaryColor, setPrimaryColor] = [-1, (v: number) => { }];
let [accentColor, setAccentColor] = [-1, (v: number) => { }];
let [effect, setEffect]: [ProfileEffect | null, (v: ProfileEffect | null) => void] = [null, () => { }];
let [preview, setPreview] = [true, (v: boolean) => { }];

/**
 * Builds a profile theme color string in the legacy format, [#primary,#accent] where
 * primary and accent are base-16 24-bit colors, with each code point offset by +0xE0000
 * @param primary The base-10 24-bit primary color to be encoded
 * @param accent The base-10 24-bit accent color to be encoded
 * @returns The legacy encoded profile theme color string
 */
function encodeColorsLegacy(primary: number, accent: number) {
    return String.fromCodePoint(...[...`[#${primary.toString(16)},#${accent.toString(16)}]`]
        .map(c => c.codePointAt(0)! + 0xE0000));
}

/**
 * Extracts profile theme colors from given legacy-format string
 * @param str The legacy-format string to extract profile theme colors from
 * @returns The profile theme colors. Colors will be -1 if not found.
 */
function decodeColorsLegacy(str: string): [number, number] {
    const colors = str.matchAll(/(?<=#)[\dA-Fa-f]{1,6}/g);
    return [parseInt(colors.next().value?.[0], 16) || -1, parseInt(colors.next().value?.[0], 16) || -1];
}

/**
 * Converts the given base-10 24-bit color to a base-4096 string with each code point offset by +0xE0000
 * @param color The base-10 24-bit color to be converted
 * @returns The converted base-4096 string with +0xE0000 offset
 */
function encodeColor(color: number) {
    if (color === 0) return "\u{e0000}";
    let str = "";
    for (; color > 0; color = Math.trunc(color / 4096))
        str = String.fromCodePoint(color % 4096 + 0xE0000) + str;
    return str;
}

/**
 * Converts the given no-offset base-4096 string to a base-10 24-bit color
 * @param str The no-offset base-4096 string to be converted
 * @returns The converted base-10 24-bit color
 *          Will be -1 if the given string is empty and -2 if greater than the maximum 24-bit color, 16,777,215
 */
function decodeColor(str: string) {
    if (str === "") return -1;
    let color = 0;
    for (let i = 0; i < str.length; i++) {
        if (color > 16_777_215) return -2;
        color += str.codePointAt(i)! * 4096 ** (str.length - 1 - i);
    }
    return color;
}

/**
 * Converts the given base-10 profile effect ID to a base-4096 string with each code point offset by +0xE0000
 * @param id The base-10 profile effect ID to be converted
 * @returns The converted base-4096 string with +0xE0000 offset
 */
function encodeEffect(id: bigint) {
    if (id === 0n) return "\u{e0000}";
    let str = "";
    for (; id > 0n; id /= 4096n)
        str = String.fromCodePoint(Number(id % 4096n) + 0xE0000) + str;
    return str;
}

/**
 * Converts the given no-offset base-4096 string to a base-10 profile effect ID
 * @param str The no-offset base-4096 string to be converted
 * @returns The converted base-10 profile effect ID
 *          Will be -1n if the given string is empty and -2n if greater than the maximum profile effect ID, 1.2 quintillion
 */
function decodeEffect(str: string) {
    if (str === "") return -1n;
    let id = 0n;
    for (let i = 0; i < str.length; i++) {
        if (id > 1_200_000_000_000_000_000n) return -2n;
        id += BigInt(str.codePointAt(i)!) * 4096n ** BigInt(str.length - 1 - i);
    }
    return id;
}

/**
 * Builds a FPTE string containing the given primary / accent colors and effect ID. If the FPTE Builder is NOT set to
 * backwards compatibility mode, the primary and accent colors will be converted to base-4096 before they are encoded.
 * @param primary The primary profile theme color. Must be -1 if unset.
 * @param accent The accent profile theme color. Must be -1 if unset.
 * @param effect The profile effect ID. Must be empty if unset.
 * @param legacy Whether the primary and accent colors should be legacy encoded
 * @returns The built FPTE string. Will be empty if the given colors and effect are all unset.
 */
function buildFPTE(primary: number, accent: number, effect: string, legacy: boolean) {
    const DELIM = "\u200b"; // The FPTE delimiter (zero-width space)

    let fpte = ""; // The FPTE string to be returned

    // If the FPTE Builder is set to backwards compatibility mode,
    // the primary and accent colors, if set, will be legacy encoded.
    if (legacy) {
        // Legacy FPTE strings must include both the primary and accent colors even if they are the same.

        if (primary !== -1) {
            // If both the primary and accent colors are set, they will be legacy encoded and added to the
            // string; otherwise, if the accent color is unset, the primary color will be used in its place.
            if (accent !== -1)
                fpte = encodeColorsLegacy(primary, accent);
            else
                fpte = encodeColorsLegacy(primary, primary);

            // If the effect ID is set, it will be encoded and added to the string prefixed by one delimiter.
            if (effect !== "")
                fpte += DELIM + encodeEffect(BigInt(effect));

            return fpte;
        }

        // Since the primary color is unset, the accent color, if set, will be used in its place.
        if (accent !== -1) {
            fpte = encodeColorsLegacy(accent, accent);

            // If the effect ID is set, it will be encoded and added to the string prefixed by one delimiter.
            if (effect !== "")
                fpte += DELIM + encodeEffect(BigInt(effect));

            return fpte;
        }
    }
    // If the primary color is set, it will be encoded and added to the string.
    else if (primary !== -1) {
        fpte = encodeColor(primary);

        // If the accent color is set and different from the primary color, it
        // will be encoded and added to the string prefixed by one delimiter.
        if (accent !== -1 && primary !== accent) {
            fpte += DELIM + encodeColor(accent);

            // If the effect ID is set, it will be encoded and added to the string prefixed by one delimiter.
            if (effect !== "")
                fpte += DELIM + encodeEffect(BigInt(effect));

            return fpte;
        }
    }
    // If only the accent color is set, it will be encoded and added to the string.
    else if (accent !== -1)
        fpte = encodeColor(accent);

    // Since either the primary / accent colors are the same, both are unset, or just one is set, only one color will be added
    // to the string; therefore, the effect ID, if set, will be encoded and added to the string prefixed by two delimiters.
    if (effect !== "")
        fpte += DELIM + DELIM + encodeEffect(BigInt(effect));

    return fpte;
}

/**
 * Extracts the delimiter-separated values of the first FPTE string found in the given string
 * @param str The string to be searched for a FPTE string
 * @returns An array of the extracted FPTE string's values. Values will be empty if not found.
 */
function extractFPTE(str: string) {
    const fpte: [string, string, string] = ["", "", ""]; // The array containing extracted FPTE values
    let i = 0; // The current index of fpte getting extracted

    for (const char of str) {
        const cp = char.codePointAt(0)!; // The current character's code point

        // If the current character is a delimiter, then the current index of fpte has been completed.
        if (cp === 0x200B) {
            // If the current index of fpte is the last, then the extraction is done.
            if (i >= 2) break;
            i++; // Start extracting the next index of fpte
        }
        // If the current character is not a delimiter but a valid FPTE
        // character, it will be added to the current index of fpte.
        else if (cp >= 0xE0000 && cp <= 0xE0FFF)
            fpte[i] += String.fromCodePoint(cp - 0xE0000);
        // If an FPTE string has been found and its end has been reached, then the extraction is done.
        else if (i > 0 || fpte[0] !== "") break;
    }

    return fpte;
}

/**
 * Converts the given RGB color to a hexadecimal string
 * @param rgb The RGB color to be converted
 * @returns The converted hexadecimal string
 * @example
 * // returns #ff0000
 * RGBtoHex([255, 0, 0])
 */
function RGBtoHex(rgb: RGBColor) {
    return "#" + ((rgb[0] << 16) + (rgb[1] << 8) + rgb[2]).toString(16).padStart(6, "0");
}

function getSuggestedColors(callback: (v: string[]) => void) {
    const user = UserStore.getCurrentUser();
    getPaletteForAvatar(`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=80`)
        .then(avatarColors => {
            callback([
                ...avatarColors.slice(0, 2),
                ...getComplimentaryPaletteForColor(avatarColors[0]).slice(0, 3)
            ].map(e => RGBtoHex(e)));
        })
        .catch(e => {
            console.error(e);
            showToast("Unable to retrieve suggested colors.", Toasts.Type.FAILURE);
            callback([]);
        });
}

function fetchProfileEffects(callback: (v: ProfileEffect[]) => void) {
    RestAPI.get({ url: "/user-profile-effects" })
        .then(res => callback(res.body.profile_effect_configs))
        .catch(e => {
            console.error(e);
            showToast("Unable to retrieve the list of profile effects.", Toasts.Type.FAILURE);
        });
}

function updateUserThemeColors(user: UserProfile, primary: number, accent: number) {
    if (primary > -1) {
        user.themeColors = [primary, accent > -1 ? accent : primary];
        user.premiumType = 2;
    } else if (accent > -1) {
        user.themeColors = [accent, accent];
        user.premiumType = 2;
    }
}

function updateUserEffectId(user: UserProfile, id: bigint) {
    if (id > -1n) {
        user.profileEffectId = id.toString();
        user.premiumType = 2;
    }
}

function updatePreview() {
    FluxDispatcher.dispatch({ type: "USER_SETTINGS_ACCOUNT_SUBMIT_SUCCESS" });
}

const settings = definePluginSettings({
    prioritizeNitro: {
        description: "Source to use if profile theme colors / effects are set by both Nitro and About Me",
        type: OptionType.SELECT,
        options: [
            { label: "Nitro", value: true },
            { label: "About Me", value: false, default: true },
        ]
    },
    hideBuilder: {
        description: "Hide the FPTE Builder in the profiles settings page",
        type: OptionType.BOOLEAN,
        default: false
    }
});

export default definePlugin({
    name: "FakeProfileThemes",
    description: "Allows profile theming and the usage of profile effects by hiding the colors and effect ID in your About Me using invisible, zero-width characters",
    authors: [Devs.ryan],
    patches: [
        {
            find: '"UserProfileStore"',
            replacement: {
                match: /(?<=getUserProfile\(\i\){return )\i\[\i](?=})/,
                replace: "$self.decodeUserBioFPTEHook($&)"
            }
        },
        {
            find: '"DefaultCustomizationSections"',
            replacement: {
                match: /\.sectionsContainer,children:\[/,
                replace: "$&$self.addFPTEBuilder(),"
            }
        },
        {
            find: ".customizationSectionBackground",
            replacement: {
                match: /default:function\(\){return (\i)}.*?;/,
                replace: "$&$self.CustomizationSection=$1;"
            }
        },
        {
            find: "CustomColorPicker:function(){",
            replacement: {
                match: /CustomColorPicker:function\(\){return (\i)}.*? \1=(?=[^=])/,
                replace: "$&$self.ColorPicker="
            }
        },
        {
            find: "getPaletteForAvatar:function(){",
            replacement: {
                match: /getPaletteForAvatar:function\(\){return (\i)}.*? \1=(?=[^=])/,
                replace: "$&$self.getPaletteForAvatar="
            }
        },
        {
            find: "getComplimentaryPaletteForColor:function(){",
            replacement: {
                match: /getComplimentaryPaletteForColor:function\(\){return (\i)}.*?;/,
                replace: "$&$self.getComplimentaryPaletteForColor=$1;"
            }
        },
        {
            find: 'effectGridItem:"',
            noWarn: true,
            replacement: {
                match: /(\i):"(.+?)"/g,
                replace: (m, k, v) => { profileEffectModalClassNames[k] = v; return m; }
            }
        },
        {
            find: '"ProfileCustomizationPreview"',
            replacement: {
                match: /let{(?=(?:[^}]+,)?pendingThemeColors:)(?=(?:[^}]+,)?pendingProfileEffectId:)[^}]+}=(\i)[,;]/,
                replace: "$self.profilePreviewHook($1);$&"
            }
        }
    ],
    set CustomizationSection(c: CustomizationSection) {
        CustomizationSection = c;
    },
    set ColorPicker(c: ColorPicker) {
        ColorPicker = c;
    },
    set getPaletteForAvatar(f: (v: string) => Promise<RGBColor[]>) {
        getPaletteForAvatar = f;
    },
    set getComplimentaryPaletteForColor(f: (v: RGBColor) => RGBColor[]) {
        getComplimentaryPaletteForColor = f;
    },
    settingsAboutComponent: () => {
        return (
            <Forms.FormSection>
                <Forms.FormTitle tag="h3">Usage</Forms.FormTitle>
                <Forms.FormText>
                    After enabling this plugin, you will see custom theme colors and effects in the profiles of other people using this plugin.
                    <div className={Margins.top8}>
                        <b>To set your own profile theme colors and effect:</b>
                    </div>
                    <ol
                        className={Margins.bottom8}
                        style={{ listStyle: "decimal", paddingLeft: "40px" }}
                    >
                        <li>Go to your profile settings</li>
                        <li>Use the FPTE Builder to choose your profile theme colors and effect</li>
                        <li>Click the "Copy FPTE" button</li>
                        <li>Paste the invisible text anywhere in your About Me</li>
                    </ol>
                </Forms.FormText>
            </Forms.FormSection>
        );
    },
    settings,
    decodeUserBioFPTEHook(user: UserProfile | undefined) {
        if (user === undefined) return user;

        if (settings.store.prioritizeNitro) {
            if (user.themeColors !== undefined) {
                if (user.profileEffectId === undefined) {
                    const fpte = extractFPTE(user.bio);
                    if (decodeColor(fpte[0]) === -2)
                        updateUserEffectId(user, decodeEffect(fpte[1]));
                    else
                        updateUserEffectId(user, decodeEffect(fpte[2]));
                }
                return user;
            } else if (user.profileEffectId !== undefined) {
                const fpte = extractFPTE(user.bio);
                const primaryColor = decodeColor(fpte[0]);
                if (primaryColor === -2)
                    updateUserThemeColors(user, ...decodeColorsLegacy(fpte[0]));
                else
                    updateUserThemeColors(user, primaryColor, decodeColor(fpte[1]));
                return user;
            }
        }

        const fpte = extractFPTE(user.bio);
        const primaryColor = decodeColor(fpte[0]);
        if (primaryColor === -2) {
            updateUserThemeColors(user, ...decodeColorsLegacy(fpte[0]));
            updateUserEffectId(user, decodeEffect(fpte[1]));
        } else {
            updateUserThemeColors(user, primaryColor, decodeColor(fpte[1]));
            updateUserEffectId(user, decodeEffect(fpte[2]));
        }

        return user;
    },
    profilePreviewHook(props: any) {
        if (preview) {
            if (primaryColor !== -1) {
                props.pendingThemeColors = [primaryColor, accentColor === -1 ? primaryColor : accentColor];
                props.canUsePremiumCustomization = true;
            } else if (accentColor !== -1) {
                props.pendingThemeColors = [accentColor, accentColor];
                props.canUsePremiumCustomization = true;
            }
            if (effect) {
                props.pendingProfileEffectId = effect.id;
                props.canUsePremiumCustomization = true;
            }
        }
    },
    addFPTEBuilder() {
        if (settings.store.hideBuilder) return null;

        [primaryColor, setPrimaryColor] = useState(-1);
        [accentColor, setAccentColor] = useState(-1);
        [effect, setEffect] = useState<ProfileEffect | null>(null);
        [preview, setPreview] = useState(true);
        const [buildLegacy, setBuildLegacy] = useState(false);
        const currModal = useRef("");

        useEffect(() => () => closeModal(currModal.current), []);

        return (
            <>
                <CustomizationSection title="FPTE Builder">
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <BuilderButton
                            label="Primary"
                            {...primaryColor !== -1 ? (c => ({
                                tooltip: c,
                                selectedStyle: { background: c }
                            }))("#" + primaryColor.toString(16).padStart(6, "0")) : {}}
                            onClick={() => {
                                getSuggestedColors(colors => {
                                    closeModal(currModal.current);
                                    currModal.current = openColorPickerModal(
                                        ColorPicker,
                                        c => {
                                            setPrimaryColor(c);
                                            if (preview) updatePreview();
                                        },
                                        primaryColor === -1 ? parseInt(colors[0]?.slice(1), 16) || 0 : primaryColor,
                                        colors
                                    );
                                });
                            }}
                        />
                        <BuilderButton
                            label="Accent"
                            {...accentColor !== -1 ? (c => ({
                                tooltip: c,
                                selectedStyle: { background: c }
                            }))("#" + accentColor.toString(16).padStart(6, "0")) : {}}
                            onClick={() => {
                                getSuggestedColors(colors => {
                                    closeModal(currModal.current);
                                    currModal.current = openColorPickerModal(
                                        ColorPicker,
                                        c => {
                                            setAccentColor(c);
                                            if (preview) updatePreview();
                                        },
                                        accentColor === -1 ? parseInt(colors[1]?.slice(1), 16) || 0 : accentColor,
                                        colors
                                    );
                                });
                            }}
                        />
                        <BuilderButton
                            label="Effect"
                            {...effect && {
                                tooltip: effect.title,
                                selectedStyle: {
                                    background: `top / cover url(${effect.thumbnailPreviewSrc}), top / cover url(/assets/f328a6f8209d4f1f5022.png)`
                                }
                            }}
                            onClick={() => {
                                fetchProfileEffects(effects => {
                                    if (effects) {
                                        closeModal(currModal.current);
                                        currModal.current = openProfileEffectModal(
                                            e => {
                                                setEffect(e);
                                                if (preview) updatePreview();
                                            },
                                            effects,
                                            profileEffectModalClassNames,
                                            effect?.id
                                        );
                                    } else
                                        showToast("The retrieved data did not match the expected format.", Toasts.Type.FAILURE);
                                });
                            }}
                        />
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                flexDirection: "column",
                            }}
                        >
                            <Button
                                size={Button.Sizes.SMALL}
                                onClick={() => {
                                    const strToCopy = buildFPTE(primaryColor, accentColor, effect?.id ?? "", buildLegacy);
                                    if (strToCopy === "")
                                        showToast("FPTE Builder is empty; nothing to copy!");
                                    else
                                        copyWithToast(strToCopy, "FPTE copied to clipboard!");
                                }}
                            >
                                Copy FPTE
                            </Button>
                            <Button
                                look={Button.Looks.LINK}
                                color={Button.Colors.PRIMARY}
                                size={Button.Sizes.SMALL}
                                style={{ display: primaryColor === -1 && accentColor === -1 && !effect ? "none" : "revert" }}
                                onClick={() => {
                                    setPrimaryColor(-1);
                                    setAccentColor(-1);
                                    setEffect(null);
                                    if (preview) updatePreview();
                                }}
                            >
                                Reset
                            </Button>
                        </div>
                    </div>
                </CustomizationSection>
                <Switch
                    value={preview}
                    onChange={value => {
                        setPreview(value);
                        updatePreview();
                    }}
                >
                    FPTE Builder Preview
                </Switch>
                <Switch
                    value={buildLegacy}
                    note="Will use more characters"
                    onChange={value => setBuildLegacy(value)}
                >
                    Build backwards compatible FPTE
                </Switch>
            </>
        );
    }
});
