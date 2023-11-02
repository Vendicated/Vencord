/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { Margins } from "@utils/margins";
import { copyWithToast } from "@utils/misc";
import { closeModal, ModalCloseButton, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Button, Forms, showToast, Switch, Text, Toasts, useState } from "@webpack/common";
import { User } from "discord-types/general";

interface UserProfile extends User {
    themeColors: [number, number] | undefined;
    profileEffectID: string | undefined;
}

const pluginName: string = "FakeProfileThemesAndEffects";

function base10NumToBase125Str(base10Num: number): string {
    if (base10Num === 0) return "\u{00001}";
    const base125StrCodePoints: Array<number> = [];
    for (let i: number = base10Num; i > 0; i = Math.trunc(i / 125))
        base125StrCodePoints.unshift(i % 125 + 1);
    return String.fromCodePoint(...base125StrCodePoints);
}

function base10BigIntToBase125Str(base10BigInt: bigint): string {
    if (base10BigInt === 0n) return "\u{00001}";
    const base125StrCodePoints: Array<number> = [];
    for (let i: bigint = base10BigInt; i > 0n; i /= 125n)
        base125StrCodePoints.unshift(Number(i % 125n + 1n));
    return String.fromCodePoint(...base125StrCodePoints);
}

function base125StrToBase10Num(base125Str: string, upperLim: number): number {
    if (base125Str === "") return -1;
    let base10Num: number = 0;
    for (let i: number = 0; i < base125Str.length; i++) {
        if (base10Num > upperLim) return -2;
        base10Num += (base125Str.codePointAt(i)! - 1) * 125 ** (base125Str.length - 1 - i);
    }
    return base10Num;
}

function base125StrToBase10BigInt(base125Str: string, upperLim: bigint): bigint {
    if (base125Str === "") return -1n;
    let base10BigInt: bigint = 0n;
    for (let i: number = 0; i < base125Str.length; i++) {
        if (base10BigInt > upperLim) return -2n;
        base10BigInt += BigInt(base125Str.codePointAt(i)! - 1) * 125n ** BigInt(base125Str.length - 1 - i);
    }
    return base10BigInt;
}

function base125StrToBase10CSSColor(base125Str: string): number {
    return base125StrToBase10Num(base125Str, 16_777_215);
}

function base125StrToBase10ItemID(base125Str: string): bigint {
    return base125StrToBase10BigInt(base125Str, 1_200_000_000_000_000_000n);
}

function encode3y3(str: string): string {
    const encoded3y3StrCodePoints: Array<number> = [];
    for (let i: number = 0; i < str.length; i++)
        encoded3y3StrCodePoints.push(str.codePointAt(i)! + 0xE0000);
    return String.fromCodePoint(...encoded3y3StrCodePoints);
}

// If the given user bio is empty or contains no 3y3 characters, return ["", "", ""];
// otherwise return the first string of 3y3 characters decoded.
function decodeUserBio3y3(userBio: string): [string, string, string] {
    const decodedUserBio3y3: [string, string, string] = ["", "", ""];
    const userBioCodePoints: Array<string> = [...userBio];
    if (userBioCodePoints.length > 0) {
        let tempCodePoints: Array<number> = [];
        let decodedUserBio3y3Index: number = 0;
        for (let i: number = 0; i < userBioCodePoints.length; i++) {
            const currCodePoint: number = userBioCodePoints[i].codePointAt(0)!;
            if (currCodePoint === 0xE007E) {
                if (tempCodePoints.length > 0)
                    decodedUserBio3y3[decodedUserBio3y3Index] = String.fromCodePoint(...tempCodePoints);
                if (decodedUserBio3y3Index > 1) break;
                tempCodePoints = [];
                decodedUserBio3y3Index++;
            } else if (0xE0000 < currCodePoint && currCodePoint < 0xE007E) {
                tempCodePoints.push(currCodePoint - 0xE0000);
                if (i === userBioCodePoints.length - 1)
                    decodedUserBio3y3[decodedUserBio3y3Index] = String.fromCodePoint(...tempCodePoints);
            } else if (decodedUserBio3y3Index > 0) {
                if (tempCodePoints.length > 0)
                    decodedUserBio3y3[decodedUserBio3y3Index] = String.fromCodePoint(...tempCodePoints);
                break;
            }
        }
    }
    return decodedUserBio3y3;
}

