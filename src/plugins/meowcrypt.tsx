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

import { addPreSendListener, removePreSendListener, SendListener } from "@api/MessageEvents";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Button, ButtonLooks, ButtonWrapperClasses, FluxDispatcher, React, Tooltip } from "@webpack/common";
import { Message } from "discord-types/general";

const regex = /^nya>\.<[0-9a-zA-Z+/]+={0,2}>\.<[0-9a-zA-Z+/]+={0,2}>\.<[0-9a-zA-Z+/]+={0,2}$/;

interface IMessageCreate {
    type: "MESSAGE_CREATE";
    optimistic: boolean;
    isPushNotification: boolean;
    channelId: string;
    message: Message;
}

function base64urlencode(str: Uint8Array): string {
    const b64 = btoa(String.fromCharCode.apply(null, str));
    return b64;
}

function base64urldecode(str: string): Uint8Array {
    return new Uint8Array(atob(str).split("").map(c => { return c.charCodeAt(0); }));
}

async function encrypt(text: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(8));
    const block = crypto.getRandomValues(new Uint8Array(16));

    const pass = new TextEncoder().encode("8f5SCpAbDyCdtPTNBwQpYPJVussZFXVaVWP587ZNgZr3uxKGzRLf4naudDBxmdw5");
    const key = await crypto.subtle.importKey(
        "raw",
        pass,
        { name: "PBKDF2" },
        false,
        ["deriveBits", "deriveKey"]
    );

    const newKey = await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 50000,
            hash: "SHA-512"
        },
        key,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt"]
    );

    const cipher = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: block
        },
        newKey,
        new TextEncoder().encode(text)
    );
    const cipherArr = new Uint8Array(cipher);

    return [
        "nya",
        base64urlencode(salt),
        base64urlencode(block),
        base64urlencode(cipherArr)
    ].join(">.<");
}

async function decrypt(text: string): Promise<string> {
    const spl = text.split(">.<");
    const one = base64urldecode(spl[1]);
    const two = base64urldecode(spl[2]);
    const three = base64urldecode(spl[3]);
    const pass = new TextEncoder().encode("8f5SCpAbDyCdtPTNBwQpYPJVussZFXVaVWP587ZNgZr3uxKGzRLf4naudDBxmdw5");

    const key = await crypto.subtle.importKey("raw", pass, "PBKDF2", false, ["deriveKey"]);
    const newKey = await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: one,
            iterations: 50000,
            hash: "SHA-512"
        },
        key,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"]
    );

    const cipher = await crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: two
        },
        newKey,
        three
    );
    const plaintext = new TextDecoder().decode(cipher);

    return plaintext;
}

function MeowcryptSend(chatBoxProps: {
    type: {
        analyticsName: string;
    };
}) {
    const [enabled, setEnabled] = React.useState(false);

    React.useEffect(() => {
        const listener: SendListener = async (_, message) => {
            if (enabled) {
                message.content = await encrypt(message.content);
            }
        };

        addPreSendListener(listener);
        return () => void removePreSendListener(listener);
    }, [enabled]);

    if (chatBoxProps.type.analyticsName !== "normal") return null;

    return (
        <Tooltip text="Toggle Meowcrypt Sending">
            {tooltipProps => (
                <div style={{ display: "flex" }}>
                    <Button
                        {...tooltipProps}
                        onClick={() => setEnabled(prev => !prev)}
                        size=""
                        look={ButtonLooks.BLANK}
                        innerClassName={ButtonWrapperClasses.button}
                        style={{ margin: "0px 8px" }}
                    >
                        <div className={ButtonWrapperClasses.buttonWrapper}>
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                            >
                                <path d="M 6.75 6.75 L 6.75 9 L 14.25 9 L 14.25 6.75 C 14.25 4.679688 12.570312 3 10.5 3 C 8.429688 3 6.75 4.679688 6.75 6.75 Z M 3.75 9 L 3.75 6.75 C 3.75 3.023438 6.773438 0 10.5 0 C 14.226562 0 17.25 3.023438 17.25 6.75 L 17.25 9 L 18 9 C 19.65625 9 21 10.34375 21 12 L 21 21 C 21 22.65625 19.65625 24 18 24 L 3 24 C 1.34375 24 0 22.65625 0 21 L 0 12 C 0 10.34375 1.34375 9 3 9 Z M 3.75 9" />
                                {!enabled && <line x1="22" y1="2" x2="2" y2="22" stroke="var(--red-500)" stroke-width="2.5" />}
                            </svg>
                        </div>
                    </Button>
                </div>
            )}
        </Tooltip>
    );
}

export default definePlugin({
    name: "Meowcrypt",
    authors: [Devs.Nebula],
    description: "Fun encryption plugin, using a public profile for other users.",
    patches: [
        {
            find: ".activeCommandOption",
            replacement: {
                match: /"gift"\)\);(?<=(\i)\.push.+?disabled:(\i),.+?)/,
                replace: (m, array, disabled) => `${m};try{${disabled}||${array}.push($self.MeowcryptSend(arguments[0]));}catch{}`
            }
        }
    ],

    async onMessage(e: IMessageCreate) {
        if (e.optimistic || e.type !== "MESSAGE_CREATE") return;
        if (e.message.state === "SENDING") return;
        if (!e.message.content.startsWith("nya>.<")) return;
        try {
            const matches = regex.exec(e.message.content);
            if (matches) {
                await decrypt(matches[0]).then((text: string) => {
                    e.message.content = text;
                    const { message } = e;
                    FluxDispatcher.dispatch({
                        type: "MESSAGE_UPDATE",
                        message
                    });
                });
            }
        } catch (err) {
            console.log(err);
        }
    },

    start() {
        FluxDispatcher.subscribe("MESSAGE_CREATE", this.onMessage);
    },

    MeowcryptSend: ErrorBoundary.wrap(MeowcryptSend, { noop: true }),
});
