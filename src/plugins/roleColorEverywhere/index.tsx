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

import "./roleColorEverywhere.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { makeRange } from "@components/PluginSettings/components";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByCodeLazy, findComponentByCodeLazy } from "@webpack";
import { ChannelStore, Forms, GuildMemberStore, GuildStore, React } from "@webpack/common";

const useMessageAuthor = findByCodeLazy('"Result cannot be null because the message is not null"');

const settings = definePluginSettings({
    chatMentions: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show role colors in chat mentions (including in the message box)",
        restartNeeded: true
    },
    memberList: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show role colors in member list role headers",
        restartNeeded: true
    },
    voiceUsers: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show role colors in the voice chat user list",
        restartNeeded: true
    },
    reactorsList: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show role colors in the reactors list",
        restartNeeded: true
    },
    colorChatMessages: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Color chat messages based on the author's role color",
        restartNeeded: true,
    },
    messageSimilarity: {
        type: OptionType.SLIDER,
        description: "Similarity of message color to white",
        markers: makeRange(1, 10, 1),
        default: 8,
        restartNeeded: false
    },
    color: {
        type: OptionType.COMPONENT,
        description: "test color",
        default: "d31414",
        component: () => <ColorTester />
    }
});

const ColorPicker = findComponentByCodeLazy(".Messages.USER_SETTINGS_PROFILE_COLOR_SELECT_COLOR", ".BACKGROUND_PRIMARY)");

function newColor(hex: any, sim: any, pound: boolean) {
    var hex = hex.replace("#", "");
    var converted = Math.round((0.5 + ((sim - 1) * 0.5 / 9)) * 10) / 10;
    var r = Math.round(parseInt(hex.substring(0, 2), 16) + (255 - parseInt(hex.substring(0, 2), 16)) * converted - (converted * 20));
    var g = Math.round(parseInt(hex.substring(2, 4), 16) + (255 - parseInt(hex.substring(2, 4), 16)) * converted - (converted * 20));
    var b = Math.round(parseInt(hex.substring(4, 6), 16) + (255 - parseInt(hex.substring(4, 6), 16)) * converted - (converted * 20));
    var toHex = (component: number) => component.toString(16).padStart(2, "0");
    if (pound)
        var color = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    else
        var color = `${toHex(r)}${toHex(g)}${toHex(b)}`;
    return color;
}

function onPickColor(color: number) {
    const hexColor = color.toString(16).padStart(6, "0");
    settings.store.color = hexColor;
}

function ColorTester(this: any) {
    const { messageSimilarity } = settings.use(["messageSimilarity"]);

    const [displayColor, setDisplayColor] = React.useState(settings.store.color);
    const [secondColor, setSecondColor] = React.useState(newColor(displayColor, messageSimilarity, false));

    React.useEffect(() => {
        setDisplayColor(settings.store.color);
        setSecondColor(newColor(settings.store.color, messageSimilarity, false));
    }, [settings.store.color, messageSimilarity]);

    const handleColorChange = color => {
        const hexColor = color.toString(16).padStart(6, "0");
        settings.store.color = hexColor;
        setDisplayColor(hexColor);
        setSecondColor(newColor(hexColor, messageSimilarity, false));
    };

    return (
        <div className="role-color-settings">
            <div className="role-color-container">
                <div className="role-color-settings-labels">
                    <Forms.FormTitle tag="h3">Hex Tester</Forms.FormTitle>
                    <Forms.FormText>Preview the changed message role color</Forms.FormText>
                </div>
                <div className="role-color-pickers">
                    <ColorPicker
                        color={parseInt(displayColor, 16)}
                        onChange={handleColorChange}
                        showEyeDropper={false}
                    />
                    <ColorPicker
                        color={parseInt(secondColor, 16)}
                        showEyeDropper={false}
                    />
                </div>
            </div>
        </div>
    );
}

