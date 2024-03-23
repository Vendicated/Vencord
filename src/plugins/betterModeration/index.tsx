/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import "./style.css";

import { sendBotMessage } from "@api/Commands";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import { Embed, GuildMember,Message } from "discord-types/general";

import { AutoModRule } from "./automod";
import { ExportButton,renderTestTextHeader, TestInputBoxComponent } from "./UI";

const logger = new Logger("betterModeration");


let currentBanList: Array<GuildMember> | null = null;
let currentGuildId: string | null = null;
let currentRules: Array<AutoModRule> | null = null;

interface EMessage extends Message {
    echoed: boolean;
}

interface IMessageCreate {
    type: "MESSAGE_CREATE";
    optimistic: boolean;
    isPushNotification: boolean;
    channelId: string;
    message: EMessage;
}

interface IGUILD_SETTINGS_LOADED_BANS_BATCH {
    type: "GUILD_SETTINGS_LOADED_BANS_BATCH";
    bans: Array<GuildMember>;
    guildId: string;
}

export default definePlugin({
    name: "better moderation (Beta)",
    authors: [
        {
            name: "__iamme__",
            id: 984392761929256980n
        }
    ],
    description: "echo automod logs in the automoded channel and test your automod rules, able to export bans as json",
    patches: [
        {
            find: ".default.searchGuildBans",
            replacement: [
                {
                    match: /\.searchButton,children:\i\.default\.Messages\.SEARCH\}\)/,
                    replace: "$&, $self.renderExportButton()"
                }
            ],
        },
        {
            find: ".categoryContainer,children:[",
            replacement: [{
                match: /\.categoryContainer,children:\[/,
                replace: "$&$self.renderTestTextHeader(), $self.renderInputBox(),"
            }]
        },
        {
            find: "Endpoints.GUILD_AUTOMOD_RULES(e)});",
            replacement: [
                {
                    match: /return (Array.isArray\(\i\.body\)\?\i\.body\.map\(\i\):\[\])/,
                    replace: "let the_rules = $1;$self.setRules(the_rules);return the_rules"
                }
            ]
        },
        {
            find: "saveRule:async(",
            replacement: [
                {
                    match: /return (\i)=(\(0,\i\.isBackendPersistedRule\)\((\i)\)&&!\(0,\i\.isDefaultRuleId\)\(\i\.id\))/,
                    replace: "$1=$2; $self.saveOrUpdateRule($1,$3); return $1"
                }
            ]
        }
    ],
    saveOrUpdateRule: async (type: boolean, rule: AutoModRule) => {
        if (!currentRules) return;
        logger.info((type ? "Updated" : "Created") + " a Rule", rule);
        currentRules = currentRules.filter(r => r.id !== rule.id);
        currentRules.push(rule);
    },
    setRules: (rules: Array<AutoModRule>) => {
        logger.info("loading Rules", rules);
        currentRules = rules;
    },
    renderInputBox: () => { return <TestInputBoxComponent currentRules={currentRules} />; },
    renderTestTextHeader: renderTestTextHeader,
    renderExportButton: () => { return <ExportButton currentGuildId={currentGuildId} currentBanList={currentBanList} />; },
    flux: {
        async GUILD_SETTINGS_LOADED_BANS_BATCH({ type, bans, guildId }: IGUILD_SETTINGS_LOADED_BANS_BATCH) {
            if (type !== "GUILD_SETTINGS_LOADED_BANS_BATCH") return;
            currentBanList = bans;
            currentGuildId = guildId;
        },
        async MESSAGE_CREATE({ optimistic, type, message, channelId }: IMessageCreate) {
            if (optimistic || type !== "MESSAGE_CREATE") return;
            if (message.state === "SENDING") return;
            if (message?.echoed) return;
            if (message.type !== 24) return; // message type is automod embed
            message.embeds.forEach((embed: Embed) => {
                if (embed.type !== "auto_moderation_message") { return; }
                embed.fields.forEach((field: { name: string, value: string; }) => {
                    if (field.name !== "channel_id") { return; }
                    message.echoed = true;
                    message.flags = 1 << 6; // ephemeral
                    message.author.bot = false; // making sure the bot badge don't show up
                    sendBotMessage(field.value, message);
                });
            });
        }
    }
});
