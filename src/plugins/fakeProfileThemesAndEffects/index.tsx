/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { canonicalizeMatch, canonicalizeReplace } from "@utils/patches";
import definePlugin, { OptionType } from "@utils/types";
import { useMemo } from "@webpack/common";

import { Builder, type BuilderProps, setProfileEffectModal, settingsAboutComponent } from "./components";
import { ProfileEffectRecord, ProfileEffectStore } from "./lib/profileEffects";
import { profilePreviewHook } from "./lib/profilePreview";
import { decodeAboutMeFPTEHook } from "./lib/userProfile";

function replaceHelper(string: string, replaceArgs: [searchRegExp: RegExp, replaceString: string][]) {
    let result = string;
    replaceArgs.forEach(([searchRegExp, replaceString]) => {
        const beforeReplace = result;
        result = result.replace(
            canonicalizeMatch(searchRegExp),
            canonicalizeReplace(replaceString, "FakeProfileThemesAndEffects")
        );
        if (beforeReplace === result)
            throw new Error("Replace had no effect: " + searchRegExp);
    });
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
    authors: [Devs.ryan],
    patches: [
        // Patches UserProfileStore.getUserProfile
        {
            find: '"UserProfileStore"',
            replacement: {
                match: /(?<=getUserProfile\(\i\){return )\i\[\i](?=})/,
                replace: "$self.decodeAboutMeFPTEHook($&)"
            }
        },
        // Patches ProfileCustomizationPreview
        {
            find: '"ProfileCustomizationPreview"',
            replacement: {
                match: /(?:var|let|const){(?=(?:[^}]+,)?pendingThemeColors:)(?:[^}]+,)?pendingProfileEffectId:[^}]+}=(\i)/,
                replace: "$self.profilePreviewHook($1);$&"
            }
        },
        // Adds the FPTE Builder to the User Profile settings page
        {
            find: '"DefaultCustomizationSections"',
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
            find: "initialSelectedProfileEffectId",
            replacement: [
                // Modal root
                {
                    match: /(function (\i)\([^)]*\){(?:.(?!function |}$))*\.ModalRoot,(?:.(?!function |}$))*}).*(?=}$)/,
                    replace: (match, func, funcName) => `${match}{$self.ProfileEffectModal=${funcName};`
                        + replaceHelper(func, [
                            // Required for the profile preview to show profile effects
                            [
                                /(?<=[{,]purchases:.+?}=).+?(?=,\i=|,{\i:|;)/,
                                "{isFetching:!1,categories:new Map,purchases:$self.getPurchases()}"
                            ]
                        ])
                        + "}"
                },
                // Modal content
                {
                    match: /(function \i\([^)]*\){(?:.(?!function ))*\.ModalContent,(?:.(?!function ))*}).*(?=}}$)/,
                    replace: (match, func) => match + replaceHelper(func, [
                        // Required to show the apply button
                        [
                            /(?<=[{,]purchase:.+?}=).+?(?=,\i=|,{\i:|;)/,
                            "{purchase:{purchasedAt:new Date}}"
                        ],
                        // Replaces the profile effect list with the modified version
                        [
                            /(?<=\.jsxs?\)\()[^,]+(?=,{(?:(?:.(?!\.jsxs?\)))+,)?onSelect:)/,
                            "$self.ProfileEffectModalList"
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
            ],
            group: true
        },
        // ProfileEffectModalList
        {
            find: "selectedProfileEffectRef",
            replacement: {
                match: /function\(\i,(\i),.+[,;}]\1\.\i=([^=].+?})(?=;|}$).*(?=}$)/,
                replace: (match, _, func) => `${match};$self.ProfileEffectModalList=`
                    + replaceHelper(func, [
                        // Removes the "Exclusive to Nitro" and "Preview The Shop" sections
                        // Adds every profile effect to the "Your Decorations" section and removes the "Shop" button
                        [
                            /(?<=[ ,](\i)=).+?(?=(?:,\i=|,{\i:|;).+?:\1\.map\()/,
                            "$self.getListSections($&)"
                        ]
                    ])
            }
        }
    ],

    addFPTEBuilder: (guild?: BuilderProps["guild"]) => settings.store.hideBuilder ? null : <Builder guild={guild} />,

    onApply(_effectId: string | undefined) {},
    set ProfileEffectModal(comp: Parameters<typeof setProfileEffectModal>[0]) {
        setProfileEffectModal(props => {
            this.onApply = effectId => {
                props.onApply(effectId ? ProfileEffectStore.getProfileEffectById(effectId)!.config : null);
                props.onClose();
            };
            return comp(props);
        });
    },

    ProfileEffectModalList: () => null,

    getPurchases: () => useMemo(
        () => new Map(ProfileEffectStore.profileEffects.map(effect => [
            effect.id,
            { items: new ProfileEffectRecord(effect) }
        ])),
        [ProfileEffectStore.profileEffects]
    ),

    getListSections: (origSections: Record<string, any>[]) => useMemo(
        () => {
            origSections.splice(1);
            origSections[0].items.splice(1);
            ProfileEffectStore.profileEffects.forEach(effect => {
                origSections[0].items.push(new ProfileEffectRecord(effect));
            });
            return origSections;
        },
        [ProfileEffectStore.profileEffects]
    ),

    settingsAboutComponent,
    settings,
    decodeAboutMeFPTEHook,
    profilePreviewHook
});