function legacyStrToProfileThemeColors(userBio: string): [number, number] {
    const profileThemeColors: [number, number] = [-1, -1];
    let numberSignIndex: number = -1;
    for (let i: number = 0; i < userBio.length; i++) {
        if (userBio[i] === "#") {
            numberSignIndex = i;
            break;
        }
    }
    if (numberSignIndex !== -1) {
        let tempStr: string = "";
        let upperLimit: number = numberSignIndex + 7 < userBio.length ? numberSignIndex + 7 : userBio.length;
        for (let i: number = numberSignIndex + 1; i < upperLimit; i++) {
            if (userBio[i] === "," || userBio[i] === "]") break;
            tempStr += userBio[i];
        }
        let extractedColor: number = parseInt(tempStr, 16);
        if (!Number.isNaN(extractedColor)) {
            profileThemeColors[0] = extractedColor;
            numberSignIndex = -1;
            for (let i: number = upperLimit; i < userBio.length; i++) {
                if (userBio[i] === "#") {
                    numberSignIndex = i;
                    break;
                }
            }
            if (numberSignIndex !== -1) {
                tempStr = "";
                upperLimit = numberSignIndex + 7 < userBio.length ? numberSignIndex + 7 : userBio.length;
                for (let i: number = numberSignIndex + 1; i < upperLimit; i++) {
                    if (userBio[i] === "]" || userBio[i] === ",") break;
                    tempStr += userBio[i];
                }
                extractedColor = parseInt(tempStr, 16);
                if (!Number.isNaN(extractedColor))
                    profileThemeColors[1] = extractedColor;
            }
        }
    }
    return profileThemeColors;
}

function legacy3y3(user: UserProfile, legacyStr: string): void {
    const profileThemeColors: [number, number] = legacyStrToProfileThemeColors(legacyStr);
    if (profileThemeColors[0] > -1) {
        if (profileThemeColors[1] > -1)
            user.themeColors = [profileThemeColors[0], profileThemeColors[1]];
        else
            user.themeColors = [profileThemeColors[0], profileThemeColors[0]];
        user.premiumType = 2;
    } else if (profileThemeColors[1] > -1) {
        user.themeColors = [profileThemeColors[1], profileThemeColors[1]];
        user.premiumType = 2;
    }
}

