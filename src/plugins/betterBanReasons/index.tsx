/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Button, Forms, i18n, TextInput } from "@webpack/common";

function ReasonsComponent() {
    const { reasons } = settings.use(["reasons"]);
    const defaultReasons = [
        i18n.Messages.BAN_REASON_OPTION_SPAM_ACCOUNT,
        i18n.Messages.BAN_REASON_OPTION_HACKED_ACCOUNT,
        i18n.Messages.BAN_REASON_OPTION_BREAKING_RULES
    ];
    if (!reasons) settings.store.reasons = defaultReasons;

    return (
        <Forms.FormSection title="Reasons">
            {reasons.map((reason: string, index: number) => (
                <div
                    className="vc-bbr-reason-wrapper"
                >
                    <TextInput
                        type="text"
                        key={index}
                        value={reason}
                        onChange={(v: string) => {
                            reasons[index] = v;
                            settings.store.reasons = [...reasons];
                        }}
                        placeholder="Reason"
                    />
                    <Button
                        color={Button.Colors.RED}
                        className="vc-bbr-remove-button"
                        onClick={() => {
                            reasons.splice(index, 1);
                            settings.store.reasons = [...reasons];
                        }}
                    >
                        Remove
                    </Button>
                </div>
            ))}
            <div
                className="vc-bbr-reason-wrapper"
            >
                <Button
                    onClick={() => {
                        reasons.push("");
                        settings.store.reasons = [...reasons];
                    }}
                >
                    Add new
                </Button>
                <Button
                    color={Button.Colors.TRANSPARENT}
                    onClick={() => {
                        settings.store.reasons = defaultReasons;
                    }}
                >
                    Reset
                </Button></div>
        </Forms.FormSection>
    );
}

const settings = definePluginSettings({
    reasons: {
        description: "Your custom reasons",
        type: OptionType.COMPONENT,
        component: ReasonsComponent,
    },
    otherOptionDefault: {
        type: OptionType.BOOLEAN,
        description: 'Shows a text input instead of a select menu by default. (Equivalent to clicking the "Other" option)'
    }
});

export default definePlugin({
    name: "BetterBanReasons",
    description: "Create custom reasons to use in the Discord ban modal.",
    authors: [Devs.Inbestigator],
    patches: [
        {
            find: "default.Messages.BAN_MULTIPLE_CONFIRM_TITLE",
            replacement: [{
                match: /=\[[^]*?\]/,
                replace: "=$self.getReasons()"
            },
            {
                match: /useState\(0\)/,
                replace: "useState($self.isOtherDefault())"
            }]
        }
    ],
    getReasons() {
        return settings.store.reasons.map(reason => (
            { name: reason, value: reason }
        ));
    },
    isOtherDefault() {
        return settings.store.otherOptionDefault ? 1 : 0;
    },
    settings,
});
