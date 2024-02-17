/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { Button, GuildMemberStore, UserProfileStore, UserStore } from "@webpack/common";

const SummaryItem = findComponentByCodeLazy("borderType", "showBorder", "hideDivider");

let savedNick: string | null = null;
let savedPronouns: string | null = null;
let savedBio: string | undefined = undefined;
let savedThemeColors: number[] | undefined = undefined;
let savedBanner: string | undefined = undefined;
let savedAvatar: string | undefined = undefined;

const { setPendingAvatar, setPendingBanner, setPendingBio, setPendingNickname, setPendingPronouns, setPendingThemeColors }: {
    setPendingAvatar: (a: string | undefined) => void;
    setPendingBanner: (a: string | undefined) => void;
    setPendingBio: (a: string | undefined) => void;
    setPendingNickname: (a: string | null) => void;
    setPendingPronouns: (a: string | null) => void;
    setPendingThemeColors: (a: number[] | undefined) => void;
} = findByPropsLazy("setPendingNickname", "setPendingPronouns");

export default definePlugin({
    name: "ServerProfilesToolbox",
    authors: [Devs.D3SOX],
    description: "Adds a copy/paste/reset button to the server profiles editor",

    patchServerProfiles({ guildId }: { guildId: string }) {
        const currentUser = UserStore.getCurrentUser();
        const premiumType = currentUser.premiumType ?? 0;

        return <SummaryItem title="Server Profiles Toolbox" hideDivider={false} forcedDivider>
            <div style={{ display: "flex", gap: "5px" }}>
                <Button onClick={() => {
                    const profile = UserProfileStore.getGuildMemberProfile(currentUser.id, guildId);
                    const nick = GuildMemberStore.getNick(guildId, currentUser.id);
                    const selfMember = GuildMemberStore.getMember(guildId, currentUser.id);
                    savedNick = nick ?? "";
                    savedPronouns = profile.pronouns;
                    savedBio = profile.bio;
                    savedThemeColors = profile.themeColors;
                    savedBanner = profile.banner;
                    savedAvatar = selfMember.avatar;
                }}>
                    Copy profile
                </Button>
                <Button onClick={() => {
                    // set pending
                    setPendingNickname(savedNick);
                    setPendingPronouns(savedPronouns);
                    if (premiumType === 2) {
                        setPendingBio(savedBio);
                        setPendingThemeColors(savedThemeColors);
                        setPendingBanner(savedBanner);
                        setPendingAvatar(savedAvatar);
                    }
                }}>
                    Paste profile
                </Button>
                <Button onClick={() => {
                    // reset
                    setPendingNickname("");
                    setPendingPronouns("");
                    if (premiumType === 2) {
                        setPendingBio("");
                        setPendingThemeColors([]);
                        setPendingBanner("");
                        setPendingAvatar("");
                    }
                }}>
                    Reset profile
                </Button>
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
