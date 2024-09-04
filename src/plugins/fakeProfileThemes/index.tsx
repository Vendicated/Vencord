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
import { useAwaiter } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { type GuildRecord, PremiumType, type ProfileThemeColors, type UserProfile, type UserRecord } from "@vencord/discord-types";
import { extractAndLoadChunksLazy, findComponentByCodeLazy } from "@webpack";
import { Button, Flex, Forms, Text, UserProfileStore, UserStore, useState } from "@webpack/common";
import type { ReactNode } from "react";

function encode(primary: number, accent: number) {
    // Decode only requires each color to have at least one character,
    // so the colors can be left unpadded, saving About Me space.
    let encoded = "";
    for (const char of `[#${primary.toString(16)},#${accent.toString(16)}]`)
        encoded += String.fromCodePoint(char.codePointAt(0)! + 0xE0000);

    return encoded;
}

// Courtesy of Cynthia.
function decode(bio: string): ProfileThemeColors | null {
    // /[#([0-9A-Fa-f]{1,6}),#([0-9A-Fa-f]{1,6})]/u
    const match = bio.match(/\u{E005B}\u{E0023}([\u{E0030}-\u{E0039}\u{E0041}-\u{E0046}\u{E0061}-\u{E0066}]{1,6})\u{E002C}\u{E0023}([\u{E0030}-\u{E0039}\u{E0041}-\u{E0046}\u{E0061}-\u{E0066}]{1,6})\u{E005D}/u);

    if (!match) return null;

    const [, primary, accent] = match;

    let decodedPrimary = "";
    for (const char of primary!)
        decodedPrimary += String.fromCodePoint(char.codePointAt(0)! - 0xE0000);

    let decodedAccent = "";
    for (const char of accent!)
        decodedAccent += String.fromCodePoint(char.codePointAt(0)! - 0xE0000);

    return [parseInt(decodedPrimary, 16), parseInt(decodedAccent, 16)];
}

interface ColorSwatchProps {
    color?: string | number | null | undefined;
    colorPickerFooter?: ReactNode;
    colorPickerMiddle?: ReactNode;
    disabled?: boolean | undefined /* = false */;
    label?: ReactNode;
    onChange: (color: number) => void;
    onClose?: (() => void) | undefined;
    showEyeDropper?: boolean | undefined /* = false */;
    suggestedColors?: string[] | null | undefined;
}

const ColorSwatch = findComponentByCodeLazy<ColorSwatchProps>(".Messages.USER_SETTINGS_PROFILE_COLOR_SELECT_COLOR", ".BACKGROUND_PRIMARY)");
const requireColorSwatch = extractAndLoadChunksLazy(["USER_SETTINGS_PROFILE_COLOR_DEFAULT_BUTTON.format"], /createPromise:\(\)=>\i\.\i(\("?.+?"?\)).then\(\i\.bind\(\i,"?(.+?)"?\)\)/);

// I can't be bothered to figure out the semantics of this component. The
// functions surely get some event argument sent to them and they likely aren't
// all required. If anyone who wants to use this component stumbles across this
// code, you'll have to do the research yourself.
interface ProfileCustomizationPreviewProps {
    avatarClassName?: string | undefined;
    canUsePremiumCustomization?: boolean | undefined /* = false */;
    disabledInputs?: boolean | undefined /* = false */;
    guild?: GuildRecord | null | undefined;
    hideBioSection?: boolean | undefined /* = false */;
    hideCustomStatus?: boolean | undefined /* = false */;
    hideExampleButton?: boolean | undefined /* = false */;
    hideMessageInput?: boolean | undefined /* = false */;
    isTryItOutFlow?: boolean | undefined /* = false */;
    onUpsellClick?: ((analyticsLocation: { object: /* AnalyticsObjects */ string; }) => void) | null | undefined;
    pendingAvatar?: string | null | undefined;
    pendingAvatarDecoration?: string | null | undefined;
    pendingBanner?: string | null | undefined;
    pendingBio?: string | null | undefined;
    pendingGlobalName?: string | null | undefined;
    pendingNickname?: string | null | undefined;
    pendingProfileEffectId?: string | null | undefined;
    pendingPronouns?: string | null | undefined;
    pendingThemeColors?: [primaryColor?: number | null, accentColor?: number | null] | null | undefined;
    user: UserRecord;
}

const ProfileCustomizationPreview = findComponentByCodeLazy<ProfileCustomizationPreviewProps>("isTryItOutFlow:", "pendingThemeColors:", "pendingAvatarDecoration:", "EDIT_PROFILE_BANNER");

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
            find: ".USER_SETTINGS_RESET_PROFILE_THEME",
            replacement: {
                match: /RESET_PROFILE_THEME}\)(?<=color:(\i),.{0,500}?color:(\i),.{0,500}?)/,
                replace: "$&,$self.addCopy3y3Button({primary:$1,accent:$2})"
            }
        }
    ],
    settingsAboutComponent: () => {
        const existingColors = decode(
            UserProfileStore.getUserProfile(UserStore.getCurrentUser()!.id)!.bio
        ) ?? [0, 0];
        const [primary, setPrimary] = useState(existingColors[0]);
        const [accent, setAccent] = useState(existingColors[1]);

        const [, , loadingColorPickerChunk] = useAwaiter(requireColorSwatch);

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
                    {!loadingColorPickerChunk && (
                        <Flex
                            direction={Flex.Direction.HORIZONTAL}
                            style={{ gap: "1rem" }}
                        >
                            <ColorSwatch
                                color={primary}
                                label={
                                    <Text
                                        variant="text-xs/normal"
                                        style={{ marginTop: "4px" }}
                                    >
                                        Primary
                                    </Text>
                                }
                                onChange={setPrimary}
                            />
                            <ColorSwatch
                                color={accent}
                                label={
                                    <Text
                                        variant="text-xs/normal"
                                        style={{ marginTop: "4px" }}
                                    >
                                        Accent
                                    </Text>
                                }
                                onChange={setAccent}
                            />
                            <Button
                                onClick={() => {
                                    copyWithToast(encode(primary, accent));
                                }}
                                color={Button.Colors.PRIMARY}
                                size={Button.Sizes.XLARGE}
                            >
                                Copy 3y3
                            </Button>
                        </Flex>
                    )}
                    <Forms.FormDivider
                        className={classes(Margins.top8, Margins.bottom8)}
                    />
                    <Forms.FormTitle tag="h3">Preview</Forms.FormTitle>
                    <div className="vc-fpt-preview">
                        <ProfileCustomizationPreview
                            user={UserStore.getCurrentUser()!}
                            pendingThemeColors={[primary, accent]}
                            canUsePremiumCustomization={true}
                            hideExampleButton={true}
                            isTryItOutFlow={true}
                        />
                    </div>
                </Forms.FormText>
            </Forms.FormSection>
        );
    },
    settings,
    colorDecodeHook(profile?: UserProfile) {
        if (profile) {
            // don't replace colors if already set with nitro
            if (settings.store.nitroFirst && profile.themeColors) return profile;

            const colors = decode(profile.bio);
            if (colors) {
                profile.premiumType = PremiumType.TIER_2;
                profile.themeColors = colors;
            }
        }
        return profile;
    },
    addCopy3y3Button: ErrorBoundary.wrap(({ primary, accent }: { primary: number; accent: number; }) => (
        <Button
            onClick={() => {
                copyWithToast(encode(primary, accent));
            }}
            color={Button.Colors.PRIMARY}
            size={Button.Sizes.XLARGE}
            className={Margins.left16}
        >
            Copy 3y3
        </Button>
    ), { noop: true }),
});
