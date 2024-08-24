/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Nullish, OptionalTuple } from "../internal";
import type { GuildMemberProfile } from "./GuildMemberProfile";
import type { ProfileBadge, ProfileThemeColors, UserProfile } from "./UserProfile";

export declare class DisplayProfile<
    FetchFailed extends boolean = boolean,
    Guild extends boolean = boolean
> {
    constructor(
        userProfile: UserProfile<FetchFailed>,
        ...guildMemberProfile: Guild extends true
            ? [guildMemberProfile: GuildMemberProfile]
            : [guildMemberProfile?: Nullish]
    );

    get application(): UserProfile["application"];
    get canEditThemes(): boolean;
    get canUsePremiumProfileCustomization(): boolean;
    getBadges(): ProfileBadge[];
    getBannerURL(options: {
        canAnimate?: boolean | undefined /* = false */;
        size: number;
    }): string | undefined;
    getLegacyUsername(): UserProfile<FetchFailed>["legacyUsername"];
    getPreviewBanner(
        pendingBanner?: string | Nullish,
        canAnimate?: boolean | undefined,
        size?: number | undefined /* = 480 */
    ): string | Nullish;
    getPreviewBio(pendingBio?: string | Nullish): Guild | false extends infer GuildValue
        ? GuildValue extends true
            ? { isUsingGuildValue: true; value: string; }
            : { isUsingGuildValue: false; value: string | undefined; }
        : never;
    getPreviewThemeColors(
        pendingThemeColors?: OptionalTuple<ProfileThemeColors, Nullish> | Nullish
    ): UserProfile["themeColors"];
    hasFullProfile(): boolean;
    hasPremiumCustomization(): boolean;
    hasThemeColors(): boolean;
    isUsingGuildMemberBanner(): Guild | false;
    isUsingGuildMemberBio(): Guild | false;
    isUsingGuildMemberPronouns(): Guild | false;
    get premiumGuildSince(): UserProfile<FetchFailed>["premiumGuildSince"];
    get premiumSince(): UserProfile<FetchFailed>["premiumSince"];
    get premiumType(): UserProfile<FetchFailed>["premiumType"];
    get primaryColor(): UserProfile["accentColor"];

    _guildMemberProfile: Guild extends true ? GuildMemberProfile : Nullish;
    _userProfile: UserProfile<FetchFailed>;
    accentColor: UserProfile<FetchFailed>["accentColor"];
    banner: UserProfile["banner"];
    bio: UserProfile["bio"];
    guildId: Guild extends true ? string : undefined;
    /** @todo Does not seem to be implemented. */
    popoutAnimationParticleType: UserProfile["popoutAnimationParticleType"];
    profileEffectExpiresAt: UserProfile["profileEffectExpiresAt"];
    profileEffectId: UserProfile<FetchFailed>["profileEffectId"];
    pronouns: UserProfile<FetchFailed>["pronouns"];
    themeColors: UserProfile["themeColors"];
    userId: UserProfile<FetchFailed>["userId"];
}
