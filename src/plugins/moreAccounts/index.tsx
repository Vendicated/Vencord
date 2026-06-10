/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Flex } from "@components/Flex";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Button, Forms, React, useState } from "@webpack/common";

import { countHidden, restoreHiddenAccounts, storageReady } from "./accounts";

let didAutoRestore = false;

function RestoreSection() {
    const [busy, setBusy] = useState(false);
    const [hidden, setHidden] = useState(() => countHidden());
    const [message, setMessage] = useState<string | null>(null);
    const ready = storageReady();

    async function run() {
        setBusy(true);
        setMessage(null);
        try {
            const r = await restoreHiddenAccounts(settings.store.maxAccounts);
            const parts = [`Restored ${r.added} account(s)`];
            if (r.added) parts.push(`${r.valid} valid, ${r.expired} expired`);
            if (r.skippedLimit) parts.push(`${r.skippedLimit} skipped, raise Max Accounts`);
            setMessage(parts.join(", "));
            setHidden(countHidden());
        } catch {
            setMessage("Restore failed, check the console.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <section>
            <Forms.FormTitle>Hidden accounts</Forms.FormTitle>
            <Forms.FormText style={{ marginBottom: 8 }}>
                {!ready
                    ? "couldn't reach Discord's account storage"
                    : hidden > 0
                        ? `${hidden} account(s) have a saved token that the switcher dropped. restore re-adds them. expired ones show "please log in again".`
                        : "nothing hidden, every saved account is already in the switcher"}
            </Forms.FormText>
            <Flex>
                <Button onClick={run} disabled={busy || !ready || hidden === 0}>
                    {busy ? "Restoring..." : hidden > 0 ? `Restore ${hidden} hidden account${hidden === 1 ? "" : "s"}` : "Nothing to restore"}
                </Button>
            </Flex>
            {message && <Forms.FormText style={{ marginTop: 8 }}>{message}</Forms.FormText>}
        </section>
    );
}

const settings = definePluginSettings({
    maxAccounts: {
        type: OptionType.NUMBER,
        description: "Max accounts in the switcher. Setting this below your current count logs the extras out",
        default: 50
    },
    autoRestore: {
        type: OptionType.BOOLEAN,
        description: "Re-add hidden accounts to the switcher automatically when you connect",
        default: true
    },
    restore: {
        type: OptionType.COMPONENT,
        description: "Restore hidden accounts",
        component: RestoreSection
    }
});

export default definePlugin({
    name: "MoreAccounts",
    description: "removes the 5 account cap on the switcher",
    authors: [Devs.hxe3],
    tags: ["Customisation"],
    settings,

    get max() {
        const n = Math.floor(Number(settings.store.maxAccounts));
        return Number.isFinite(n) && n >= 5 ? n : 50;
    },

    flux: {
        CONNECTION_OPEN() {
            if (didAutoRestore || !settings.store.autoRestore) return;
            didAutoRestore = true;
            setTimeout(() => restoreHiddenAccounts(settings.store.maxAccounts).catch(() => void 0), 1500);
        }
    },

    patches: [
        {
            find: 'persistKey="MultiAccountStore"',
            replacement: {
                match: /(\(\i=\i\)\.length>)5(&&\i\.splice\()5(\))/,
                replace: "$1$self.max$2$self.max$3"
            }
        },
        {
            find: "maxNumAccounts:",
            replacement: {
                match: /(\.length>=)5(\?\i\(!0\))/,
                replace: "$1$self.max$2"
            }
        }
    ]
});
