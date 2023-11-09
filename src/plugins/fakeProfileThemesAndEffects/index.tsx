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
import { Button, FluxDispatcher, Forms, RestAPI, showToast, Switch, Text, Toasts, useEffect, useRef, UserStore, useState } from "@webpack/common";
import { User } from "discord-types/general";

import { openColorPickerModal } from "./components/ColorPickerModal";
import { openProfileEffectModal } from "./components/ProfileEffectModal";

interface UserProfile extends User {
    themeColors: [number, number] | undefined;
    profileEffectID: string | undefined;
}

type RGBColor = [number, number, number];

let ColorPicker: React.ComponentType<any> = () => null;
let getPaletteForAvatar: (v: string) => Promise<RGBColor[]>;
let getComplimentaryPaletteForColor: (v: RGBColor) => RGBColor[];
let [primaryColor, setPrimaryColor] = [-1, (v: number): void => { }];
let [accentColor, setAccentColor] = [-1, (v: number): void => { }];
let [effectID, setEffectID] = ["", (v: string): void => { }];
let [preview, setPreview] = [true, (v: boolean): void => { }];

/**
 * Converts the given base10 number to a base125 string
 * @param {number} base10 - The base10 number to be converted
 * @returns {string} The converted base125 string
 */
function base10NumToBase125Str(base10: number): string {
    if (base10 === 0) return "\u{00001}";
    const base125CPs: number[] = [];
    for (let i: number = base10; i > 0; i = Math.trunc(i / 125))
        base125CPs.unshift(i % 125 + 1);
    return String.fromCodePoint(...base125CPs);
}

/**
 * Converts the given base10 BigInt to a base125 string
 * @param {bigint} base10 - The base10 BigInt to be converted
 * @returns {string} The converted base125 string
 */
function base10BigIntToBase125Str(base10: bigint): string {
    if (base10 === 0n) return "\u{00001}";
    const base125CPs: number[] = [];
    for (let i: bigint = base10; i > 0n; i /= 125n)
        base125CPs.unshift(Number(i % 125n + 1n));
    return String.fromCodePoint(...base125CPs);
}

/**
 * Converts the given base125 string to a base10 number
 * @param {string} str - The base125 string to be converted
 * @param {number} lim - The upper limit of the conversion
 * @returns {number} The converted base10 number. Will be -1 if the given string is empty and -2 if greater
 *     than the given upper limit.
 */
function base125StrToBase10Num(str: string, lim: number): number {
    if (str === "") return -1;
    let base10: number = 0;
    for (let i: number = 0; i < str.length; i++) {
        if (base10 > lim) return -2;
        base10 += (str.codePointAt(i)! - 1) * 125 ** (str.length - 1 - i);
    }
    return base10;
}

/**
 * Converts the given base125 string to a base10 BigInt
 * @param {string} str - The base125 string to be converted
 * @param {bigint} lim - The upper limit of the conversion
 * @returns {bigint} The converted base10 BigInt. Will be -1n if the given string is empty and -2n if greater
 *     than the given upper limit.
 */
function base125StrToBase10BigInt(str: string, lim: bigint): bigint {
    if (str === "") return -1n;
    let base10: bigint = 0n;
    for (let i: number = 0; i < str.length; i++) {
        if (base10 > lim) return -2n;
        base10 += BigInt(str.codePointAt(i)! - 1) * 125n ** BigInt(str.length - 1 - i);
    }
    return base10;
}

/**
 * Converts the given base125 color string to a base10 number
 * @param {string} str - The base125 color to be converted
 * @returns {number} - The converted base10 number. Will be -1 if the given string is empty and -2 if greater than the
 *     maximum 24 bit color.
 */
function base125StrToBase10Color(str: string): number {
    return base125StrToBase10Num(str, 16_777_215);
}

