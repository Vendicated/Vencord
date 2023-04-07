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

import { addButton, removeButton } from "@api/MessagePopover";
import { definePluginSettings } from "@api/settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { getStegCloak } from "@utils/dependencies";
import definePlugin, { OptionType } from "@utils/types";
import { Button, ButtonLooks, ButtonWrapperClasses, ChannelStore, FluxDispatcher, Tooltip } from "@webpack/common";
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

function ChatBarIcon() {
    return (
        <Tooltip text="Encrypt Message">
            {({ onMouseEnter, onMouseLeave }) => (
                // size="" = Button.Sizes.NONE
                /*
                    many themes set "> button" to display: none, as the gift button is
                    the only directly descending button (all the other elements are divs.)
                    Thus, wrap in a div here to avoid getting hidden by that.
                    flex is for some reason necessary as otherwise the button goes flying off
                */
                <div style={{ display: "flex" }}>
                    <Button
                        aria-haspopup="dialog"
                        aria-label="Encrypt Message"
                        size=""
                        look={ButtonLooks.BLANK}
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                        innerClassName={ButtonWrapperClasses.button}
                        onClick={() => buildEncModal()}
                        style={{ marginRight: "2px" }}
                    >
                        <div className={ButtonWrapperClasses.buttonWrapper}>
                            <svg
                                aria-hidden
                                role="img"
                                width="32"
                                height="32"
                                viewBox={"0 0 64 64"}
                                style={{ scale: "1.1" }}
                            >
                                <path fill="currentColor" d="M 32 9 C 24.832 9 19 14.832 19 22 L 19 27.347656 C 16.670659 28.171862 15 30.388126 15 33 L 15 49 C 15 52.314 17.686 55 21 55 L 43 55 C 46.314 55 49 52.314 49 49 L 49 33 C 49 30.388126 47.329341 28.171862 45 27.347656 L 45 22 C 45 14.832 39.168 9 32 9 z M 32 13 C 36.963 13 41 17.038 41 22 L 41 27 L 23 27 L 23 22 C 23 17.038 27.037 13 32 13 z" />
                            </svg>
                        </div>
                    </Button>
                </div>
            )
            }
        </Tooltip >
    );
}

const settings = definePluginSettings({
    savedPasswords: {
        type: OptionType.STRING,
        default: "password, Password",
        description: "Saved Passwords (Seperated with a , )"
    }
});

export default definePlugin({
    name: "InvisibleChat",
    description: "Encrypt your Messages in a non-suspicious way! This plugin makes requests to >>https://embed.sammcheese.net<< to provide embeds to decrypted links!",
    authors: [Devs.SammCheese],
    dependencies: ["MessagePopoverAPI"],
    patches: [
        {
            // Indicator
            find: ".Messages.MESSAGE_EDITED,",
            replacement: {
                match: /var .,.,.=(.)\.className,.=.\.message,.=.\.children,.=.\.content,.=.\.onUpdate/gm,
                replace: "try {$1 && $self.INV_REGEX.test($1.content[0]) ? $1.content.push($self.indicator()) : null } catch {};$&"
            }
        },
        {
            find: ".activeCommandOption",
            replacement: {
                match: /(.)\.push.{1,30}disabled:(\i),.{1,20}\},"gift"\)\)/,
                replace: "$&;try{$2||$1.push($self.chatBarIcon())}catch{}",
            }
        },
    ],

    EMBED_API_URL: "https://embed.sammcheese.net",
    INV_REGEX: new RegExp(/( \u200c|\u200d |[\u2060-\u2064])[^\u200b]/),
    URL_REGEX: new RegExp(
        /(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/,
    ),
    settings,
    async start() {
        const { default: StegCloak } = await getStegCloak();
        steggo = new StegCloak(true, false);

        addButton("invDecrypt", message => {
            return this.INV_REGEX.test(message?.content)
                ? {
                    label: "Decrypt Message",
                    icon: this.popOverIcon,
                    message: message,
                    channel: ChannelStore.getChannel(message.channel_id),
                    onClick: async () => {
                        await iteratePasswords(message).then((res: string | false) => {
                            if (res) return void this.buildEmbed(message, res);
                            return void buildDecModal({ message });
                        });
                    }
                }
                : null;
        });
    },

    stop() {
        removeButton("invDecrypt");
    },

    // Gets the Embed of a Link
    async getEmbed(url: URL): Promise<Object | {}> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const options: RequestInit = {
            signal: controller.signal,
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                url,
            }),
        };

        // AWS hosted url to discord embed object
        const rawRes = await fetch(this.EMBED_API_URL, options);
        clearTimeout(timeout);

        return await rawRes.json();
    },

    async buildEmbed(message: any, revealed: string): Promise<void> {
        const urlCheck = revealed.match(this.URL_REGEX);

        message.embeds.push({
            type: "rich",
            title: "Decrypted Message",
            color: "0x45f5f5",
            description: revealed,
            footer: {
                text: "Made with ❤️ by c0dine and Sammy!",
            },
        });

        if (urlCheck?.length)
            message.embeds.push(await this.getEmbed(new URL(urlCheck[0])));

        this.updateMessage(message);
    },

    updateMessage: (message: any) => {
        FluxDispatcher.dispatch({
            type: "MESSAGE_UPDATE",
            message,
        });
    },

    chatBarIcon: ErrorBoundary.wrap(ChatBarIcon, { noop: true }),
    popOverIcon: () => <PopOverIcon />,
    indicator: ErrorBoundary.wrap(Indicator, { noop: true })
});

export function encrypt(secret: string, password: string, cover: string): string {
    return steggo.hide(secret + "\u200b", password, cover);
}

export function decrypt(secret: string, password: string, removeIndicator: boolean): string {
    const decrypted = steggo.reveal(secret, password);
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
