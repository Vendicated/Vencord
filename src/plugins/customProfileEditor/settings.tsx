import { definePluginSettings } from "@api/Settings";
import { openModal } from "@utils/modal";
import { OptionType } from "@utils/types";
import { Button } from "@webpack/common";

import { CustomProfileModal } from "./components/CustomProfileModal";
import type { BoostTier, NitroTier } from "./badges";
import type { CustomBadgeDefinition } from "./customBadges";
import {
    DEFAULT_PROFILE_THEME_ACCENT,
    DEFAULT_PROFILE_THEME_PRIMARY,
} from "./profileTheme";

export interface CustomProfileData {
    customUsername: string;
    customDisplayName: string;
    selectedBadges: string[];
    selectedSpecialBadges: string[];
    nitroTier: NitroTier;
    giftTier: string[];
    boostTier: BoostTier;
    avatarDecoration: string;
    /** When true, avatarDecoration replaces your real decoration locally (empty = none) */
    avatarDecorationOverride: boolean;
    replaceRealBadges: boolean;
    /** YYYY-MM-DD, empty = use real account creation date */
    customAccountCreationDate: string;
    customProfilePicture: string;
    simulateNitro: boolean;
    customBanner: string;
    customBio: string;
    customPronouns: string;
    useProfileTheme: boolean;
    profileThemePrimary: number;
    profileThemeAccent: number;
    customBadges: CustomBadgeDefinition[];
}

export const DEFAULT_PROFILE: CustomProfileData = {
    customUsername: "",
    customDisplayName: "",
    selectedBadges: [],
    selectedSpecialBadges: [],
    nitroTier: "none",
    giftTier: [],
    boostTier: "none",
    avatarDecoration: "",
    avatarDecorationOverride: false,
    replaceRealBadges: false,
    customAccountCreationDate: "",
    customProfilePicture: "",
    simulateNitro: false,
    customBanner: "",
    customBio: "",
    customPronouns: "",
    useProfileTheme: false,
    profileThemePrimary: DEFAULT_PROFILE_THEME_PRIMARY,
    profileThemeAccent: DEFAULT_PROFILE_THEME_ACCENT,
    customBadges: [],
};

export const settings = definePluginSettings({
    profileJson: {
        type: OptionType.STRING,
        description: "Internal profile data storage",
        default: JSON.stringify(DEFAULT_PROFILE),
        hidden: true,
    },
    openEditor: {
        type: OptionType.COMPONENT,
        component: () => (
            <Button
                onClick={() =>
                    openModal((props) => (
                        <CustomProfileModal modalProps={props} />
                    ))
                }
            >
                Open Custom Profile Editor
            </Button>
        ),
    },
});

export function getProfile(): CustomProfileData {
    try {
        const parsed = JSON.parse(settings.store.profileJson);
        return {
            ...DEFAULT_PROFILE,
            ...parsed,
            customBadges: Array.isArray(parsed.customBadges)
                ? parsed.customBadges
                : [],
        };
    } catch {
        return { ...DEFAULT_PROFILE };
    }
}

export function setProfile(data: Partial<CustomProfileData>) {
    settings.store.profileJson = JSON.stringify({ ...getProfile(), ...data });
}

export function resetProfile() {
    settings.store.profileJson = JSON.stringify(DEFAULT_PROFILE);
}

export function openEditor() {
    openModal((props) => <CustomProfileModal modalProps={props} />);
}