/**
 * Converts the given base125 item ID string to a base10 BigInt
 * @param {string} str - The base125 item ID to be converted
 * @returns {bigint} - The converted base10 BigInt. Will be -1n if the given string is empty and -2n if greater than the
 *     maximum item ID.
 */
function base125StrToBase10ItemID(str: string): bigint {
    return base125StrToBase10BigInt(str, 1_200_000_000_000_000_000n);
}

/**
 * Encodes the given string to 3y3 characters.
 * @param {string} str - The string to be 3y3 encoded
 * @returns {string} - The encoded 3y3 string
 */
function encode3y3(str: string): string {
    const encodedCPs: number[] = [];
    for (let i: number = 0; i < str.length; i++)
        encodedCPs.push(str.codePointAt(i)! + 0xE0000);
    return String.fromCodePoint(...encodedCPs);
}

/**
 * Decodes the first string of 3y3 characters in the given user bio string.
 * @param {string} bio - The user bio string to be decoded
 * @returns {[string, string, string]} - The primary / accent colors and effect. Will be empty if not found.
 */
function decode3y3(bio: string): [string, string, string] {
    const decoded3y3: [string, string, string] = ["", "", ""]; // The primary / accent colors and effect to be returned

    const bioCPs: string[] = [...bio]; // An array containing the individual code points of the user bio string
    if (bioCPs.length === 0) return decoded3y3;

    let tempCPs: number[] = []; // An array to hold the current index of decoded3y3 getting decoded
    let i: number = 0; // The index of decoded3y3

    for (let j: number = 0; j < bioCPs.length; j++) {
        const currCP: number = bioCPs[j].codePointAt(0)!; // The current code point in the user bio code point array
        if (currCP === 0xE007E) {
            if (tempCPs.length > 0)
                decoded3y3[i] = String.fromCodePoint(...tempCPs);
            if (i > 1) break;
            tempCPs = [];
            i++;
        } else if (currCP > 0xE0000 && currCP < 0xE007E) {
            tempCPs.push(currCP - 0xE0000);
            if (j === bioCPs.length - 1)
                decoded3y3[i] = String.fromCodePoint(...tempCPs);
        } else if (i > 0) {
            if (tempCPs.length > 0)
                decoded3y3[i] = String.fromCodePoint(...tempCPs);
            break;
        }
    }

    return decoded3y3;
}

/**
 * Legacy decodes the given string
 * @param {string} str - The string to be legacy decoded
 * @returns {[number, number]} - The primary / accent colors. Will be -1 if not found.
 */
function decodeLegacy3y3(str: string): [number, number] {
    const themeColors: [number, number] = [-1, -1];
    let numSignIndex: number = -1;
    for (let i: number = 0; i < str.length; i++) {
        if (str[i] === "#") {
            numSignIndex = i;
            break;
        }
    }

    if (numSignIndex !== -1) {
        let tempStr: string = "";
        let lim: number = numSignIndex + 7 < str.length ? numSignIndex + 7 : str.length;
        for (let i: number = numSignIndex + 1; i < lim; i++) {
            if (str[i] === "," || str[i] === "]") break;
            tempStr += str[i];
        }

        let color: number = parseInt(tempStr, 16);
        if (!Number.isNaN(color)) {
            themeColors[0] = color;
            numSignIndex = -1;
            for (let i: number = lim; i < str.length; i++) {
                if (str[i] === "#") {
                    numSignIndex = i;
                    break;
                }
            }

            if (numSignIndex !== -1) {
                tempStr = "";
                lim = numSignIndex + 7 < str.length ? numSignIndex + 7 : str.length;
                for (let i: number = numSignIndex + 1; i < lim; i++) {
                    if (str[i] === "]" || str[i] === ",") break;
                    tempStr += str[i];
                }

                color = parseInt(tempStr, 16);
                if (!Number.isNaN(color))
                    themeColors[1] = color;
            }
        }
    }

    return themeColors;
}

