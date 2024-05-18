/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { addButton, removeButton } from "@api/MessagePopover";
import { definePluginSettings } from "@api/Settings";
import { DeleteIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Button, ChannelStore, Flex, React, TextInput, useEffect, useState } from "@webpack/common";

interface Emoji {
    emojiID: string;
    emojiName: string;
    iconURL: string;
    animated: boolean;
}

const defaultEmoji: Emoji = {
    emojiID: "935711180817829888",
    emojiName: "xd",
    iconURL: "https://cdn.discordapp.com/attachments/1209687669652029450/1218969686652026944/xd.png",
    animated: false
};

const setupEmojiButtons = (emojis: Emoji[]) => {
    emojis.forEach(emoji => {
        addButton(emoji.emojiName, msg => ({
            label: emoji.emojiName,
            icon: () => <img src={emoji.iconURL} alt={`${emoji.emojiName} icon`} style={{ maxWidth: "100%", height: "auto", display: "block" }} />,
            message: msg,
            channel: ChannelStore.getChannel(msg.channel_id),
            onClick: () => {
                Vencord.Webpack.findByProps("addReaction").addReaction(msg.channel_id, msg.id, {
                    id: emoji.emojiID,
                    name: emoji.emojiName,
                    animated: emoji.animated
                });
            }
        }));
    });
};

const ReactionEmojiManager = () => {
    const [emojis, setEmojis] = useState<Emoji[]>([defaultEmoji]);

    useEffect(() => {
        const fetchEmojis = async () => {
            const storedEmojis = await DataStore.get("EmojiReactions") || [defaultEmoji];
            setEmojis(storedEmojis);
            storedEmojis.forEach(emoji => removeButton(emoji.emojiName)); // Clean up any existing buttons before adding new ones
            setupEmojiButtons(storedEmojis);
        };
        fetchEmojis();
        return () => emojis.forEach(emoji => removeButton(emoji.emojiName));
    }, [emojis]);

    const manageEmoji = async (emojiToAddOrUpdate: Emoji, idx: number | null = null) => {
        let updatedEmojis = [...emojis];
        if (idx === null) {
            updatedEmojis.push(emojiToAddOrUpdate);
        } else if (idx === -1) {
            updatedEmojis = updatedEmojis.filter(e => e !== emojiToAddOrUpdate);
        } else {
            updatedEmojis[idx] = emojiToAddOrUpdate;
        }
        await DataStore.set("EmojiReactions", updatedEmojis);
        setEmojis(updatedEmojis);
    };

    return (
        <div>
            {emojis.map((emoji, index) => (
                <Flex key={emoji.emojiID} flexDirection="row">
                    <TextInput placeholder="Emoji Name" value={emoji.emojiName} onChange={value => manageEmoji({ ...emoji, emojiName: value }, index)} />
                    <TextInput placeholder="Emoji ID" value={emoji.emojiID} onChange={value => manageEmoji({ ...emoji, emojiID: value }, index)} />
                    <TextInput placeholder="Icon URL" value={emoji.iconURL} onChange={value => manageEmoji({ ...emoji, iconURL: value }, index)} />
                    <Button onClick={() => manageEmoji(emoji, -1)} look={Button.Looks.BLANK} size={Button.Sizes.ICON} className="emoji-delete">
                        <DeleteIcon />
                    </Button>
                </Flex>
            ))}
            <Button onClick={() => manageEmoji({ emojiID: "", emojiName: "", iconURL: "", animated: false }, null)}>
                Add Emoji
            </Button>
        </div>
    );
};

const settings = definePluginSettings({
    emojis: {
        type: OptionType.COMPONENT,
        description: "Manage reaction emojis",
        component: ReactionEmojiManager
    }
});

export default definePlugin({
    name: "ReactionEmojiManager",
    authors: [{
        name: "luckycanucky",
        id: 995923917594173440n
    }],
    description: "Manage custom emoji reactions for messages and automate their setup",
    settings,
    dependencies: ["MessagePopoverAPI"],
    async start() {
        const emojis = await DataStore.get("EmojiReactions") || [];
        emojis.forEach(emoji => removeButton(emoji.emojiName));
        setupEmojiButtons(emojis);
    },
    async stop() {
        const emojis = await DataStore.get("EmojiReactions") || [];
        emojis.forEach(emoji => removeButton(emoji.emojiName));
    },
});
