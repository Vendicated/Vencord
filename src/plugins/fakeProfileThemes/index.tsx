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
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

// This plugin is a port from Alyxia's Vendetta plugin
import "./index.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { Margins } from "@utils/margins";
import { classes, copyWithToast } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import { Button, ColorPicker, Flex, Forms, React, Text, UserProfileStore, UserStore, useState } from "@webpack/common";
import { User } from "discord-types/general";
import { ReactElement } from "react";
import virtualMerge from "virtual-merge";

interface UserProfile extends User {
    themeColors?: Array<number>;
}

interface Colors {
    primary: number;
    accent: number;
}

function encode(primary: number, accent: number): string {
    const message = `[#${primary.toString(16).padStart(6, "0")},#${accent.toString(16).padStart(6, "0")}]`;
    const padding = "";
    const encoded = Array.from(message)
        .map(x => x.codePointAt(0))
        .filter(x => x! >= 0x20 && x! <= 0x7f)
        .map(x => String.fromCodePoint(x! + 0xe0000))
        .join("");

    return (padding || "") + " " + encoded;
}

// Courtesy of Cynthia.
function decode(bio: string): Array<number> | null {
    if (bio == null) return null;

    const colorString = bio.match(
        /\u{e005b}\u{e0023}([\u{e0061}-\u{e0066}\u{e0041}-\u{e0046}\u{e0030}-\u{e0039}]{1,6})\u{e002c}\u{e0023}([\u{e0061}-\u{e0066}\u{e0041}-\u{e0046}\u{e0030}-\u{e0039}]{1,6})\u{e005d}/u,
    );
    if (colorString != null) {
        const parsed = [...colorString[0]]
            .map(x => String.fromCodePoint(x.codePointAt(0)! - 0xe0000))
            .join("");
        const colors = parsed
            .substring(1, parsed.length - 1)
            .split(",")
            .map(x => parseInt(x.replace("#", "0x"), 16));

        return colors;
    } else {
        return null;
    }
}

const settings = definePluginSettings({
    nitroFirst: {
        description: "Default color source if both are present",
        type: OptionType.SELECT,
        options: [
            { label: "Nitro colors", value: true, default: true },
            { label: "Fake colors", value: false },
        ]
    }
});

interface ColorPickerProps {
    color: number | null;
    label: ReactElement<any>;
    showEyeDropper?: boolean;
    suggestedColors?: string[];
    onChange(value: number | null): void;
}

// I can't be bothered to figure out the semantics of this component. The
// functions surely get some event argument sent to them and they likely aren't
// all required. If anyone who wants to use this component stumbles across this
// code, you'll have to do the research yourself.
interface ProfileModalProps {
    user: User;
    pendingThemeColors: [number, number];
    onAvatarChange: () => void;
    onBannerChange: () => void;
    canUsePremiumCustomization: boolean;
    hideExampleButton: boolean;
    hideFakeActivity: boolean;
    isTryItOutFlow: boolean;
}

const ProfileModal = findComponentByCodeLazy<ProfileModalProps>("isTryItOutFlow:", "pendingThemeColors:", "pendingAvatarDecoration:", "EDIT_PROFILE_BANNER");


export default definePlugin({
    name: "FakeProfileThemes",
    description: "Allows profile theming by hiding the colors in your bio thanks to invisible 3y3 encoding",
    authors: [Devs.Alyxia, Devs.Remty],
    patches: [
        {
            find: "UserProfileStore",
            replacement: {
                match: /(?<=getUserProfile\(\i\){return )(.+?)(?=})/,
                replace: "$self.colorDecodeHook($1)"
            }
        },
        {
            find: "#{intl::USER_SETTINGS_RESET_PROFILE_THEME}",
            replacement: {
                match: /#{intl::USER_SETTINGS_RESET_PROFILE_THEME}\)}\)(?<=color:(\i),.{0,500}?color:(\i),.{0,500}?)/,
                replace: "$&,$self.addCopy3y3Button({primary:$1,accent:$2})"
            }
        }
    ],
    settingsAboutComponent: () => {
        const existingColors = decode(
            UserProfileStore.getUserProfile(UserStore.getCurrentUser().id).bio
        ) ?? [0, 0];
        const [color1, setColor1] = useState(existingColors[0]);
        const [color2, setColor2] = useState(existingColors[1]);

        return (
            <Forms.FormSection>
                <Forms.FormTitle tag="h3">Usage</Forms.FormTitle>
                <Forms.FormText>
                    After enabling this plugin, you will see custom colors in
                    the profiles of other people using compatible plugins.{" "}
                    <br />
                    To set your own colors:
                    <ul>
                        <li>
                            • use the color pickers below to choose your colors
                        </li>
                        <li>• click the "Copy 3y3" button</li>
                        <li>• paste the invisible text anywhere in your bio</li>
                    </ul><br />
                    <Forms.FormDivider
                        className={classes(Margins.top8, Margins.bottom8)}
                    />
                    <Forms.FormTitle tag="h3">Color pickers</Forms.FormTitle>
                    <Flex
                        direction={Flex.Direction.HORIZONTAL}
                        style={{ gap: "1rem" }}
                    >
                        <ColorPicker
                            color={color1}
                            label={
                                <Text
                                    variant={"text-xs/normal"}
                                    style={{ marginTop: "4px" }}
                                >
                                    Primary
                                </Text>
                            }
                            onChange={(color: number) => {
                                setColor1(color);
                            }}
                        />
                        <ColorPicker
                            color={color2}
                            label={
                                <Text
                                    variant={"text-xs/normal"}
                                    style={{ marginTop: "4px" }}
                                >
                                    Accent
                                </Text>
                            }
                            onChange={(color: number) => {
                                setColor2(color);
                            }}
                        />
                        <Button
                            onClick={() => {
                                const colorString = encode(color1, color2);
                                copyWithToast(colorString);
                            }}
                            color={Button.Colors.PRIMARY}
                            size={Button.Sizes.XLARGE}
                        >
                            Copy 3y3
                        </Button>
                    </Flex>
                    <Forms.FormDivider
                        className={classes(Margins.top8, Margins.bottom8)}
                    />
                    <Forms.FormTitle tag="h3">Preview</Forms.FormTitle>
                    <div className="vc-fpt-preview">
                        <ProfileModal
                            user={UserStore.getCurrentUser()}
                            pendingThemeColors={[color1, color2]}
                            onAvatarChange={() => { }}
                            onBannerChange={() => { }}
                            canUsePremiumCustomization={true}
                            hideExampleButton={true}
                            hideFakeActivity={true}
                            isTryItOutFlow={true}
                        />
                    </div>
                </Forms.FormText>
            </Forms.FormSection>);
    },
    settings,
    colorDecodeHook(user: UserProfile) {
        if (user) {
            // don't replace colors if already set with nitro
            if (settings.store.nitroFirst && user.themeColors) return user;
            const colors = decode(user.bio);
            if (colors) {
                return virtualMerge(user, {
                    premiumType: 2,
                    themeColors: colors
                });
            }
        }
        return user;
    },
    addCopy3y3Button: ErrorBoundary.wrap(function ({ primary, accent }: Colors) {
        return <Button
            onClick={() => {
                const colorString = encode(primary, accent);
                copyWithToast(colorString);
            }}
            color={Button.Colors.PRIMARY}
            size={Button.Sizes.XLARGE}
            className={Margins.left16}
        >Copy 3y3
        </Button >;
    }, { noop: true }),
});