/**
 * Generates a 3y3 string containing the given primary / accent colors and effect. If the 3y3 Builder is NOT set to
 * backwards compatibility mode, the primary and accent colors will be converted to base125 before they are encoded to 3y3.
 * @param {number} primary - The primary profile theme color. Must be -1 if unset.
 * @param {number} accent - The accent profile theme color. Must be -1 if unset.
 * @param {string} effect - The profile effect ID. Must be empty if unset.
 * @param {boolean} legacy - Whether the primary and accent colors should be legacy encoded
 * @returns {string} The generated 3y3 string. Will be empty if the given colors and effect are all unset.
 */
function generate3y3(primary: number, accent: number, effect: string, legacy: boolean): string {
    const sep = "\u{e007e}"; // The 3y3 separator

    let str: string = ""; // The 3y3 string to be returned

    // If the 3y3 Builder is set to backwards compatibility mode,
    // the primary and accent colors, if set, will be legacy encoded.
    if (legacy) {
        // Legacy 3y3 strings must include both the primary and accent colors even if they are the same.

        if (primary !== -1) {
            // If both the primary and accent colors are set, they will be legacy encoded and added to the
            // string; otherwise, if the accent color is unset, the primary color will be used in its place.
            if (accent !== -1)
                str = encode3y3("[#" + primary.toString(16) + ",#" + accent.toString(16) + "]");
            else
                str = encode3y3("[#" + primary.toString(16) + ",#" + primary.toString(16) + "]");

            // If the effect is set, it will be encoded and added to the string prefixed by one separator.
            if (effect !== "")
                str += sep + encode3y3(base10BigIntToBase125Str(BigInt(effect)));

            return str;
        }

        // Since the primary color is unset, the accent color, if set, will be used in its place.
        if (accent !== -1) {
            str = encode3y3("[#" + accent.toString(16) + ",#" + accent.toString(16) + "]");

            // If the effect is set, it will be encoded and added to the string prefixed by one separator.
            if (effect !== "")
                str += sep + encode3y3(base10BigIntToBase125Str(BigInt(effect)));

            return str;
        }
    }
    // If the primary color is set, it will be encoded and added to the string.
    else if (primary !== -1) {
        str = encode3y3(base10NumToBase125Str(primary));

        // If the accent color is set and different from the primary color, it
        // will be encoded and added to the string prefixed by one separator.
        if (accent !== -1 && primary !== accent) {
            str += sep + encode3y3(base10NumToBase125Str(accent));

            // If the effect is set, it will be encoded and added to the string prefixed by one separator.
            if (effect !== "")
                str += sep + encode3y3(base10BigIntToBase125Str(BigInt(effect)));

            return str;
        }
    }
    // If only the accent color is set, it will be encoded and added to the string.
    else if (accent !== -1)
        str = encode3y3(base10NumToBase125Str(accent));

    // Since either the primary / accent colors are the same, both are unset, or just one is set, only one color will be added
    // to the string; therefore, if the effect is set, it will be encoded and added to the string prefixed by two separators.
    if (effect !== "")
        str += sep + sep + encode3y3(base10BigIntToBase125Str(BigInt(effect)));

    return str;
}

function RGBtoHex(rgb: RGBColor): string {
    return "#" + ((rgb[0] << 16) + (rgb[1] << 8) + rgb[2]).toString(16).padStart(6, "0");
}

function getSuggestedColors(callback: (v: string[]) => void) {
    const user: User = UserStore.getCurrentUser();
    const avatarURL: string = "https://cdn.discordapp.com/avatars/" + user.id + "/" + user.avatar + ".webp?size=80";
    getPaletteForAvatar(avatarURL).then((avatarColors: RGBColor[]) => {
        const suggestedColors: string[] = [];
        for (let i: number = 0; i < 2; i++)
            suggestedColors.push(RGBtoHex(avatarColors[i]));
        const compColors: RGBColor[] = getComplimentaryPaletteForColor(avatarColors[0]);
        for (let i: number = 0; i < compColors.length; i++)
            suggestedColors.push(RGBtoHex(compColors[i]));
        callback(suggestedColors);
    }).catch(e => {
        console.error(e);
        showToast("Unable to retrieve suggested colors.", Toasts.Type.FAILURE);
        callback([]);
    });
}

