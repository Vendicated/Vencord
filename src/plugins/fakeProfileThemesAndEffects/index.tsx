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
import { Button, Forms, showToast, Slider, Switch, Text, Toasts, useState } from "@webpack/common";
import { openColorPickerModal } from "./components/ColorPickerModal";
import { openProfileEffectModal } from "./components/ProfileEffectModal";
import { User } from "discord-types/general";

interface UserProfile extends User {
    themeColors: [number, number] | undefined;
    profileEffectID: string | undefined;
}

function base10NumToBase125Str(base10: number): string {
    if (base10 === 0) return "\u{00001}";
    const base125CPs: Array<number> = [];
    for (let i: number = base10; i > 0; i = Math.trunc(i / 125))
        base125CPs.unshift(i % 125 + 1);
    return String.fromCodePoint(...base125CPs);
}

function base10BigIntToBase125Str(base10: bigint): string {
    if (base10 === 0n) return "\u{00001}";
    const base125CPs: Array<number> = [];
    for (let i: bigint = base10; i > 0n; i /= 125n)
        base125CPs.unshift(Number(i % 125n + 1n));
    return String.fromCodePoint(...base125CPs);
}

function base125StrToBase10Num(str: string, lim: number): number {
    if (str === "") return -1;
    let base10: number = 0;
    for (let i: number = 0; i < str.length; i++) {
        if (base10 > lim) return -2;
        base10 += (str.codePointAt(i)! - 1) * 125 ** (str.length - 1 - i);
    }
    return base10;
}

function base125StrToBase10BigInt(str: string, lim: bigint): bigint {
    if (str === "") return -1n;
    let base10: bigint = 0n;
    for (let i: number = 0; i < str.length; i++) {
        if (base10 > lim) return -2n;
        base10 += BigInt(str.codePointAt(i)! - 1) * 125n ** BigInt(str.length - 1 - i);
    }
    return base10;
}

function base125StrToBase10CSSColor(str: string): number {
    return base125StrToBase10Num(str, 16_777_215);
}

function base125StrToBase10ItemID(str: string): bigint {
    return base125StrToBase10BigInt(str, 1_200_000_000_000_000_000n);
}

function encode3y3(str: string): string {
    const encodedCPs: Array<number> = [];
    for (let i: number = 0; i < str.length; i++)
        encodedCPs.push(str.codePointAt(i)! + 0xE0000);
    return String.fromCodePoint(...encodedCPs);
}

// If the given user bio is empty or contains no 3y3 characters, return ["", "", ""];
// otherwise return the first string of 3y3 characters decoded.
function decode3y3(bio: string): [string, string, string] {
    const decoded3y3: [string, string, string] = ["", "", ""];
    const bioCPs: Array<string> = [...bio];
    if (bioCPs.length > 0) {
        let tempCPs: Array<number> = [];
        let i: number = 0;
        for (let j: number = 0; j < bioCPs.length; j++) {
            const currCP: number = bioCPs[j].codePointAt(0)!;
            if (currCP === 0xE007E) {
                if (tempCPs.length > 0)
                    decoded3y3[i] = String.fromCodePoint(...tempCPs);
                if (i > 1) break;
                tempCPs = [];
                i++;
            } else if (0xE0000 < currCP && currCP < 0xE007E) {
                tempCPs.push(currCP - 0xE0000);
                if (j === bioCPs.length - 1)
                    decoded3y3[i] = String.fromCodePoint(...tempCPs);
            } else if (i > 0) {
                if (tempCPs.length > 0)
                    decoded3y3[i] = String.fromCodePoint(...tempCPs);
                break;
            }
        }
    }
    return decoded3y3;
}

