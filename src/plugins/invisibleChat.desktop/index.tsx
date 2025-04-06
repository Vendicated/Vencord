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

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { updateMessage } from "@api/MessageUpdater";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { getStegCloak } from "@utils/dependencies";
import definePlugin, { OptionType, ReporterTestable } from "@utils/types";
import { ChannelStore, Constants, RestAPI, Tooltip } from "@webpack/common";
import { Message } from "discord-types/general";

import { buildDecModal } from "./components/DecryptionModal";
import { buildEncModal } from "./components/EncryptionModal";

let steggo: any;

function PopOverIcon() {
    return (

        <svg
            fill="var(--header-secondary)"
            width={24} height={24}
            viewBox={"0 0 64 64"}
        >
            <path d="M 32 9 C 24.832 9 19 14.832 19 22 L 19 27.347656 C 16.670659 28.171862 15 30.388126 15 33 L 15 49 C 15 52.314 17.686 55 21 55 L 43 55 C 46.314 55 49 52.314 49 49 L 49 33 C 49 30.388126 47.329341 28.171862 45 27.347656 L 45 22 C 45 14.832 39.168 9 32 9 z M 32 13 C 36.963 13 41 17.038 41 22 L 41 27 L 23 27 L 23 22 C 23 17.038 27.037 13 32 13 z" />
        </svg>
    );
}


function Indicator() {
    return (
        <Tooltip text="This message has a hidden message! (InvisibleChat)">
            {({ onMouseEnter, onMouseLeave }) => (
                <img
                    aria-label="Hidden Message Indicator (InvisibleChat)"
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                    src="https://github.com/SammCheese/invisible-chat/raw/NewReplugged/src/assets/lock.png"
                    width={20}
                    height={20}
                    style={{ transform: "translateY(4p)", paddingInline: 4 }}
                />
            )}
        </Tooltip>

    );

}

const ChatBarIcon: ChatBarButtonFactory = ({ isMainChat }) => {
    if (!isMainChat) return null;

    return (
        <ChatBarButton
            tooltip="Encrypt Message"
            onClick={() => buildEncModal()}

            buttonProps={{
                "aria-haspopup": "dialog",
            }}
        >
            <svg
                aria-hidden
                role="img"
                width="20"
                height="20"
                viewBox={"0 0 64 64"}
                style={{ scale: "1.39", translate: "0 -1px" }}
            >
                <path fill="currentColor" d="M 32 9 C 24.832 9 19 14.832 19 22 L 19 27.347656 C 16.670659 28.171862 15 30.388126 15 33 L 15 49 C 15 52.314 17.686 55 21 55 L 43 55 C 46.314 55 49 52.314 49 49 L 49 33 C 49 30.388126 47.329341 28.171862 45 27.347656 L 45 22 C 45 14.832 39.168 9 32 9 z M 32 13 C 36.963 13 41 17.038 41 22 L 41 27 L 23 27 L 23 22 C 23 17.038 27.037 13 32 13 z" />
            </svg>
        </ChatBarButton>
    );
};

const settings = definePluginSettings({
    savedPasswords: {
        type: OptionType.STRING,
        default: "password, Password",
        description: "Saved Passwords (Seperated with a , )"
    }
});

export default definePlugin({
    name: "InvisibleChat",
    description: "Encrypt your Messages in a non-suspicious way!",
    authors: [Devs.SammCheese],
    dependencies: ["MessageUpdaterAPI"],
    reporterTestable: ReporterTestable.Patches,
    settings,

    patches: [
        {
            // Indicator
            find: "#{intl::MESSAGE_EDITED}",
            replacement: {
                match: /let\{className:\i,message:\i[^}]*\}=(\i)/,
                replace: "try {$1 && $self.INV_REGEX.test($1.message.content) ? $1.content.push($self.indicator()) : null } catch {};$&"
            }
        },
    ],

    EMBED_API_URL: "https://embed.sammcheese.net",
    INV_REGEX: new RegExp(/( \u200c|\u200d |[\u2060-\u2064])[^\u200b]/),
    URL_REGEX: new RegExp(
        /(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/,
    ),
    async start() {
        const { default: StegCloak } = await getStegCloak();
        steggo = new StegCloak(true, false);
    },

    renderMessagePopoverButton(message) {
        return this.INV_REGEX.test(message?.content)
            ? {
                label: "Decrypt Message",
                icon: this.popOverIcon,
                message: message,
                channel: ChannelStore.getChannel(message.channel_id),
                onClick: async () => {
                    const res = await iteratePasswords(message);

                    if (res)
                        this.buildEmbed(message, res);
                    else
                        buildDecModal({ message });
                }
            }
            : null;
    },

    renderChatBarButton: ChatBarIcon,

    colorCodeFromNumber(color: number): string {
        return `#${[color >> 16, color >> 8, color]
            .map(x => (x & 0xFF).toString(16))
            .join("")}`;
    },

    // Gets the Embed of a Link
    async getEmbed(url: URL): Promise<Object | {}> {
        const { body } = await RestAPI.post({
            url: Constants.Endpoints.UNFURL_EMBED_URLS,
            body: {
                urls: [url]
            }
        });
        // The endpoint returns the color as a number, but Discord expects a string
        body.embeds[0].color = this.colorCodeFromNumber(body.embeds[0].color);
        return await body.embeds[0];
    },

    async buildEmbed(message: any, revealed: string): Promise<void> {
        const urlCheck = revealed.match(this.URL_REGEX);

        message.embeds.push({
            type: "rich",
            rawTitle: "Decrypted Message",
            color: "#45f5f5",
            rawDescription: revealed,
            footer: {
                text: "Made with ❤️ by c0dine and Sammy!",
            },
        });

        if (urlCheck?.length) {
            const embed = await this.getEmbed(new URL(urlCheck[0]));
            if (embed)
                message.embeds.push(embed);
        }

        updateMessage(message.channel_id, message.id, { embeds: message.embeds });
    },

    popOverIcon: () => <PopOverIcon />,
    indicator: ErrorBoundary.wrap(Indicator, { noop: true })
});

export function encrypt(secret: string, password: string, cover: string): string {
    return steggo.hide(secret + "\u200b", password, cover);
}

export function decrypt(encrypted: string, password: string, removeIndicator: boolean): string {
    const decrypted = steggo.reveal(encrypted, password);
    return removeIndicator ? decrypted.replace("\u200b", "") : decrypted;
}

export function isCorrectPassword(result: string): boolean {
    return result.endsWith("\u200b");
}

export async function iteratePasswords(message: Message): Promise<string | false> {
    const passwords = settings.store.savedPasswords.split(",").map(s => s.trim());

    if (!message?.content || !passwords?.length) return false;

    let { content } = message;

    // we use an extra variable so we dont have to edit the message content directly
    if (/^\W/.test(message.content)) content = `d ${message.content}d`;

    for (let i = 0; i < passwords.length; i++) {
        const result = decrypt(content, passwords[i], false);
        if (isCorrectPassword(result)) {
            return result;
        }
    }

    return false;
}