function fetchProfileEffects(callback: (v: any) => void): void {
    RestAPI.get({ url: "/user-profile-effects" })
        .then(res => { callback(res.body.profile_effect_configs); })
        .catch(e => {
            console.error(e);
            showToast("Unable to retrieve the list of profile effects.", Toasts.Type.FAILURE);
        });
}

function updateUserThemeColors(user: UserProfile, primary: number, accent: number): void {
    if (primary > -1) {
        user.themeColors = [primary, accent > -1 ? accent : primary];
        user.premiumType = 2;
    } else if (accent > -1) {
        user.themeColors = [accent, accent];
        user.premiumType = 2;
    }
}

function updateUserEffectID(user: UserProfile, id: bigint): void {
    if (id > -1n) {
        user.profileEffectID = id.toString();
        user.premiumType = 2;
    }
}

function updatePreview(): void {
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
    "Hide 3y3 Builder": {
        description: "Hide the 3y3 Builder in the profiles settings page",
        type: OptionType.BOOLEAN,
        default: false
    }
});

export default definePlugin({
    name: "FakeProfileThemesAndEffects",
    description: "Allows profile theming and the usage of profile effects by hiding the colors and effect ID in your About Me using invisible 3y3 encoded characters",
    authors: [Devs.ryan],
    patches: [
        {
            find: "UserProfileStore",
            replacement: {
                match: /(?<=getUserProfile\(\i\){return )(\i\[\i])/,
                replace: "$self.decodeUserBio3y3Hook($1)"
            }
        },
        {
            find: "DefaultCustomizationSections",
            replacement: {
                match: /\.sectionsContainer,children:\[/,
                replace: "$&$self.add3y3Builder(),"
            }
        },
        {
            find: ".PICK_A_COLOR_FROM_THE_PAGE",
            replacement: {
                match: /\i\.memo\(\i=>/,
                replace: "$self.ColorPicker=$&"
            }
        },
        {
            find: '"Input data is not a valid image."',
            replacement: {
                match: /\.palette\(\)}let \i/,
                replace: "$&=$self.getPaletteForAvatar"
            }
        },
        {
            find: "getComplimentaryPaletteForColor:function()",
            replacement: {
                match: /function \i\(\i\){let \i=arguments\.length.*?}(?=function)/,
                replace: "$self.getComplimentaryPaletteForColor=$&;$&"
            }
        },
        {
            find: '"ProfileCustomizationPreview"',
            replacement: {
                match: /let{[^}]*pendingThemeColors[^}]*pendingProfileEffectID/,
                replace: "$self.profilePreviewHook(arguments[0]);$&"
            }
        }
    ],
    set ColorPicker(e: any) {
        ColorPicker = e;
    },
    set getPaletteForAvatar(f: (v: string) => Promise<RGBColor[]>) {
        getPaletteForAvatar = f;
    },
    set getComplimentaryPaletteForColor(f: (v: RGBColor) => RGBColor[]) {
        getComplimentaryPaletteForColor = f;
    },
    settingsAboutComponent: (): JSX.Element => {
        return (
            <Forms.FormSection>
                <Forms.FormTitle tag={"h3"}>{"Usage"}</Forms.FormTitle>
                <Forms.FormText>
                    {"After enabling this plugin, you will see custom theme colors and effects in the profiles of other people using this plugin."}
                    <div className={Margins.top8}>
                        <b>{"To set your own profile theme colors and effect:"}</b>
                    </div>
                    <ol
                        className={Margins.bottom8}
                        style={{ listStyle: "decimal", paddingLeft: "40px" }}
                    >
                        <li>{"Go to your profile settings"}</li>
                        <li>{"Use the 3y3 Builder to choose your profile theme colors and effect"}</li>
                        <li>{'Click the "Copy 3y3" button'}</li>
                        <li>{"Paste the invisible text anywhere in your About Me"}</li>
                    </ol>
                </Forms.FormText>
            </Forms.FormSection>
        );
    },
    settings,
    decodeUserBio3y3Hook(user: UserProfile | undefined): UserProfile | undefined {
        if (user === undefined) return user;

        if (settings.store.prioritizeNitro) {
            if (user.themeColors !== undefined) {
                if (user.profileEffectID === undefined) {
                    const decoded3y3: [string, string, string] = decode3y3(user.bio);
                    if (base125StrToBase10Color(decoded3y3[0]) === -2)
                        updateUserEffectID(user, base125StrToBase10ItemID(decoded3y3[1]));
                    else
                        updateUserEffectID(user, base125StrToBase10ItemID(decoded3y3[2]));
                }
                return user;
            } else if (user.profileEffectID !== undefined) {
                const decoded3y3: [string, string, string] = decode3y3(user.bio);
                const primaryColor: number = base125StrToBase10Color(decoded3y3[0]);
                if (primaryColor === -2)
                    updateUserThemeColors(user, ...decodeLegacy3y3(decoded3y3[0]));
                else
                    updateUserThemeColors(user, primaryColor, base125StrToBase10Color(decoded3y3[1]));
                return user;
            }
        }

        const decoded3y3: [string, string, string] = decode3y3(user.bio);
        const primaryColor: number = base125StrToBase10Color(decoded3y3[0]);
        if (primaryColor === -2) {
            updateUserThemeColors(user, ...decodeLegacy3y3(decoded3y3[0]));
            updateUserEffectID(user, base125StrToBase10ItemID(decoded3y3[1]));
        } else {
            updateUserThemeColors(user, primaryColor, base125StrToBase10Color(decoded3y3[1]));
            updateUserEffectID(user, base125StrToBase10ItemID(decoded3y3[2]));
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
            if (effectID !== "") {
                props.pendingProfileEffectID = effectID;
                props.canUsePremiumCustomization = true;
            }
        }
    },
    add3y3Builder(): JSX.Element | null {
        if (settings.store["Hide 3y3 Builder"]) return null;

        [primaryColor, setPrimaryColor] = useState(-1);
        [accentColor, setAccentColor] = useState(-1);
        [effectID, setEffectID] = useState("");
        const [effectName, setEffectName] = useState("");
        [preview, setPreview] = useState(true);
        const [buildLegacy3y3, setBuildLegacy3y3] = useState(false);
        const currModal = useRef("");

        useEffect(() => { return () => { closeModal(currModal.current); }; });

        return (
            <>
                <style>{"." + this.name + "TextOverflow{white-space:normal!important;text-overflow:clip!important}"}</style>
                <Text
                    tag={"h3"}
                    variant={"eyebrow"}
                    style={{ display: "inline" }}
                >
                    {"3y3 Builder"}
                </Text>
                <Button
                    look={Button.Looks.LINK}
                    color={Button.Colors.PRIMARY}
                    size={Button.Sizes.TINY}
                    style={{
                        display: primaryColor === -1 && accentColor === -1 && effectID === "" ? "none" : "inline",
                        height: "14px",
                        marginLeft: "4px",
                        minHeight: "0",
                        paddingBottom: "0",
                        paddingTop: "0"
                    }}
                    onClick={() => {
                        setPrimaryColor(-1);
                        setAccentColor(-1);
                        setEffectID("");
                        setEffectName("");
                        if (preview) updatePreview();
                    }}
                >
                    {"Reset"}
                </Button>
                <div
                    className={Margins.bottom8 + " " + Margins.top8}
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)"
                    }}
                >
                    <Button
                        innerClassName={this.name + "TextOverflow"}
                        color={Button.Colors.PRIMARY}
                        style={{
                            borderTopRightRadius: "0",
                            borderBottomRightRadius: "0",
                            paddingLeft: "0",
                            paddingRight: "0"
                        }}
                        onClick={() => {
                            getSuggestedColors((colors: string[]) => {
                                closeModal(currModal.current);
                                currModal.current = openColorPickerModal(
                                    ColorPicker,
                                    (color: number) => {
                                        setPrimaryColor(color);
                                        if (preview) updatePreview();
                                        showToast("3y3 updated!", Toasts.Type.SUCCESS);
                                    },
                                    primaryColor === -1 ? 0 : primaryColor,
                                    colors
                                );
                            });
                        }}
                    >
                        {"Primary: " + (primaryColor === -1 ? "unchanged" : "#" + primaryColor.toString(16).padStart(6, "0"))}
                    </Button>
                    <Button
                        innerClassName={this.name + "TextOverflow"}
                        color={Button.Colors.PRIMARY}
                        style={{
                            borderRadius: "0",
                            paddingLeft: "0",
                            paddingRight: "0"
                        }}
                        onClick={() => {
                            getSuggestedColors((colors: string[]) => {
                                closeModal(currModal.current);
                                currModal.current = openColorPickerModal(
                                    ColorPicker,
                                    (color: number) => {
                                        setAccentColor(color);
                                        if (preview) updatePreview();
                                        showToast("3y3 updated!", Toasts.Type.SUCCESS);
                                    },
                                    accentColor === -1 ? 0 : accentColor,
                                    colors
                                );
                            });
                        }}
                    >
                        {"Accent: " + (accentColor === -1 ? "unchanged" : "#" + accentColor.toString(16).padStart(6, "0"))}
                    </Button>
                    <Button
                        innerClassName={this.name + "TextOverflow"}
                        color={Button.Colors.PRIMARY}
                        style={{
                            borderRadius: "0",
                            paddingLeft: "0",
                            paddingRight: "0"
                        }}
                        onClick={() => {
                            fetchProfileEffects((data: any) => {
                                if (data) {
                                    closeModal(currModal.current);
                                    currModal.current = openProfileEffectModal(
                                        (id: string, name: string) => {
                                            setEffectID(id);
                                            setEffectName(name);
                                            if (preview) updatePreview();
                                            showToast("3y3 updated!", Toasts.Type.SUCCESS);
                                        },
                                        data
                                    );
                                } else
                                    showToast("The retrieved data did not match the expected format.", Toasts.Type.FAILURE);
                            });
                        }}
                    >
                        {"Effect: " + (effectID === "" ? "unchanged" : effectName)}
                    </Button>
                    <Button
                        innerClassName={this.name + "TextOverflow"}
                        color={Button.Colors.PRIMARY}
                        style={{
                            borderTopLeftRadius: "0",
                            borderBottomLeftRadius: "0",
                            paddingLeft: "0",
                            paddingRight: "0"
                        }}
                        onClick={() => {
                            const stringToCopy: string = generate3y3(primaryColor, accentColor, effectID, buildLegacy3y3);
                            if (stringToCopy === "")
                                showToast("3y3 Builder is empty; nothing to copy!");
                            else
                                copyWithToast(stringToCopy, "3y3 copied to clipboard!");
                        }}
                    >
                        {"Copy 3y3"}
                    </Button>
                </div>
                <Forms.FormDivider className={Margins.bottom20 + " " + Margins.top20} />
                <Switch
                    value={preview}
                    onChange={(value: boolean) => {
                        setPreview(value);
                        updatePreview();
                    }}
                >
                    {"3y3 Builder Preview"}
                </Switch>
                <Switch
                    value={buildLegacy3y3}
                    note={"Will use more characters"}
                    onChange={(value: boolean) => { setBuildLegacy3y3(value); }}
                >
                    {"Build backwards compatible 3y3"}
                </Switch>
            </>
        );
    }
});