function legacyStrToThemeColors(bio: string): [number, number] {
    const themeColors: [number, number] = [-1, -1];
    let numSignIndex: number = -1;
    for (let i: number = 0; i < bio.length; i++) {
        if (bio[i] === "#") {
            numSignIndex = i;
            break;
        }
    }
    if (numSignIndex !== -1) {
        let tempStr: string = "";
        let lim: number = numSignIndex + 7 < bio.length ? numSignIndex + 7 : bio.length;
        for (let i: number = numSignIndex + 1; i < lim; i++) {
            if (bio[i] === "," || bio[i] === "]") break;
            tempStr += bio[i];
        }
        let color: number = parseInt(tempStr, 16);
        if (!Number.isNaN(color)) {
            themeColors[0] = color;
            numSignIndex = -1;
            for (let i: number = lim; i < bio.length; i++) {
                if (bio[i] === "#") {
                    numSignIndex = i;
                    break;
                }
            }
            if (numSignIndex !== -1) {
                tempStr = "";
                lim = numSignIndex + 7 < bio.length ? numSignIndex + 7 : bio.length;
                for (let i: number = numSignIndex + 1; i < lim; i++) {
                    if (bio[i] === "]" || bio[i] === ",") break;
                    tempStr += bio[i];
                }
                color = parseInt(tempStr, 16);
                if (!Number.isNaN(color))
                    themeColors[1] = color;
            }
        }
    }
    return themeColors;
}

