/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 satanas and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { isPluginEnabled } from "@api/PluginManager";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { Devs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { openUserProfile } from "@utils/discord";
import { Logger } from "@utils/Logger";
import { Margins } from "@utils/margins";
import definePlugin from "@utils/types";
import { User } from "@vencord/discord-types";
import { AuthenticationStore, GuildMemberStore, React, RelationshipStore, SelectedChannelStore, TypingStore, UserStore } from "@webpack/common";

import { settings } from "./settings";
import { getConfigFor, initSync, onTypingStart } from "./sync";

const cl = classNameFactory("vc-typing-customizer-");
const logger = new Logger("TypingCustomizer");

function getDisplayName(user: User, guildId?: string) {
    return (guildId && GuildMemberStore.getNick(guildId, user.id))
        || RelationshipStore.getNickname(user.id)
        || (user as any).globalName
        || user.username;
}

function getSoleTypingUser(channelId?: string) {
    if (!channelId) return null;

    const typingUsers: Record<string, number> = TypingStore.getTypingUsers(channelId) ?? {};
    const me = AuthenticationStore.getId();
    const ids = Object.keys(typingUsers).filter(id => id !== me && !RelationshipStore.isBlockedOrIgnored(id));

    // Discord only shows customised indicators when a single person is typing, so do the same
    if (ids.length !== 1) return null;

    return UserStore.getUser(ids[0]) ?? null;
}

function renderTypingText(props: any, children: any) {
    try {
        const channel = props?.channel;
        const user = getSoleTypingUser(channel?.id ?? SelectedChannelStore.getChannelId());
        if (!user) return children;

        const text = getConfigFor(user.id)?.text;
        if (!text) return children;

        const nameIndex = text.indexOf("{user}");
        if (nameIndex === -1) return <span className={cl("text")}>{text}</span>;

        return (
            <span className={cl("text")}>
                {text.slice(0, nameIndex)}
                <strong className={cl("name")} role="button" onClick={() => openUserProfile(user.id)}>
                    {getDisplayName(user, channel?.guild_id)}
                </strong>
                {text.slice(nameIndex + "{user}".length)}
            </span>
        );
    } catch (e) {
        logger.error("Failed to render the typing text", e);
        return children;
    }
}

function renderDots(props: any, fallback: any) {
    try {
        const user = getSoleTypingUser(props?.channel?.id ?? SelectedChannelStore.getChannelId());
        if (!user) return fallback;

        const emojis = getConfigFor(user.id)?.emojis;
        if (!emojis?.length) return fallback;

        return (
            <span className={cl("dots")}>
                {emojis.map((emoji, index) => (
                    <span key={index} className={cl("dot")}>{emoji}</span>
                ))}
            </span>
        );
    } catch (e) {
        logger.error("Failed to render the typing dots", e);
        return fallback;
    }
}

function SettingsAbout() {
    return (
        <section>
            <Heading className={Margins.bottom8}>How it works</Heading>
            <Paragraph>
                Your custom text and emoji replace the stock indicator while you are the only one typing, just like
                Discord's own custom typing indicator. Use {"{user}"} in the text to insert your display name.
            </Paragraph>

            <Heading className={Margins.top16}>Choosing your indicator</Heading>
            <Paragraph>
                In a server that has the bot, run {"/set"} with your text and up to three emoji, or {"/reset"} to go
                back to the default. The bot only trusts the account that ran the command, so nobody can change your
                indicator for you.
            </Paragraph>
            <Paragraph className={Margins.top8}>
                Everyone who has this plugin sees your indicator, in every server.
            </Paragraph>

            <Heading className={Margins.top16}>Hosting</Heading>
            <Paragraph>
                The plugin only reads {"<baseUrl>/<userId>.json"}, and ships the bot serving it in {"bot/"}. The
                default instance is hosted by the plugin's author; set the base URL to your own deployment if you
                would rather host it yourself.
            </Paragraph>
        </section>
    );
}

export default definePlugin({
    name: "TypingCustomizer",
    description: "Replace the typing indicator dots with emoji and customise the \"is typing...\" text, shared with the other users of the plugin",
    searchTerms: ["typing", "indicator", "dots", "emoji"],
    tags: ["Appearance", "Chat", "Customisation"],
    authors: [Devs.satanas],
    settings,
    settingsAboutComponent: SettingsAbout,

    patches: [
        {
            find: "#{intl::SEVERAL_USERS_TYPING_STRONG}",
            replacement: [
                {
                    // The "X is typing..." span. The lookbehind requires the children variable to be the one
                    // built from the typing message, which skips the dots container sharing the same prefix
                    match: /(?<="aria-hidden":!0,children:)(\i)(?<=\1=.{0,100}?#{intl::MULTIPLE_USERS_TYPING_STRONG}.+?)/,
                    replace: "$self.renderTypingText(arguments[0],$1)",
                    // TypingTweaks rewrites the same element and the two would fight over it
                    predicate: () => {
                        try {
                            return !isPluginEnabled("TypingTweaks");
                        } catch {
                            return true;
                        }
                    }
                },
                {
                    // The three dots exist in two variants (bare spans and a shared dot component); replace both at once
                    match: /(\i\?\(0,\i\.jsx\)\(\i,\{\}\):\(0,\i\.\i\)\(\i\.\i,\{className:\i\.\i,dotRadius:[^}]{0,40}\}\))/,
                    replace: "$self.renderDots(arguments[0],$1)"
                }
            ]
        }
    ],

    renderTypingText,
    renderDots,

    async start() {
        try {
            await initSync();
        } catch (e) {
            logger.error("Failed to initialise the sync", e);
        }

    },

    flux: {
        TYPING_START: onTypingStart,
        TYPING_START_LOCAL: onTypingStart
    }
});