function updateUserThemeColors(user: UserProfile, primary: number, accent: number): void {
    if (primary > -1) {
        if (accent > -1)
            user.themeColors = [primary, accent];
        else
            user.themeColors = [primary, primary];
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

function openProfileThemeColorPicker(colorType: "Primary" | "Accent"): void {
    const profileThemeColorPickerContainer: HTMLDivElement | null = document
        .querySelector("#" + pluginName + "ProfileTheme" + colorType + "ColorPickerContainer");
    if (profileThemeColorPickerContainer !== null) {
        const profileThemeColorPicker: HTMLDivElement | null = profileThemeColorPickerContainer
            .querySelector('[class*="swatch__"]');
        if (profileThemeColorPicker !== null) {
            profileThemeColorPicker.scrollIntoView();
            profileThemeColorPicker.click();
            return;
        }
    }
    showToast("Cannot find the Profile Theme " + colorType + " Color picker.", Toasts.Type.FAILURE);
}

function ProfileEffectsModal({ props, profileEffects, onClose }: { props: ModalProps, profileEffects: any, onClose: () => void }): JSX.Element {
    const [selected, setSelected]: [number, (v: number) => void] = useState(-1);
    return (
        <ModalRoot {...props} size={ModalSize.MEDIUM}>
            <ModalHeader>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        width: "100%"
                    }}
                >
                    <Text style={{fontSize: "20px"}}>
                        {"Add Profile Effect"}
                    </Text>
                    <ModalCloseButton onClick={onClose} />
                </div>
            </ModalHeader>
            <div
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "center"
                }}
            >
                {profileEffects.map((e, i): JSX.Element =>
                    <div
                        style={{
                            background: "top / cover url(" + e.thumbnailPreviewSrc + "), top / cover url(/assets/f328a6f8209d4f1f5022.png)",
                            borderRadius: "4px",
                            boxShadow: i === selected ? "inset 0 0 0 2px var(--brand-experiment-500, #5865f2)" : "none",
                            cursor: "pointer",
                            margin: "6px",
                            width: "80px",
                            height: "80px"
                        }}
                        onClick={(): void => {setSelected(i)}}
                    />
                )}
            </div>
            <ModalFooter>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        width: "100%"
                    }}
                >
                    <Text>
                        {selected === -1 ? "" : profileEffects[selected].title}
                    </Text>
                    <Button
                        color={Button.Colors.PRIMARY}
                        size={Button.Sizes.MEDIUM}
                        onClick={(): void => {
                            if (selected !== -1) {
                                _3y3BuilderVals[2] = profileEffects[selected].id;
                                set3y3BuilderEffectName(profileEffects[selected].title);
                                showToast("3y3 updated!", Toasts.Type.SUCCESS);
                            } else
                                showToast("No effect selected!", Toasts.Type.MESSAGE);
                        }}
                    >
                        {"Update 3y3"}
                    </Button>
                </div>
            </ModalFooter>
        </ModalRoot>
    );
}

const _3y3BuilderVals: [number, number, string] = [-1, -1, ""];
let _3y3BuilderProfileEffectName: string = "";
let set3y3BuilderPrimaryColor: (v: number) => void = (v: number): void => {};
let set3y3BuilderAccentColor: (v: number) => void = (v: number): void => {};
let set3y3BuilderEffectName: (v: string) => void = (v: string): void => {};

