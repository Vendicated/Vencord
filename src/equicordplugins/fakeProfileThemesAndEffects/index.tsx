/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, Settings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import { canonicalizeMatch, canonicalizeReplace } from "@utils/patches";
import definePlugin, { OptionType } from "@utils/types";
import { showToast, Toasts, useMemo } from "@webpack/common";

import { Builder, type BuilderProps, setProfileEffectModal, settingsAboutComponent } from "./components";
import { ProfileEffectRecord, ProfileEffectStore } from "./lib/profileEffects";
import { profilePreviewHook } from "./lib/profilePreview";
import { decodeAboutMeFPTEHook } from "./lib/userProfile";

function replaceHelper(
    string: string,
    replaceArgs: readonly (readonly [searchRegExp: RegExp, replaceString: string])[]
) {
    let result = string;
    for (const [searchRegExp, replaceString] of replaceArgs) {
        const beforeReplace = result;
        result = result.replace(
            canonicalizeMatch(searchRegExp),
            canonicalizeReplace(replaceString, 'Vencord.Plugins.plugins["FakeProfileThemesAndEffects"]')
        );
        if (beforeReplace === result)
            throw new Error("Replace had no effect: " + searchRegExp);
    }
    return result;
}

export const settings = definePluginSettings({
    prioritizeNitro: {
        description: "Source to prioritize",
        type: OptionType.SELECT,
        options: [
            { label: "Nitro", value: true },
            { label: "About Me", value: false, default: true }
        ]
    },
    hideBuilder: {
        description: "Hide the FPTE Builder in the User Profile and Server Profiles settings pages",
        type: OptionType.BOOLEAN,
        default: false
    }
});

