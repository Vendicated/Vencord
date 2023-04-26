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

import * as DataStore from "@api/DataStore";
import { addPreSendListener, removePreSendListener, SendListener } from "@api/MessageEvents";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { useAwaiter } from "@utils/misc";
import definePlugin from "@utils/types";
import { Button, ButtonLooks, ButtonWrapperClasses, ContextMenu, FluxDispatcher, Menu, React, Tooltip } from "@webpack/common";
import { Message } from "discord-types/general";

import { buildAddProfileModal } from "./components/AddProfileModal";

const DATA_KEY = "MEOWCRYPT_PROFILES";
const CURRENT_KEY = "MEOWCRYPT_CURRENT_PROFILE";
const REGEX = /^nya>\.<[0-9a-zA-Z+/]+={0,2}>\.<[0-9a-zA-Z+/]+={0,2}>\.<[0-9a-zA-Z+/]+={0,2}$/;

export interface Profile {
    name: string;
    key: string;
    color: string;
}
const publicProfile: Profile = {
    name: "Public",
    key: "8f5SCpAbDyCdtPTNBwQpYPJVussZFXVaVWP587ZNgZr3uxKGzRLf4naudDBxmdw5",
    color: "FFD700"
};

interface MeowMessage extends Message {
    meowcryptProfile?: string;
}

interface IMessageCreate {
    type: "MESSAGE_CREATE";
    optimistic: boolean;
    isPushNotification: boolean;
    channelId: string;
    message: MeowMessage;
}

// thanks MessageTags plugin :3
const getProfiles = () => DataStore.get(DATA_KEY).then<Profile[]>(p => p ?? []);
const getProfile = (name: string) => DataStore.get(DATA_KEY).then<Profile | null>((p: Profile[]) => (p ?? []).find((p2: Profile) => p2.name === name) ?? null);
export const addProfile = async (profile: Profile) => {
    var profiles = await getProfiles();
    let matchedNew = false;
    profiles.forEach(p => {
        if (p.name === profile.name) matchedNew = true;
    });
    if (matchedNew) {
        await removeProfile(profile.name);
    }
    profiles.push(profile);
    DataStore.set(DATA_KEY, profiles);
    return profiles;
};
const removeProfile = async (name: string) => {
    let profiles = await getProfiles();
    profiles = await profiles.filter((p: Profile) => p.name !== name);
    DataStore.set(DATA_KEY, profiles);
    return profiles;
};

const getCurrentProfile = () => DataStore.get(CURRENT_KEY).then<string>(c => c ?? "Public");
const setCurrentProfile = (name: string) => DataStore.set(CURRENT_KEY, name);

function base64UrlEncode(str: Uint8Array): string {
    return window.btoa(String.fromCharCode(...str));
}

function base64UrlDecode(str: string): Uint8Array {
    return new Uint8Array(window.atob(str).split("").map(c => { return c.charCodeAt(0); }));
}

async function encrypt(text: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(8));
    const block = crypto.getRandomValues(new Uint8Array(16));

    const profile = await getProfile(await getCurrentProfile());
    const pass = new TextEncoder().encode(profile?.key);
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
        base64UrlEncode(salt),
        base64UrlEncode(block),
        base64UrlEncode(cipherArr)
    ].join(">.<");
}

async function decrypt(text: string): Promise<any> {
    const spl = text.split(">.<");
    const one = base64UrlDecode(spl[1]);
    const two = base64UrlDecode(spl[2]);
    const three = base64UrlDecode(spl[3]);

    const profiles = await getProfiles();
    for (const profile of profiles) {
        try {
            const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(profile.key), "PBKDF2", false, ["deriveKey"]);
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

            return [plaintext, profile.name];
        } catch (e) {
            console.log(`error: ${e}`);
        }
    }

    return null;
}

function openContextMenu(event: React.UIEvent) {
    ContextMenu.open(event, () => <ProfilesMenu />);
}

// thanks SilentMessageToggle plugin :3
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
                        onContextMenu={e => openContextMenu(e)}
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

// thanks GreetStickerPicker plugin :3
function ProfilesMenu() {
    const [signal, refetchProfile] = React.useReducer(x => x + 1, 0);
    const [currentProfile] = useAwaiter(getCurrentProfile, { deps: [signal], fallbackValue: "Public" });

    const [profiles] = useAwaiter(async () => {
        const p = await getProfiles();
        let matchedPublic = false;
        p.forEach(async profile => {
            if (profile.name === "Public") matchedPublic = true;
        });
        if (!matchedPublic) {
            const p2 = await addProfile(publicProfile);
            return p2;
        }
        return p;
    }, { fallbackValue: [publicProfile] });

    return (
        <Menu.Menu
            navId="meowcrypt-profiles"
            onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
            aria-label="Meowcrypt Profiles"
        >
            <Menu.MenuGroup label="Profiles">
                {profiles.map(profile => (
                    <Menu.MenuRadioItem
                        key={profile.name}
                        group="meowcrypt-profile"
                        id={"meowcrypt-profile-" + profile.name}
                        label={profile.name}
                        checked={profile.name === currentProfile}
                        action={async () => await setCurrentProfile(profile.name).then(refetchProfile)}
                    />
                ))}
            </Menu.MenuGroup>

            <Menu.MenuSeparator />

            <Menu.MenuGroup
                label="Options"
            >
                <Menu.MenuItem
                    key="add-profile"
                    id="meowcrypt-add-profile"
                    label="Add Profile"
                    action={() => buildAddProfileModal()}
                />

                <Menu.MenuItem
                    key="delete-profile"
                    id="meowcrypt-delete-profile"
                    label="Delete Current Profile"
                    action={async () => await removeProfile(currentProfile).then(async () => await setCurrentProfile("Public").then(refetchProfile))}
                />
            </Menu.MenuGroup>
        </Menu.Menu>
    );
}

export default definePlugin({
    name: "Meowcrypt",
    authors: [Devs.Nebula],
    description: "Fun encryption plugin, contains a public profile for other Meowcrypt users, but you can add your own profiles with custom keys by right clicking the Meowcrypt icon in the chatbox :3",
    patches: [
        {
            find: ".activeCommandOption",
            replacement: {
                match: /"gift"\)\);(?<=(\i)\.push.+?disabled:(\i),.+?)/,
                replace: (m, array, disabled) => `${m};try{${disabled}||${array}.push($self.MeowcryptSend(arguments[0]));}catch{}`
            }
        }
    ],

    flux: {
        async MESSAGE_CREATE(e: IMessageCreate) {
            if (e.optimistic || e.type !== "MESSAGE_CREATE") return;
            if (e.message.state === "SENDING") return;
            if (!e.message.content.startsWith("nya>.<")) return;
            try {
                const matches = REGEX.exec(e.message.content);
                if (matches) {
                    await decrypt(matches[0]).then(async (text: any) => {
                        const msgId = document.getElementById(`message-content-${e.message.id}`);
                        const profile = await getProfile(text[1]);

                        if (text === null) {
                            e.message.content = `${e.message.content} (FAILED TO DECRYPT)`;
                            if (msgId) {
                                msgId.style.color = "red";
                            }
                        } else {
                            e.message.content = text[0];
                            e.message.meowcryptProfile = text[1];

                            if (msgId && profile) {
                                msgId.style.color = `#${profile.color.replace("#", "")}`;
                            }
                        }

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
        }
    },

    MeowcryptSend: ErrorBoundary.wrap(MeowcryptSend, { noop: true }),
});
