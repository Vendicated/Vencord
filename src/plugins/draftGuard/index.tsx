/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType } from "@api/Commands";
import * as DataStore from "@api/DataStore";
import { Button } from "@components/Button";
import { Flex } from "@components/Flex";
import { Paragraph } from "@components/Paragraph";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { filters, waitFor } from "@webpack";
import { ChannelRouter, ChannelStore, Modal, openModal, showToast, UserStore, useState } from "@webpack/common";

const KEY = "DraftGuard";

let drafts: Record<string, { args: any[]; text: string; at: number; }> = {};
let mod: any;
let orig: any;
let timer: any;

function persist() {
    clearTimeout(timer);
    timer = setTimeout(() => DataStore.set(KEY, drafts).catch(console.error), 1500);
}

function hook(this: any, ...args: any[]) {
    const [id, text] = args;
    if (typeof id === "string" && typeof text === "string") {
        if (text.trim()) drafts[id] = { args, text: text.trim(), at: Date.now() };
        else delete drafts[id];
        persist();
    }
    return orig.apply(this, args);
}

function restore(id: string) {
    if (!drafts[id]) return;
    orig.apply(mod, drafts[id].args);
    ChannelRouter.transitionToChannel(id);
    showToast({ text: "Draft restored", variant: "success" });
}

function Drafts(props: any) {
    const [, update] = useState(0);
    const rows = Object.entries(drafts).sort((a, b) => b[1].at - a[1].at);

    return (
        <Modal {...props} size="md" title="Unsent drafts" actions={[{ text: "Close", variant: "primary", onClick: props.onClose }]}>
            <Flex flexDirection="column" gap={12}>
                {!rows.length && <Paragraph>Nothing saved.</Paragraph>}
                {rows.map(([id, d]) => (
                    <Flex key={id} flexDirection="column" gap={6}>
                        <Paragraph>{ChannelStore.getChannel(id)?.name || "DM"} ({Math.round((Date.now() - d.at) / 60000)} min ago)</Paragraph>
                        <Paragraph>{d.text}</Paragraph>
                        <Flex gap={8}>
                            <Button size="small" variant="secondary" onClick={() => restore(id)}>Restore</Button>
                            <Button size="small" variant="dangerSecondary" onClick={() => { delete drafts[id]; persist(); update(n => n + 1); }}>Delete</Button>
                        </Flex>
                    </Flex>
                ))}
            </Flex>
        </Modal>
    );
}

export default definePlugin({
    name: "DraftGuard",
    description: "Keeps a copy of unsent chatbox text so a crash doesn't lose it",
    authors: [Devs.NexzaDev],
    enabledByDefault: false,

    commands: [{
        inputType: ApplicationCommandInputType.BUILT_IN,
        name: "drafts",
        description: "Open your saved unsent drafts",
        execute: () => { openModal(p => <Drafts {...p} />); }
    }],

    flux: {
        MESSAGE_CREATE({ message, optimistic }: any) {
            if (optimistic || message.author?.id !== UserStore.getCurrentUser()?.id) return;
            delete drafts[message.channel_id];
            persist();
        }
    },

    async start() {
        drafts = (await DataStore.get(KEY).catch(() => null)) ?? {};
        waitFor(filters.byProps("clearDraft", "saveDraft"), m => {
            mod = m;
            orig = m.saveDraft;
            m.saveDraft = hook;
        });
    },

    stop() {
        clearTimeout(timer);
        DataStore.set(KEY, drafts).catch(console.error);
        if (mod) mod.saveDraft = orig;
        mod = null;
    }
});