export default definePlugin({
    name: "FakeProfileThemesAndEffects",
    description: "Allows profile theming and the usage of profile effects by hiding the colors and effect ID in your About Me using invisible, zero-width characters",
    authors: [EquicordDevs.ryan],
    patches: [
        // Patches UserProfileStore.getUserProfile
        {
            find: '"UserProfileStore"',
            replacement: {
                match: /([{}]getUserProfile\([^)]*\){return) ?([^}]+)/,
                replace: "$1 $self.decodeAboutMeFPTEHook($2)"
            }
        },
        // Patches ProfileCustomizationPreview
        {
            find: ".EDIT_PROFILE_BANNER})",
            replacement: {
                match: /function \i\((\i)\){/,
                replace: "$&$self.profilePreviewHook($1);"
            }
        },
        // Adds the FPTE Builder to the User Profile settings page
        {
            find: "DefaultCustomizationSections",
            replacement: {
                match: /\.sectionsContainer,.*?children:\[/,
                replace: "$&$self.addFPTEBuilder(),"
            }
        },
        // Adds the FPTE Builder to the Server Profiles settings page
        {
            find: '"guild should not be null"',
            replacement: {
                match: /\.sectionsContainer,.*?children:\[(?=.+?[{,]guild:(\i))/,
                replace: "$&$self.addFPTEBuilder($1),"
            }
        },
        // ProfileEffectModal
        {
            find: "initialSelectedProfileEffectId:",
            group: true,
            replacement: [
                // Modal root
                {
                    match: /(function (\i)\([^)]*\){(?:.(?!function |}$))*className:\i\.modal,(?:.(?!function |}$))*}).*(?=})/,
                    replace: (match, func, funcName) => `${match}(()=>{$self.ProfileEffectModal=${funcName};`
                        + replaceHelper(func, [
                            // Required for the profile preview to show profile effects
                            [
                                /(?<=[{,]purchases:.+?}=).+?(?=,\i=|,{\i:|;)/,
                                "{isFetching:!1,categories:new Map,purchases:$self.usePurchases()}"
                            ]
                        ])
                        + "})()"
                },
                // Modal content
                {
                    match: /(function \i\([^)]*\){(?:.(?!function ))*\.modalContent,(?:.(?!function ))*}).*(?=}\))/,
                    replace: (match, func) => match + replaceHelper(func, [
                        // Required to show the apply button
                        [
                            /(?<=[{,]purchase:.+?}=).+?(?=,\i=|,{\i:|;)/,
                            "{purchase:{purchasedAt:new Date}}"
                        ],
                        // Replaces the profile effect list with the modified version
                        [
                            /(?<=\.jsxs?\)\()[^,]+(?=,{(?:(?:.(?!\.jsxs?\)))+,)?onSelect:)/,
                            "$self.ProfileEffectSelection"
                        ],
                        // Replaces the apply profile effect function with the modified version
                        [
                            /(?<=[{,]onApply:).*?\)\((\i).*?(?=,\i:|}\))/,
                            "()=>$self.onApply($1)"
                        ],
                        // Required to show the apply button
                        [
                            /(?<=[{,]canUseCollectibles:).+?(?=,\i:|}\))/,
                            "!0"
                        ],
                        // Required to enable the apply button
                        [
                            /(?<=[{,]disableApplyButton:).+?(?=,\i:|}\))/,
                            "!1"
                        ]
                    ])
                }
            ]
        },
        // ProfileEffectSelection
        {
            find: ".presetEffectBackground",
            replacement: {
                match: /function\(\i,\i,.*?=>(\i).+[,;}]\1=([^=].+?})(?=;|}$).*(?=}$)/,
                replace: (match, _, func) => `${match};$self.ProfileEffectSelection=`
                    + replaceHelper(func, [
                        // Removes the "Exclusive to Nitro" and "Preview The Shop" sections
                        // Adds every profile effect to the "Your Decorations" section and removes the "Shop" button
                        [
                            /(?<=[ ,](\i)=).+?(?=(?:,\i=|,{\i:|;).+?:\1\.map\()/,
                            "$self.useProfileEffectSections($&)"
                        ]
                    ])
            }
        },
        // Patches ProfileEffectPreview
        {
            find: "#{intl::COLLECTIBLES_GIFT_LABEL}",
            replacement: {
                // Add back removed "forProfileEffectModal" property
                match: /(?<=[{,])(?=pendingProfileEffectId:)/,
                replace: "forProfileEffectModal:!0,"
            }
        }
    ],

    start: () => {
        const { FakeProfileThemesAndEffects, FakeProfileThemes } = Settings.plugins;
        if (FakeProfileThemes.enabled && FakeProfileThemesAndEffects.enabled) {
            FakeProfileThemes.enabled = false;
            showToast("Disabled FakeProfileThemes as FakeProfileThemesAndEffects is enabled", Toasts.Type.SUCCESS);
        }
    },

    addFPTEBuilder: (guild?: BuilderProps["guild"]) => settings.store.hideBuilder ? null : <Builder guild={guild} />,

    onApply(_effectId?: string) { },
    set ProfileEffectModal(comp: Parameters<typeof setProfileEffectModal>[0]) {
        setProfileEffectModal(props => {
            this.onApply = effectId => {
                props.onApply(effectId ? ProfileEffectStore.getProfileEffectById(effectId)!.config : null);
                props.onClose();
            };
            return comp(props);
        });
    },

    ProfileEffectSelection: () => null,

    usePurchases: () => useMemo(() => {
        return new Map(
            ProfileEffectStore.getAllProfileEffects().map(effect => [
                effect.id,
                { items: new ProfileEffectRecord(effect) }
            ])
        );
    }, [ProfileEffectStore.getAllProfileEffects()]),

    useProfileEffectSections: (origSections: Record<string, any>[]) => useMemo(
        () => {
            origSections.splice(1);
            origSections[0].items.splice(1);
            for (const effect of ProfileEffectStore.getAllProfileEffects())
                origSections[0].items.push(new ProfileEffectRecord(effect));
            return origSections;
        },
        [ProfileEffectStore.getAllProfileEffects()]
    ),

    settings,
    settingsAboutComponent,
    decodeAboutMeFPTEHook,
    profilePreviewHook
});