const settings = definePluginSettings({
    prioritizeNitro: {
        description: "Source to use if profile theme colors / effects are set on both Nitro and About Me",
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
    name: pluginName,
    description: "Allows profile theming and the usage of profile effects by hiding the colors and effect ID in your About Me using invisible 3y3 encoded characters",
    authors: [
        {
            name: "ryan",
            id: 479403382994632704n
        }
    ],
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
                match: /(?<=\.sectionsContainer,children:)\[/,
                replace: "$&$self.add3y3Builder(),"
            }
        },
        {
            find: ".USER_SETTINGS_PROFILE_THEME_PRIMARY",
            replacement: [
                {
                    match: /(?<=[{,]className:\i\.sparkleContainer),(?=.{0,500}?\.USER_SETTINGS_PROFILE_THEME_PRIMARY[,}])/,
                    replace: '$&id:"' + pluginName + 'ProfileThemePrimaryColorPickerContainer",'
                },
                {
                    match: /(?<=[{,]className:\i\.sparkleContainer),(?=.{0,500}?\.USER_SETTINGS_PROFILE_THEME_ACCENT[,}])/,
                    replace: '$&id:"' + pluginName + 'ProfileThemeAccentColorPickerContainer",'
                },
                {
                    match: /(?<=[{,]color:(\i),.{0,500}?[{,]color:(\i),.{0,500}?\.USER_SETTINGS_RESET_PROFILE_THEME[,}])\)/,
                    replace: "$&,$self.addUpdate3y3BuilderProfileThemeColorsButton($1, $2)"
                }
            ]
        }
    ],
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
                        style={{listStyle: "decimal", paddingLeft: "40px"}}
                    >
                        <li>{"Go to your profile settings"}</li>
                        <li>{"Use the 3y3 Builder to choose your profile theme colors and effect"}</li>
                        <li>{'Click the "Copy 3y3" button'}</li>
                        <li>{"Paste the invisible text anywhere in your About Me"}</li>
                    </ol>
                    <b>{"Please note:"}</b>
                    {" if you are using a theme which hides Nitro ads, you may have to disable it temporarily to set profile theme colors and effects."}
                </Forms.FormText>
            </Forms.FormSection>
        );
    },
    settings,
    decodeUserBio3y3Hook(user: UserProfile | undefined): UserProfile | undefined {
        if (user !== undefined) {
            if (settings.store.prioritizeNitro === true) {
                if (user.themeColors !== undefined) {
                    if (user.profileEffectID === undefined) {
                        const decodedUserBio3y3: [string, string, string] = decodeUserBio3y3(user.bio);
                        if (base125StrToBase10CSSColor(decodedUserBio3y3[0]) === -2)
                            updateUserEffectID(user, base125StrToBase10ItemID(decodedUserBio3y3[1]));
                        else
                            updateUserEffectID(user, base125StrToBase10ItemID(decodedUserBio3y3[2]));
                    }
                    return user;
                } else if(user.profileEffectID !== undefined) {
                    const decodedUserBio3y3: [string, string, string] = decodeUserBio3y3(user.bio);
                    const profileThemePrimaryColor: number = base125StrToBase10CSSColor(decodedUserBio3y3[0]);
                    if (profileThemePrimaryColor === -2)
                        legacy3y3(user, decodedUserBio3y3[0]);
                    else
                        updateUserThemeColors(user, profileThemePrimaryColor, base125StrToBase10CSSColor(decodedUserBio3y3[1]));
                    return user;
                }
            }
            const decodedUserBio3y3: [string, string, string] = decodeUserBio3y3(user.bio);
            const profileThemePrimaryColor: number = base125StrToBase10CSSColor(decodedUserBio3y3[0]);
            if (profileThemePrimaryColor === -2) {
                legacy3y3(user, decodedUserBio3y3[0]);
                updateUserEffectID(user, base125StrToBase10ItemID(decodedUserBio3y3[1]));
            } else {
                updateUserThemeColors(user, profileThemePrimaryColor, base125StrToBase10CSSColor(decodedUserBio3y3[1]));
                updateUserEffectID(user, base125StrToBase10ItemID(decodedUserBio3y3[2]));
            }
        }
        return user;
    },
    add3y3Builder(): JSX.Element {
        if (settings.store["Hide 3y3 Builder"] === true) return <></>;
        const [shouldBuildLegacyStr, setShouldBuildLegacyStr] = useState(false);
        [_3y3BuilderVals[0], set3y3BuilderPrimaryColor] = useState(_3y3BuilderVals[0]);
        [_3y3BuilderVals[1], set3y3BuilderAccentColor] = useState(_3y3BuilderVals[1]);
        [_3y3BuilderProfileEffectName, set3y3BuilderEffectName] = useState(_3y3BuilderProfileEffectName);
        return (
            <>
                <Text
                    tag={"h3"}
                    variant={"eyebrow"}
                    style={{display: "inline"}}
                >
                    {"3y3 Builder"}
                </Text>
                <Button
                    look={Button.Looks.LINK}
                    color={Button.Colors.PRIMARY}
                    size={Button.Sizes.TINY}
                    style={{
                        display: _3y3BuilderVals[0] === -1 && _3y3BuilderVals[1] === -1 && _3y3BuilderVals[2] === ""
                            ? "none" : "inline",
                        height: "14px",
                        marginLeft: "4px",
                        minHeight: "0",
                        paddingBottom: "0",
                        paddingTop: "0"
                    }}
                    onClick={(): void => {
                        set3y3BuilderPrimaryColor(-1);
                        set3y3BuilderAccentColor(-1);
                        set3y3BuilderEffectName(_3y3BuilderVals[2] = "");
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
                        innerClassName={pluginName + "TextOverflow"}
                        color={Button.Colors.PRIMARY}
                        style={{
                            borderTopRightRadius: "0",
                            borderBottomRightRadius: "0",
                            paddingLeft: "0",
                            paddingRight: "0"
                        }}
                        onClick={(): void => {openProfileThemeColorPicker("Primary")}}
                    >
                        {"Primary: " + (_3y3BuilderVals[0] === -1 ? "unchanged" : "#" + _3y3BuilderVals[0].toString(16).padStart(6, "0"))}
                    </Button>
                    <Button
                        innerClassName={pluginName + "TextOverflow"}
                        color={Button.Colors.PRIMARY}
                        style={{
                            borderRadius: "0",
                            paddingLeft: "0",
                            paddingRight: "0"
                        }}
                        onClick={(): void => {openProfileThemeColorPicker("Accent")}}
                    >
                        {"Accent: " + (_3y3BuilderVals[1] === -1 ? "unchanged" : "#" + _3y3BuilderVals[1].toString(16).padStart(6, "0"))}
                    </Button>
                    <Button
                        innerClassName={pluginName + "TextOverflow"}
                        color={Button.Colors.PRIMARY}
                        style={{
                            borderRadius: "0",
                            paddingLeft: "0",
                            paddingRight: "0"
                        }}
                        onClick={(): void => {
                            fetch("/api/v9/user-profile-effects", { mode:"same-origin", cache: "only-if-cached" })
                                .then((response: Response): Promise<string> | null => {
                                    if (response.ok === true)
                                        return response.text();
                                    showToast("Unable to retrieve the list of profile effects (" + response.status + ").", Toasts.Type.FAILURE);
                                    return null;
                                })
                                .then((data: string | null): void => {
                                    if (data !== null) {
                                        let profileEffects: any = null;
                                        try {
                                            profileEffects = JSON.parse(data);
                                        } catch (e) {
                                            console.error(e);
                                        }
                                        if (profileEffects !== null && profileEffects.profile_effect_configs) {
                                            const key = openModal(props =>
                                                <ProfileEffectsModal
                                                    props={props}
                                                    profileEffects={profileEffects.profile_effect_configs}
                                                    onClose={(): void => {closeModal(key)}}
                                                />
                                            );
                                        } else
                                            showToast("The retrieved data did not match the expected format.", Toasts.Type.FAILURE);
                                    }
                                });
                        }}
                    >
                        {"Effect: " + (_3y3BuilderVals[2] === "" ? "unchanged" : _3y3BuilderProfileEffectName)}
                    </Button>
                    <Button
                        innerClassName={pluginName + "TextOverflow"}
                        color={Button.Colors.PRIMARY}
                        style={{
                            borderTopLeftRadius: "0",
                            borderBottomLeftRadius: "0",
                            paddingLeft: "0",
                            paddingRight: "0"
                        }}
                        onClick={(): void => {
                            let stringToCopy: string = "";
                            if (shouldBuildLegacyStr === true) {
                                if (_3y3BuilderVals[0] !== -1) {
                                    if (_3y3BuilderVals[1] !== -1)
                                        stringToCopy = encode3y3("[#" + _3y3BuilderVals[0].toString(16) + ",#" + _3y3BuilderVals[1].toString(16) + "]");
                                    else
                                        stringToCopy = encode3y3("[#" + _3y3BuilderVals[0].toString(16) + ",#" + _3y3BuilderVals[0].toString(16) + "]");
                                    if (_3y3BuilderVals[2] !== "")
                                        stringToCopy += "\u{e007e}" + encode3y3(base10BigIntToBase125Str(BigInt(_3y3BuilderVals[2])));
                                } else if (_3y3BuilderVals[1] !== -1) {
                                    stringToCopy = encode3y3("[#" + _3y3BuilderVals[1].toString(16) + ",#" + _3y3BuilderVals[1].toString(16) + "]");
                                    if (_3y3BuilderVals[2] !== "")
                                        stringToCopy += "\u{e007e}" + encode3y3(base10BigIntToBase125Str(BigInt(_3y3BuilderVals[2])));
                                } else if (_3y3BuilderVals[2] !== "")
                                    stringToCopy = "\u{e007e}\u{e007e}" + encode3y3(base10BigIntToBase125Str(BigInt(_3y3BuilderVals[2])));
                            } else if (_3y3BuilderVals[0] !== -1) {
                                if(_3y3BuilderVals[1] !== -1 && _3y3BuilderVals[0] !== _3y3BuilderVals[1]) {
                                    if (_3y3BuilderVals[2] !== "") {
                                        stringToCopy = encode3y3(base10NumToBase125Str(_3y3BuilderVals[0]))
                                            + "\u{e007e}"
                                            + encode3y3(base10NumToBase125Str(_3y3BuilderVals[1]))
                                            + "\u{e007e}"
                                            + encode3y3(base10BigIntToBase125Str(BigInt(_3y3BuilderVals[2])));
                                    } else {
                                        stringToCopy = encode3y3(base10NumToBase125Str(_3y3BuilderVals[0]))
                                            + "\u{e007e}"
                                            + encode3y3(base10NumToBase125Str(_3y3BuilderVals[1]));
                                    }
                                } else if(_3y3BuilderVals[2] !== "") {
                                    stringToCopy = encode3y3(base10NumToBase125Str(_3y3BuilderVals[0]))
                                        + "\u{e007e}\u{e007e}"
                                        + encode3y3(base10BigIntToBase125Str(BigInt(_3y3BuilderVals[2])));
                                } else
                                    stringToCopy = encode3y3(base10NumToBase125Str(_3y3BuilderVals[0]));
                            } else if(_3y3BuilderVals[1] !== -1) {
                                if (_3y3BuilderVals[2] !== "") {
                                    stringToCopy = encode3y3(base10NumToBase125Str(_3y3BuilderVals[1]))
                                        + "\u{e007e}\u{e007e}"
                                        + encode3y3(base10BigIntToBase125Str(BigInt(_3y3BuilderVals[2])));
                                } else
                                    stringToCopy = encode3y3(base10NumToBase125Str(_3y3BuilderVals[1]));
                            } else if (_3y3BuilderVals[2] !== "") {
                                stringToCopy = "\u{e007e}\u{e007e}"
                                    + encode3y3(base10BigIntToBase125Str(BigInt(_3y3BuilderVals[2])));
                            }
                            if (stringToCopy === "")
                                showToast("3y3 Builder is empty; nothing to copy!");
                            else
                                copyWithToast(stringToCopy, "3y3 copied to clipboard!");
                        }}
                    >
                        {"Copy 3y3"}
                    </Button>
                </div>
                <Switch
                    value={shouldBuildLegacyStr}
                    note={"Will use more characters"}
                    onChange={(value: boolean): void => {
                        setShouldBuildLegacyStr(value);
                    }}
                >
                    {"Build backwards compatible 3y3"}
                </Switch>
            </>
        );
    },
    addUpdate3y3BuilderProfileThemeColorsButton(profileThemePrimaryColor: number, profileThemeAccentColor: number): JSX.Element {
        if (settings.store["Hide 3y3 Builder"] === true) return <></>;
        return (
            <Button
                color={Button.Colors.PRIMARY}
                size={Button.Sizes.XLARGE}
                className={Margins.left16}
                onClick={(): void => {
                    set3y3BuilderPrimaryColor(profileThemePrimaryColor);
                    set3y3BuilderAccentColor(profileThemeAccentColor);
                    showToast("3y3 updated!", Toasts.Type.SUCCESS);
                }}
            >
                {"Update 3y3"}
            </Button>
        );
    },
    start(): void {
        document.documentElement.appendChild(Object.assign(
            document.createElement("style"),
            { textContent: "." + pluginName + "TextOverflow{white-space:normal!important;text-overflow:clip!important}" }
        ));
    }
});
