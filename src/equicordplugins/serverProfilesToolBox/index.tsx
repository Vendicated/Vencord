/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import {
    Button,
    Clipboard,
    GuildMemberStore,
    Text,
    Toasts,
    UserProfileStore,
    UserStore
} from "@webpack/common";
import { GuildMember } from "discord-types/general";

const SummaryItem = findComponentByCodeLazy("borderType", "showBorder", "hideDivider");

interface SavedProfile {
    nick: string | null;
    pronouns: string | null;
    bio: string | null;
    themeColors: number[] | undefined;
    banner: string | undefined;
    avatar: string | undefined;
    profileEffectId: string | undefined;
    avatarDecoration: string | undefined;
}

const savedProfile: SavedProfile = {
    nick: null,
    pronouns: null,
    bio: null,
    themeColors: undefined,
    banner: undefined,
    avatar: undefined,
    profileEffectId: undefined,
    avatarDecoration: undefined,
};

const {
    setPendingAvatar,
    setPendingBanner,
    setPendingBio,
    setPendingNickname,
    setPendingPronouns,
    setPendingThemeColors,
    setPendingProfileEffectId,
    setPendingAvatarDecoration,
}: {
    setPendingAvatar: (a: string | undefined) => void;
    setPendingBanner: (a: string | undefined) => void;
    setPendingBio: (a: string | null) => void;
    setPendingNickname: (a: string | null) => void;
    setPendingPronouns: (a: string | null) => void;
    setPendingThemeColors: (a: number[] | undefined) => void;
    setPendingProfileEffectId: (a: string | undefined) => void;
    setPendingAvatarDecoration: (a: string | undefined) => void;
} = findByPropsLazy("setPendingNickname", "setPendingPronouns");

export default definePlugin({
    name: "ServerProfilesToolbox",
    authors: [Devs.D3SOX],
    description: "Adds a copy/paste/reset button to the server profiles editor",

    patchServerProfiles({ guildId }: { guildId: string; }) {
        const currentUser = UserStore.getCurrentUser();
        const premiumType = currentUser.premiumType ?? 0;

        const copy = () => {
            const profile = UserProfileStore.getGuildMemberProfile(currentUser.id, guildId);
            const nick = GuildMemberStore.getNick(guildId, currentUser.id);
            const selfMember = GuildMemberStore.getMember(guildId, currentUser.id) as GuildMember & { avatarDecoration: string | undefined; };
            savedProfile.nick = nick ?? "";
            savedProfile.pronouns = profile.pronouns;
            savedProfile.bio = profile.bio;
            savedProfile.themeColors = profile.themeColors;
            savedProfile.banner = profile.banner;
            savedProfile.avatar = selfMember.avatar;
            savedProfile.profileEffectId = profile.profileEffectId;
            savedProfile.avatarDecoration = selfMember.avatarDecoration;
        };

        const paste = () => {
            setPendingNickname(savedProfile.nick);
            setPendingPronouns(savedProfile.pronouns);
            if (premiumType === 2) {
                setPendingBio(savedProfile.bio);
                setPendingThemeColors(savedProfile.themeColors);
                setPendingBanner(savedProfile.banner);
                setPendingAvatar(savedProfile.avatar);
                setPendingProfileEffectId(savedProfile.profileEffectId);
                setPendingAvatarDecoration(savedProfile.avatarDecoration);
            }
        };

        const reset = () => {
            setPendingNickname(null);
            setPendingPronouns("");
            if (premiumType === 2) {
                setPendingBio(null);
                setPendingThemeColors([]);
                setPendingBanner(undefined);
                setPendingAvatar(undefined);
                setPendingProfileEffectId(undefined);
                setPendingAvatarDecoration(undefined);
            }
        };

        const copyToClipboard = () => {
            copy();
            Clipboard.copy(JSON.stringify(savedProfile));
        };

        const pasteFromClipboard = async () => {
            try {
                const clip = await navigator.clipboard.readText();
                if (!clip) {
                    Toasts.show({
                        message: "Clipboard is empty",
                        type: Toasts.Type.FAILURE,
                        id: Toasts.genId(),
                    });
                    return;
                }
                const clipboardProfile: SavedProfile = JSON.parse(clip);

                if (!("nick" in clipboardProfile)) {
                    Toasts.show({
                        message: "Data is not in correct format",
                        type: Toasts.Type.FAILURE,
                        id: Toasts.genId(),
                    });
                    return;
                }

                Object.assign(savedProfile, JSON.parse(clip));
                paste();
            } catch (e) {
                Toasts.show({
                    message: `Failed to read clipboard data: ${e}`,
                    type: Toasts.Type.FAILURE,
                    id: Toasts.genId(),
                });
            }
        };

        return <SummaryItem title="Server Profiles Toolbox" hideDivider={false} forcedDivider>
            <div style={{ display: "flex", alignItems: "center", flexDirection: "column", gap: "5px" }}>
                <Text variant="text-md/normal">
                    Use the following buttons to mange the currently selected server
                </Text>
                <div style={{ display: "flex", gap: "5px" }}>
                    <Button onClick={copy}>
                        Copy profile
                    </Button>
                    <Button onClick={paste}>
                        Paste profile
                    </Button>
                    <Button onClick={reset}>
                        Reset profile
                    </Button>
                </div>
                <div style={{ display: "flex", gap: "5px" }}>
                    <Button onClick={copyToClipboard}>
                        Copy to clipboard
                    </Button>
                    <Button onClick={pasteFromClipboard}>
                        Paste from clipboard
                    </Button>
                </div>
            </div>
        </SummaryItem>;
    },

    patches: [
        {
            find: ".PROFILE_CUSTOMIZATION_GUILD_SELECT_TITLE",
            replacement: {
                match: /return\(0(.{10,350})\}\)\}\)\}/,
                replace: "return [(0$1})}),$self.patchServerProfiles(e)]}"
            }
        }
    ],

});
