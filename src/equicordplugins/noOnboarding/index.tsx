/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { RestAPI } from "@webpack/common";

export default definePlugin({
    name: "NoOnboarding",
    description: "Bypasses Discord's onboarding process for quicker server entry.",
    authors: [EquicordDevs.omaw, Devs.Glitch],
    patches: [
        {
            find: ",acceptInvite(",
            replacement: {
                match: /INVITE_ACCEPT_SUCCESS.+?,(\i)=null!=.+?;/,
                replace: (m, guildId) => `${m}$self.bypassOnboard(${guildId});`
            }
        },
        {
            find: "{joinGuild:",
            replacement: {
                match: /guildId:(\i),lurker:(\i).{0,20}}\)\);/,
                replace: (m, guildId, lurker) => `${m}if(!${lurker})$self.bypassOnboard(${guildId});`
            }
        }
    ],
    bypassOnboard(guild_id: string) {
        RestAPI.get({ url: `/guilds/${guild_id}/onboarding` }).then(res => {
            const data = res.body;
            if (!data?.prompts?.length) return;

            const now = Math.floor(Date.now() / 1000);
            const prompts_seen: Record<string, number> = {};
            const responses_seen: Record<string, number> = {};
            const responses: string[] = [];

            for (const prompt of data.prompts) {
                const options = prompt.options || [];
                if (!options.length) continue;
                prompts_seen[prompt.id] = now;
                for (const opt of options) responses_seen[opt.id] = now;
                responses.push(options[options.length - 1].id);
            }

            const payload = {
                onboarding_responses: responses,
                onboarding_prompts_seen: prompts_seen,
                onboarding_responses_seen: responses_seen,
            };

            RestAPI.post({
                url: `/guilds/${guild_id}/onboarding-responses`,
                body: payload
            }).catch(() => { });
        }).catch(() => { });
    }
});

