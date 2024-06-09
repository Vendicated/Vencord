/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Button, Forms, TextInput, useEffect, useState } from "@webpack/common";

function ReasonsComponent() {
    const [reasons, setReasons] = useState(settings.store.reasons as string[]);

    useEffect(() => {
        settings.store.reasons = reasons;
    }, [reasons]);

    return (
        <Forms.FormSection title="Reasons">
            {reasons.map((reason, index) => (
                <div
                    style={{
                        display: "grid",
                        padding: 0,
                        paddingBottom: "0.5rem",
                        gap: "0.5rem",
                        gridTemplateColumns: "auto",
                    }}
                >
                    <TextInput
                        style={{ flex: 1 }}
                        type="text"
                        key={index}
                        value={reason}
                        onChange={(value: string) => {
                            reasons[index] = value;
                            setReasons([...reasons]);
                        }}
                        placeholder="Reason"
                    />
                    <Button
                        color={Button.Colors.RED}
                        style={{ height: "100%" }}
                        size={Button.Sizes.MIN}
                        onClick={() => {
                            reasons.splice(index, 1);
                            setReasons([...reasons]);
                        }}
                    >
                        Remove
                    </Button>
                </div>
            ))}
            <Button
                size={Button.Sizes.SMALL}
                onClick={() => {
                    reasons.push("");
                    setReasons([...reasons]);
                }}
            >
                Add new
            </Button>
        </Forms.FormSection>
    );
}

const settings = definePluginSettings({
    reasons: {
        description: "Your custom reasons",
        type: OptionType.COMPONENT,
        default: [
            "Suspicious or spam account",
            "Compromised or spam account",
            "Breaking server rules",
        ],
        component: ReasonsComponent,
    },
});

export default definePlugin({
    name: "CustomBanReasons",
    description: "Create custom reasons to use in the Discord ban modal.",
    authors: [Devs.Inbestigator],
    patches: [
        {
            find: 'username:"@".concat(_.default.getName',
            replacement: {
                match: /U=\[([\s\S]*?)\]/,
                replace: "U=$self.getReasons()",
            },
        },
    ],
    getReasons: (): { name: string; value: string; }[] => {
        return settings.store.reasons.map((reason: string) => {
            return { name: reason, value: reason };
        });
    },
    settings,
});