function legacy3y3(user: UserProfile, str: string): void {
    const themeColors: [number, number] = legacyStrToThemeColors(str);
    if (themeColors[0] > -1) {
        if (themeColors[1] > -1)
            user.themeColors = [themeColors[0], themeColors[1]];
        else
            user.themeColors = [themeColors[0], themeColors[0]];
        user.premiumType = 2;
    } else if (themeColors[1] > -1) {
        user.themeColors = [themeColors[1], themeColors[1]];
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
                        const decoded3y3: [string, string, string] = decode3y3(user.bio);
                        if (base125StrToBase10CSSColor(decoded3y3[0]) === -2)
                            updateUserEffectID(user, base125StrToBase10ItemID(decoded3y3[1]));
                        else
                            updateUserEffectID(user, base125StrToBase10ItemID(decoded3y3[2]));
                    }
                    return user;
                } else if(user.profileEffectID !== undefined) {
                    const decoded3y3: [string, string, string] = decode3y3(user.bio);
                    const primaryColor: number = base125StrToBase10CSSColor(decoded3y3[0]);
                    if (primaryColor === -2)
                        legacy3y3(user, decoded3y3[0]);
                    else
                        updateUserThemeColors(user, primaryColor, base125StrToBase10CSSColor(decoded3y3[1]));
                    return user;
                }
            }
            const decoded3y3: [string, string, string] = decode3y3(user.bio);
            const primaryColor: number = base125StrToBase10CSSColor(decoded3y3[0]);
            if (primaryColor === -2) {
                legacy3y3(user, decoded3y3[0]);
                updateUserEffectID(user, base125StrToBase10ItemID(decoded3y3[1]));
            } else {
                updateUserThemeColors(user, primaryColor, base125StrToBase10CSSColor(decoded3y3[1]));
                updateUserEffectID(user, base125StrToBase10ItemID(decoded3y3[2]));
            }
        }
        return user;
    },
    add3y3Builder(): JSX.Element {
        if (settings.store["Hide 3y3 Builder"] === true) return <></>;

        const [primaryColor, setPrimaryColor]: [number, (v: number) => void] = useState(-1);
        const [accentColor, setAccentColor]: [number, (v: number) => void] = useState(-1);
        const [effectID, setEffectID]: [string, (v: string) => void] = useState("");
        const [effectName, setEffectName]: [string, (v: string) => void] = useState("");
        const [buildLegacy3y3, setBuildLegacy3y3]: [boolean, (v: boolean) => void] = useState(false);

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
                        display: primaryColor === -1 && accentColor === -1 && effectID === "" ? "none" : "inline",
                        height: "14px",
                        marginLeft: "4px",
                        minHeight: "0",
                        paddingBottom: "0",
                        paddingTop: "0"
                    }}
                    onClick={(): void => {
                        setPrimaryColor(-1);
                        setAccentColor(-1);
                        setEffectID("");
                        setEffectName("");
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
                        onClick={(): void => {
                            openColorPickerModal(
                                (color: number): void => {
                                    setPrimaryColor(color);
                                    showToast("3y3 updated!", Toasts.Type.SUCCESS);
                                },
                                primaryColor === -1 ? 0 : primaryColor
                            );
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
                        onClick={(): void => {
                            openColorPickerModal(
                                (color: number): void => {
                                    setAccentColor(color);
                                    showToast("3y3 updated!", Toasts.Type.SUCCESS);
                                },
                                accentColor === -1 ? 0 : accentColor
                            );
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
                                            openProfileEffectModal(
                                                (id: string, name: string): void => {
                                                    setEffectID(id);
                                                    setEffectName(name);
                                                    showToast("3y3 updated!", Toasts.Type.SUCCESS);
                                                },
                                                profileEffects.profile_effect_configs
                                            );
                                        } else
                                            showToast("The retrieved data did not match the expected format.", Toasts.Type.FAILURE);
                                    }
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
                        onClick={(): void => {
                            let stringToCopy: string = "";
                            if (buildLegacy3y3 === true) {
                                if (primaryColor !== -1) {
                                    if (accentColor !== -1)
                                        stringToCopy = encode3y3("[#" + primaryColor.toString(16) + ",#" + accentColor.toString(16) + "]");
                                    else
                                        stringToCopy = encode3y3("[#" + primaryColor.toString(16) + ",#" + primaryColor.toString(16) + "]");
                                    if (effectID !== "")
                                        stringToCopy += "\u{e007e}" + encode3y3(base10BigIntToBase125Str(BigInt(effectID)));
                                } else if (accentColor !== -1) {
                                    stringToCopy = encode3y3("[#" + accentColor.toString(16) + ",#" + accentColor.toString(16) + "]");
                                    if (effectID !== "")
                                        stringToCopy += "\u{e007e}" + encode3y3(base10BigIntToBase125Str(BigInt(effectID)));
                                } else if (effectID !== "")
                                    stringToCopy = "\u{e007e}\u{e007e}" + encode3y3(base10BigIntToBase125Str(BigInt(effectID)));
                            } else if (primaryColor !== -1) {
                                if(accentColor !== -1 && primaryColor !== accentColor) {
                                    if (effectID !== "") {
                                        stringToCopy = encode3y3(base10NumToBase125Str(primaryColor))
                                            + "\u{e007e}"
                                            + encode3y3(base10NumToBase125Str(accentColor))
                                            + "\u{e007e}"
                                            + encode3y3(base10BigIntToBase125Str(BigInt(effectID)));
                                    } else {
                                        stringToCopy = encode3y3(base10NumToBase125Str(primaryColor))
                                            + "\u{e007e}"
                                            + encode3y3(base10NumToBase125Str(accentColor));
                                    }
                                } else if(effectID !== "") {
                                    stringToCopy = encode3y3(base10NumToBase125Str(primaryColor))
                                        + "\u{e007e}\u{e007e}"
                                        + encode3y3(base10BigIntToBase125Str(BigInt(effectID)));
                                } else
                                    stringToCopy = encode3y3(base10NumToBase125Str(primaryColor));
                            } else if(accentColor !== -1) {
                                if (effectID !== "") {
                                    stringToCopy = encode3y3(base10NumToBase125Str(accentColor))
                                        + "\u{e007e}\u{e007e}"
                                        + encode3y3(base10BigIntToBase125Str(BigInt(effectID)));
                                } else
                                    stringToCopy = encode3y3(base10NumToBase125Str(accentColor));
                            } else if (effectID !== "") {
                                stringToCopy = "\u{e007e}\u{e007e}"
                                    + encode3y3(base10BigIntToBase125Str(BigInt(effectID)));
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
                    value={buildLegacy3y3}
                    note={"Will use more characters"}
                    onChange={(value: boolean): void => {setBuildLegacy3y3(value)}}
                >
                    {"Build backwards compatible 3y3"}
                </Switch>
            </>
        );
    },
    start(): void {
        document.documentElement.appendChild(Object.assign(
            document.createElement("style"),
            { textContent: "." + this.name + "TextOverflow{white-space:normal!important;text-overflow:clip!important}" }
        ));
    }
});
