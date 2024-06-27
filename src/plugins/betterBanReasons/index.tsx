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
                        onChange={v => {
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
            <Button
                onClick={() => {
                    settings.store.reasons = [...reasons, ""];
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
        default: [],
        component: ReasonsComponent,
    },
    textInputDefault: {
        type: OptionType.BOOLEAN,
        description: 'Shows a text input instead of a select menu by default. (Equivalent to clicking the "Other" option)'
    }
});

export default definePlugin({
    name: "BetterBanReasons",
    description: "Create custom reasons to use in the Discord ban modal, and/or show a text input by default instead of the options.",
    authors: [Devs.Inbestigator],
    patches: [
        {
            find: "Messages.BAN_MULTIPLE_CONFIRM_TITLE",
            replacement: [{
                match: /\[\{name:\i\.\i\.Messages\.BAN_REASON_OPTION_SPAM_ACCOUNT.+?\}\]/,
                replace: "$self.getReasons()"
            },
            {
                match: /useState\(0\)(?=.{0,100}targetUserId:)/,
                replace: "useState($self.isOtherDefault())"
            }]
        }
    ],
    getReasons() {
        return (settings.store.reasons.length ? settings.store.reasons : [
            i18n.Messages.BAN_REASON_OPTION_SPAM_ACCOUNT,
            i18n.Messages.BAN_REASON_OPTION_HACKED_ACCOUNT,
            i18n.Messages.BAN_REASON_OPTION_BREAKING_RULES
        ]).map((reason: string) => (
            { name: reason, value: reason }
        ));
    },
    getDefaultState() {
        return settings.store.textInputDefault ? 1 : 0;
    },
    settings,
});
