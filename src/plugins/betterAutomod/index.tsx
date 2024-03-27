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
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { Embed, Message } from "discord-types/general";

import { AutoModRule } from "./automod";
import { renderTestTextHeader, settingsAboutComponent,TestInputBoxComponent } from "./UI";

const logger = new Logger("betterModeration");


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


const settings = definePluginSettings({
    testBox: {
        type: OptionType.BOOLEAN,
        description: "enable Automod Test box",
        default: true,
        restartNeeded: true
    },
    echoIt: {
        type: OptionType.BOOLEAN,
        description: "echo Automod embed",
        default: true
    }
});

export default definePlugin({
    name: "betterAutomod",
    authors: [Devs.iamme],
    description: "echo automod logs in the automoded channel and be able test your automod rules",
    settings: settings,
    settingsAboutComponent: settingsAboutComponent,
    patches: [
        {
            find: ".Messages.GUILD_SETTINGS_AUTOMOD_MESSAGE_FILTER_DESCRIPTION",
            replacement: [
                {
                    match: /\.textBadge.+?}\),/,
                    replace: "$&$self.renderTestTextHeader(), $self.renderInputBox(),"
                }
            ],
            predicate: () => settings.store.testBox
        },
        {
            find: "Endpoints.GUILD_AUTOMOD_RULES(e)});",
            replacement: [
                {
                    match: /return (Array.isArray\(\i\.body\)\?\i\.body\.map\(\i\):\[\])/,
                    replace: "let the_rules = $1;$self.setRules(the_rules);return the_rules"
                }
            ],
            predicate: () => settings.store.testBox
        },
        {
            find: "saveRule:async(",
            replacement: [
                {
                    match: /return (\i)=(\(0,\i\.isBackendPersistedRule\)\((\i)\)&&!\(0,\i\.isDefaultRuleId\)\(\i\.id\))/,
                    replace: "$1=$2;$self.saveOrUpdateAutomodRule($1,$3);return $1=$1"
                }
            ],
            predicate: () => settings.store.testBox
        },
        {
            find: ".deleteAutomodRule",
            replacement: [
                {
                    match: /\i\((\i.id),(\i.guildId)\)/,
                    replace: "$&,$self.deleteAutomodRule($1,$2)"
                }
            ],
            predicate: () => settings.store.testBox
        }
    ],
    deleteAutomodRule: async (ruleid: string, guildId: string) => {
        if (!currentRules) return;
        logger.info("Deleted a Rule", ruleid);
        currentRules = currentRules.filter(r => r.id !== ruleid);
    },
    saveOrUpdateAutomodRule: async (type: boolean, rule: AutoModRule) => {
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
    flux: {
        async MESSAGE_CREATE({ optimistic, type, message, channelId }: IMessageCreate) {
            if (!settings.store.echoIt) return;
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
