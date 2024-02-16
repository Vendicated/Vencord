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

let savedNick = "";
let savedPronouns = "";

const { setPendingNickname, setPendingPronouns }: {
    setPendingNickname: (a: string | null) => void;
    setPendingPronouns: (a: string) => void;
} = findByPropsLazy("setPendingNickname");

export default definePlugin({
    name: "ServerProfilesToolbox",
    authors: [Devs.D3SOX],
    description: "Adds a copy/paste/reset button to the server profiles editor",

    patchServerProfiles(args: { guildId: string }) {
        return <SummaryItem title="Server Profiles Toolbox" hideDivider={false} forcedDivider>
            <div style={{ display: "flex", gap: "5px" }}>
                <Button onClick={() => {
                    const currentUser = UserStore.getCurrentUser();
                    const profile = UserProfileStore.getGuildMemberProfile(currentUser.id, args.guildId);
                    const nick = GuildMemberStore.getNick(args.guildId, currentUser.id);
                    savedNick = nick ?? "";
                    savedPronouns = profile.pronouns;
                }}>
                    Copy profile
                </Button>
                <Button onClick={() => {
                    // set pending
                    setPendingNickname(savedNick);
                    setPendingPronouns(savedPronouns);
                }}>
                    Paste profile
                </Button>
                <Button onClick={() => {
                    // reset
                    setPendingNickname("");
                    setPendingPronouns("");
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
