/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/settings";
import { Devs } from "@utils/constants";
import { ModalContent, ModalHeader, ModalRoot, openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import {
    Button, ButtonLooks, ButtonWrapperClasses,
    ChannelStore,
    FluxDispatcher, Forms,
    GuildStore,
    NavigationRouter,
    RelationshipStore, Tooltip,
    UserStore,
} from "@webpack/common";
import { findByCodeLazy } from "@webpack";

const createBotMessage = findByCodeLazy('username:"Clyde"');

interface user {
    avatar: string;
    discriminator: string;
    id: string;
    username: string;
    public_flags: number;
    display_name?: string;
    avatarDecoration?: string;
}

interface message {
    channel_id?: string;
    guild_id?: string;
    author: user;
    content: string;
    id: string;
    type: number;
    timestamp: string;
    referenced_message?: message;
    tts: boolean;
    components?: any;
    attachments: any[];
    embeds: any[];
    member?: {
        avatar?: string;
        roles: string[];
        joined_at: string;
        premium_since?: string;
        nick?: string;
        deaf: boolean;
        mute: boolean;
        flags: number;
    }
    mentions: user[];
    mention_roles: string[];
    mention_everyone: boolean;
}


const settings = definePluginSettings({
    keywords: {
        type: OptionType.STRING,
        description: "Comma separated list of keywords",
        default: "keyword1,keyword2",
        onChange: () => plugin.UpdateKeywordRegex()
    },
    caseSensitive: {
        type: OptionType.BOOLEAN,
        description: "Whether or not to match case",
        default: false
    },
    subString: {
        type: OptionType.BOOLEAN,
        description: "Whether or not to match if the keyword is within another word",
        default: true,
        onChange: () => plugin.UpdateKeywordRegex()
    },
    highlightInChat: {
        type: OptionType.BOOLEAN,
        description: "Whether or not to highlight the keyword in chat",
        default: true
    },
    highlightColor: {
        type: OptionType.STRING,
        description: "Color to highlight the keyword in chat. Must be a valid CSS color.",
        default: "cyan"
    },
    ignoredUsers: {
        type: OptionType.STRING,
        description: "Comma separated list of user IDs to ignore.",
        default: "123456789012345678,123456789012345678"
    },
    ignoredChannels: {
        type: OptionType.STRING,
        description: "Comma separated list of channel IDs to ignore",
        default: "123456789012345678,123456789012345678"
    },
    ignoredGuilds: {
        type: OptionType.STRING,
        description: "Comma separated list of guild IDs to ignore",
        default: "123456789012345678,123456789012345678"
    },
    whitelist: {
        type: OptionType.BOOLEAN,
        description: "Whitelist instead of blacklist",
        default: false
    }
});

function fakeMessage(message: message, keyword: string, real: boolean = true) {
    // we have to camelCase channelId because discord™.
    const msg = createBotMessage({
        channelId: message.channel_id,
        content: message.content,
        guildId: message.guild_id,
        author: message.author
    })
    // the above message now has the functions hasFlag() and stuff,
    // which makes it valid for the component 👍.

    msg.keyword = keyword;
    msg.id = message.id;
    msg.flags = 0;
    msg.real = real;
    return msg;
}
const KeywordText = ({ keyword, children }) => {
    // escape the regex
    const escaped = keyword.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    const regex = new RegExp(escaped, "gi");
    const parts = children.split(regex);
    const elements: any[] = []; // guh we love any
    for (let i = 0; i < parts.length; i++) {
        elements.push(parts[i]);
        if (i !== parts.length - 1) {
            elements.push(
                <plugin.KeywordHighlightComponent>{keyword}</plugin.KeywordHighlightComponent>
            );
        }
    }

    return <>{elements}</>;
};


function onMessage(ev: { message: message; }) {
    const {author_id, channel_id, guild_id, id} = plugin.getChannelGuildAndAuthorIds(ev.message);
    if ([author_id, channel_id, guild_id].includes(undefined)) return;

    if (!plugin.shouldHighlightMessage(ev.message)) return;
    let {content} = ev.message;

    const matches = content.match(plugin.KeywordRegex);
    if (matches != null && matches.length > 0 && matches[0].length > 0) {
        const keyword = matches[0];
        recentHighlights.push(fakeMessage(ev.message, keyword));
        showNotification({
            title: `Keyword in ${GuildStore.getGuild(guild_id).name} from @${ev.message.author.username}: ${keyword}`,
            body: ev.message.content,
            richBody: <KeywordText keyword={keyword}>{ev.message.content}</KeywordText>,
            icon: `https://cdn.discordapp.com/avatars/${ev.message.author.id}/${ev.message.author.avatar}.png?size=128`,
            onClick() {
                const link = "/channels/" + guild_id + "/" + channel_id + "/" + id;
                // focus discord
                window.focus();
                NavigationRouter.transitionTo(link);
            }
        });
    }
}


interface HighlightMessage extends message {
    real: boolean;
    keyword: string;
}

let recentHighlights: HighlightMessage[] = [];

const plugin = definePlugin({
    name: "KeywordAlerts",
    description: "Sends a notification whenever someone sends a keyword.",
    authors: [Devs.captain],
    recentHighlightsModal: function (props) {
        if (!IS_DEV) {
            recentHighlights = recentHighlights.filter(m => m.real);
            recentHighlights.push({
                ...createBotMessage(
                    {
                        channelId: "1015931590741872712",
                        content: "testing test yes"
                    }),
                flags: 0,
                author: UserStore.getCurrentUser(),
                keyword: "test"
            })
        }
        return (
            <ModalRoot {...props}>
                <ModalHeader>
                    <Forms.FormTitle tag="h4">Recent Highlights</Forms.FormTitle>
                </ModalHeader>

                <ModalContent>
                    {recentHighlights.map((highlight) =>  <>
                            <plugin.messageComponent compact={false}
                                                     flashKey={undefined}
                                                     groupId={Math.ceil(Math.random() * 100000).toString()}
                                                     isHighlight={false}
                                                     isLastItem={false}
                                                     renderContentOnly={false}
                                                     id={`chat-messages-${highlight.channel_id}-${highlight.id}`}
                                                     message={highlight}
                                                     channel={ChannelStore.getChannel(highlight.channel_id!)} />
                            <Forms.FormDivider />
                        </>
                    )}
                </ModalContent>
            </ModalRoot>
        );
    },
    start: function() {
        FluxDispatcher.subscribe("MESSAGE_CREATE", onMessage);
        this.UpdateKeywordRegex();
    },
    stop: function() {
        FluxDispatcher.unsubscribe("MESSAGE_CREATE", onMessage);
    },
    highlightIcon() {
        return (
            // yoinkity-sploinkitied from InvisibleChat
            <Tooltip text="Recent highlights" position="bottom">
                {({ onMouseEnter, onMouseLeave }) => (
                    <Button
                        aria-haspopup="dialog"
                        aria-label="Recent highlights"
                        size=""
                        look={ButtonLooks.BLANK}
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                        innerClassName={ButtonWrapperClasses.button}
                        onClick={() => openModal(props => <this.recentHighlightsModal {...props} />, { modalKey: "KA-Modal" })}
                        style={{ marginRight: "2px" }}
                    >
                        <div className={ButtonWrapperClasses.buttonWrapper}>
                            <svg style={{ borderRadius: "50%" }} color={Button.Colors.WHITE} width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                                <rect id="svg_6" height="13.94872" width="13.94872" y="-2.35897" x="-2.5641" fill="currentColor"/>
                                <rect id="svg_8" height="14.46154" width="14.46154" y="12.46154" x="12.3077" fill="currentColor"/>
                            </svg>
                        </div>
                    </Button>
                )}
            </Tooltip>
        );
    },
    patches: [ // stole this from invisible-chat
        {
            find: ".Messages.MESSAGE_EDITED,",
            replacement: {
                match: /var .,.,.=(.)\.className,.=.\.message,.=.\.children,.=.\.content,.=.\.onUpdate/gm,
                replace: "try {if ($1 && $self.settings.store.highlightInChat) $1.content = $self.replaceMessageContent($1); } catch {};$&"
            }
        },
        // uncomment when you get it working you lazy captain
        // { // thanks nookies
        //     find: ".Messages.UPDATE_AVAILABLE",
        //     replacement: {
        //         match: /(toolbar:function\(\).+?children:\[.+?)]/,
        //         replace: "$1,$self.highlightIcon()]"
        //     },
        // },
        {
            find: "\"Message must not be a thread starter message\"",
            replacement: {
                match: /function (\i)(\(\i\)){(var \i=\i.id)/,
                replace: "function $1$2{$self.setMessageComp($1);$3"
            }
        }
    ],
    getChannelGuildAndAuthorIds(message: message) {
        const author_id = message.author.id;
        const { id } = message;
        const { channel_id } = message;
        let { guild_id } = message;
        if (guild_id === undefined) {
            // this hack is required because discord is horrible
            const channel = ChannelStore.getChannel(channel_id!);
            // turns out direct messages DO actually have a channel ID, and channelStore CAN get them.
            // why the id isn't the same as user id is beyond me, but it's not.
            // so this is a better way of checking if it's a dm, unlike just checking
            // if the channel is undefined.
            if (channel.guild_id === null) return {
                author_id: undefined,
                guild_id: undefined,
                channel_id: undefined,
                id: undefined }; // implementing this for direct messages is useless
            ({ guild_id } = channel);
        }

        return { author_id, channel_id, guild_id, id };
    },
    messageComponent: () => <></>,
    setMessageComp(func) {
        this.messageComponent = func; // poggers
    },
    shouldHighlightMessage(message: message) {
        const { author_id, channel_id, guild_id } = this.getChannelGuildAndAuthorIds(message);
        if ([author_id, channel_id, guild_id].includes(undefined)) return false;

        // check if the user/channel/guild is ignored. invert the check if the whitelist is enabled.
        // if the ignored list is empty, don't check it no matter if it's a whitelist or blacklist.
        // the indentation is like this because it's easier to read imo.
        if (
            (settings.store.ignoredUsers !== "" &&
                settings.store.ignoredUsers.split(",").includes(author_id!) !== settings.store.whitelist) ||
            (settings.store.ignoredChannels !== "" &&
                settings.store.ignoredChannels.split(",").includes(channel_id!) !== settings.store.whitelist) ||
            (settings.store.ignoredGuilds !== "" &&
                settings.store.ignoredGuilds.split(",").includes(guild_id!) !== settings.store.whitelist)
        ) return false;

        // check if the user is blocked or yourself.
        return !(RelationshipStore.isBlocked(author_id!) || author_id === UserStore.getCurrentUser().id);
    },
    replaceMessageContent (comp: { message: message; content: any[]; }) {
        const { author_id, channel_id, guild_id } = this.getChannelGuildAndAuthorIds(comp.message);
        if ([author_id, channel_id, guild_id].includes(undefined)) return comp.content;

        if (!this.shouldHighlightMessage(comp.message)) return comp.content;

        // comp.content is an array of components or strings.
        const final: any[] = [];
        for (let i = 0; i < comp.content.length; i++) {
            const component = comp.content[i];
            if (typeof component !== "string") {
                final.push(component);
                continue;
            }
            // this is a string, so we have to check if it contains a keyword.
            // if it does, we have to split it into multiple components.
            const matches = component.match(this.KeywordRegex);
            if (matches === null) {
                final.push(component);
                continue;
            }

            // split the string into multiple components
            let split = component.split(this.KeywordRegex);
            // remove every other element because it's the keywords
            split = split.filter((_, index) => index % 2 === 0);
            split.forEach((str, index) => {
                final.push(str);
                final.push(this.KeywordHighlightComponent({ children: matches[index] }));
            });
            // remove the last element because it's undefined
            final.pop();
        }
        return final;
    },
    UpdateKeywordRegex () {
        // update the regex. has to be escaped because the keywords are provided by the user.
        this.KeywordRegex = new RegExp(
            (settings.store.subString ? "(" : "\\b(")
            + settings.store.keywords.split(",").map(keyword => keyword.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")).join("|")
            + (settings.store.subString ? ")" : ")\\b"),
            settings.store.caseSensitive ? "g" : "gi"
        );
    },
    // since we can't access store before the plugin is initialized, this regex should not match anything.
    KeywordRegex: new RegExp("a^", "g"),
    KeywordHighlightComponent: props => <span className={"KA-Highlight"} style={{ color: settings.store.highlightColor }}>{props.children}</span>,
    settings
});

export default plugin;