export default definePlugin({
    name: "RoleColorEverywhere",
    authors: [Devs.KingFish, Devs.lewisakura, Devs.AutumnVN, Devs.Kyuuhachi, Devs.AlphaLeoli],
    description: "Adds the top role color anywhere possible",
    patches: [
        // Chat Mentions
        {
            find: ".USER_MENTION)",
            replacement: [
                {
                    match: /onContextMenu:\i,color:\i,\.\.\.\i(?=,children:)(?<=user:(\i),channel:(\i).{0,500}?)/,
                    replace: "$&,color:$self.getUserColor($1?.id,{channelId:$2?.id})"
                }
            ],
            predicate: () => settings.store.chatMentions,
        },
        // Slate
        {
            find: ".userTooltip,children",
            replacement: [
                {
                    match: /let\{id:(\i),guildId:(\i)[^}]*\}.*?\.\i,{(?=children)/,
                    replace: "$&color:$self.getUserColor($1,{guildId:$2}),"
                }
            ],
            predicate: () => settings.store.chatMentions,
        },
        {
            find: 'tutorialId:"whos-online',
            replacement: [
                {
                    match: /null,\i," — ",\i\]/,
                    replace: "null,$self.roleGroupColor(arguments[0])]"
                },
            ],
            predicate: () => settings.store.memberList,
        },
        {
            find: ".Messages.THREAD_BROWSER_PRIVATE",
            replacement: [
                {
                    match: /children:\[\i," — ",\i\]/,
                    replace: "children:[$self.roleGroupColor(arguments[0])]"
                },
            ],
            predicate: () => settings.store.memberList,
        },
        {
            find: "renderPrioritySpeaker",
            replacement: [
                {
                    match: /renderName\(\){.+?usernameSpeaking\]:.+?(?=children)/,
                    replace: "$&...$self.getVoiceProps(this.props),"
                }
            ],
            predicate: () => settings.store.voiceUsers,
        },
        {
            find: ".reactorDefault",
            replacement: {
                match: /,onContextMenu:e=>.{0,15}\((\i),(\i),(\i)\).{0,250}tag:"strong"/,
                replace: "$&,style:{color:$self.getColor($2?.id,$1)}"
            },
            predicate: () => settings.store.reactorsList,
        },
        {
            find: '.Messages.MESSAGE_EDITED,")"',
            replacement: {
                match: /(?<=isUnsupported\]:(\i)\.isUnsupported\}\),)(?=children:\[)/,
                replace: "style:{color:$self.useMessageColor($1)},"
            },
            predicate: () => settings.store.colorChatMessages,
        },
    ],
    settings,

    getColor(userId: string, { channelId, guildId }: { channelId?: string; guildId?: string; }) {
        if (!(guildId ??= ChannelStore.getChannel(channelId!)?.guild_id)) return null;
        return GuildMemberStore.getMember(guildId, userId)?.colorString ?? null;
    },

    getUserColor(userId: string, ids: { channelId?: string; guildId?: string; }) {
        const colorString = this.getColor(userId, ids);
        return colorString && parseInt(colorString.slice(1), 16);
    },

    roleGroupColor: ErrorBoundary.wrap(({ id, count, title, guildId, label }: { id: string; count: number; title: string; guildId: string; label: string; }) => {
        const role = GuildStore.getRole(guildId, id);

        return (
            <span style={{
                color: role?.colorString,
                fontWeight: "unset",
                letterSpacing: ".05em"
            }}>
                {title ?? label} &mdash; {count}
            </span>
        );
    }, { noop: true }),

    getVoiceProps({ user: { id: userId }, guildId }: { user: { id: string; }; guildId: string; }) {
        return {
            style: {
                color: this.getColor(userId, { guildId })
            }
        };
    },

    useMessageColor(message: any) {
        try {
            const { messageSimilarity } = settings.use(["messageSimilarity"]);
            const author = useMessageAuthor(message);
            if (author.colorString !== undefined)
                return newColor(author.colorString, messageSimilarity, true);
        } catch (e) {
            console.error("[RCE] failed to get message color", e);
        }
        return undefined;
    }
});
