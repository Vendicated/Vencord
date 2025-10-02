/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { DataStore } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, SelectedChannelStore, showToast, Toasts, UserStore } from "@webpack/common";

import { buildDecryptModal } from "./decryptModal";
import { buildModal } from "./modal";
import * as openpgp from "./openpgp.mjs";

const ChatBarIcon: ChatBarButtonFactory = ({ isMainChat, channel }) => {
    if (!isMainChat) return null;

    if (!channel || (channel.type !== 1 && channel.type !== 3)) {
        return null; // not a DM or Group DM → don’t render
    }


    return (
        <ChatBarButton
            tooltip="PGP/GPG Encrypt"
            onClick={() => buildModal()}

            buttonProps={{
                "aria-haspopup": "dialog",
            }}

        >
            <svg version="1.1"
                id="Capa_1"
                width="20"
                height="20"
                viewBox="0 0 47 47"
            >
                <g>
                    <path fill="currentColor" d="M23.5,0C10.522,0,0,10.522,0,23.5C0,36.479,10.522,47,23.5,47C36.479,47,47,36.479,47,23.5C47,10.522,36.479,0,23.5,0z
                    M30.07,34.686L30.07,34.686c0,2.53-2.941,4.58-6.573,4.58c-3.631,0-6.577-2.05-6.577-4.58c0-0.494,3.648-14.979,3.648-14.979
                    c-2.024-1.06-3.418-3.161-3.418-5.609c0-3.515,2.838-6.362,6.361-6.362c3.514,0,6.35,2.848,6.35,6.362
                    c0,2.448-1.391,4.55-3.416,5.609c0,0,3.598,14.455,3.611,14.88l0.022,0.099H30.07z" />
                </g>
            </svg>

        </ChatBarButton>
    );
};

function DecryptMessageIcon() {
    return (
        <svg
            fill="currentColor"
            width={20} height={20}
            viewBox={"0 0 16 16"}
        >
            <path d="M10.5 9C12.9853 9 15 6.98528 15 4.5C15 2.01472 12.9853 0 10.5 0C8.01475 0 6.00003 2.01472 6.00003 4.5C6.00003 5.38054 6.25294 6.20201 6.69008 6.89574L0.585815 13L3.58292 15.9971L4.99714 14.5829L3.41424 13L5.00003 11.4142L6.58292 12.9971L7.99714 11.5829L6.41424 10L8.10429 8.30995C8.79801 8.74709 9.61949 9 10.5 9ZM10.5 7C11.8807 7 13 5.88071 13 4.5C13 3.11929 11.8807 2 10.5 2C9.11932 2 8.00003 3.11929 8.00003 4.5C8.00003 5.88071 9.11932 7 10.5 7Z" />
        </svg>
    );
}

function formatKey(key: string): string {
    const start: string = key.match(/-----.*?-----/g)?.at(0)?.toString()!;
    const end: string = key.match(/-----.*?-----/g)?.pop()?.toString()!;

    return start + key.replace(start, "").replace(end, "").replaceAll(" ", "\n") + end;
}

// ./openpgpjs-6.2.2/
export async function encrypt(message: string, public_key_recipient: string): Promise<string> {
    const { encrypt, readKey } = openpgp;
    let private_key, public_key;


    try {
        private_key = await openpgp.readPrivateKey({ armoredKey: formatKey(settings.store.pgpPrivateKey) });
        public_key = await readKey({ armoredKey: formatKey(settings.store.pgpPublicKey) }) as openpgp.PublicKey;
    } catch (e) {
        showToast("Cannot read your private or public key, try setting them again in the plugin settings", Toasts.Type.FAILURE);
        throw e;
    }

    let pubKey_r;
    try {
        pubKey_r = await readKey({ armoredKey: public_key_recipient }) as openpgp.PublicKey;
    } catch (e) {
        showToast("The recipient's public key is not valid!", Toasts.Type.FAILURE);
        throw e;
    }

    try {
        const encrypted = await encrypt({
            message: await openpgp.createMessage({ text: message }),
            encryptionKeys: [pubKey_r, public_key],
            signingKeys: [private_key]
        });

        return encrypted;
    } catch (e) {
        if (e instanceof Error) {
            showToast("Error during encryption.\n" + (e as Error).message, Toasts.Type.FAILURE);
        }
        throw e;
    }
}

async function decryptMessage(message: string, authorId: string): Promise<any> {
    const { decrypt, readKey } = openpgp;
    let private_key;
    try {
        private_key = await openpgp.readPrivateKey({ armoredKey: formatKey(settings.store.pgpPrivateKey) });
    } catch (e) {
        showToast("Cannot read personal private key", Toasts.Type.FAILURE);
        throw e;
    }


    let verificationKeyArmored: string = "";

    // If the author is the current user, use the user's public key for verification
    if (authorId === UserStore.getCurrentUser().id) {
        verificationKeyArmored = formatKey(settings.store.pgpPublicKey);
    } else {
        // Load public keys from DataStore
        try {
            const senderId = ChannelStore.getChannel(SelectedChannelStore.getChannelId()).recipients[0];
            const dataStorageKeys = await DataStore.get("gpgPublicKeys");
            if (dataStorageKeys) {
                const publicKeys = JSON.parse(dataStorageKeys);
                if (publicKeys[senderId]) {
                    verificationKeyArmored = publicKeys[senderId];
                }
            }
        } catch (e) {
            showToast("Cannot find the senders signature", Toasts.Type.FAILURE);
            throw e;
        }
    }

    const verificationKey = await readKey({ armoredKey: verificationKeyArmored }) as openpgp.PublicKey;

    let decrypted;
    try {
        decrypted = await decrypt({
            message: await openpgp.readMessage({ armoredMessage: message }),
            decryptionKeys: [private_key],
            // Set to false to see the message anyways, but will show the key not verified warning
            expectSigned: false,
            verificationKeys: [verificationKey]
        });
    } catch (e) {
        showToast("Cannot decrypt message: check your private key", Toasts.Type.FAILURE);
        throw e;
    }


    // Verify signature
    const { signatures } = decrypted;
    let verified = false;
    if (signatures && signatures.length > 0) {
        try {
            await signatures[0].verified;
            verified = true;
        } catch {
            verified = false;
        }
    }

    return { ...decrypted, verified };
}

const settings = definePluginSettings({
    pgpPrivateKey: {
        type: OptionType.STRING,
        description: "Private PGP/GPG key",
        default: "",
    },
    pgpPublicKey: {
        type: OptionType.STRING,
        description: "Public PGP/GPG key",
        default: "",
    }
});

export default definePlugin({
    name: "VGP",
    description: "Vencord Pgp",
    authors: [{ name: "The Cat", id: 502494485993881613n }, { name: "Nikicoraz", id: 209289029936611328n }],
    settings,

    renderChatBarButton: ChatBarIcon,
    decryptMessageIcon: () => <DecryptMessageIcon />,

    GPG_REGEX: /-----BEGIN PGP MESSAGE-----[A-Za-z0-9+/=\r\n]+?-----END PGP MESSAGE-----/g,
    renderMessagePopoverButton(message) {
        return this.GPG_REGEX.test(message?.content) ?
            {
                label: "Decrypt Message",
                icon: this.decryptMessageIcon,
                message: message,
                channel: ChannelStore.getChannel(message.channel_id),
                onClick: async () => {
                    const decrypted = await decryptMessage(message.content, message.author.id);
                    buildDecryptModal(decrypted.data, decrypted.verified);
                }
            }
            : null;
    },
});
