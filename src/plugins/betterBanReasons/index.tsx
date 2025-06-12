/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { DeleteIcon, PlusIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import { getIntlMessage } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { Button, Forms, TextInput } from "@webpack/common";

const cl = classNameFactory("vc-bbr-");

function ReasonsComponent() {
    const { reasons } = settings.store;

    return (
        <Forms.FormSection title="Reasons">
            {reasons.map((r, i) => (
                <div
                    key={i}
                    className={cl("reason-wrapper")}
                >
                    <TextInput
                        value={r}
                        onChange={v => {
                            reasons[i] = v;
                            settings.store.reasons = reasons;
                        }}
                        placeholder="Reason"
                    />
                    <Button
                        className={cl("remove-button")}
                        color={Button.Colors.TRANSPARENT}
                        onClick={() => {
                            reasons.splice(i, 1);
                            settings.store.reasons = reasons;
                        }}
                        look={Button.Looks.BLANK}
                        size={Button.Sizes.MIN}
                    >
                        <DeleteIcon />
                    </Button>
                </div>
            ))}
            <div className={cl("reason-wrapper")}>
                <Button onClick={() => settings.store.reasons.push("")} className={cl("add-button")} size={Button.Sizes.LARGE} color={Button.Colors.TRANSPARENT}>
                    <PlusIcon /> Add another reason
                </Button>
            </div>
        </Forms.FormSection>
    );
}

const settings = definePluginSettings({
    reasons: {
        description: "Your custom reasons",
        type: OptionType.COMPONENT,
        default: [] as string[],
        component: ReasonsComponent,
    },
    isOtherDefault: {
        type: OptionType.BOOLEAN,
        description: "Selects the other option by default. (Shows a text input)"
    }
});

export default definePlugin({
    name: "BetterBanReasons",
    description: "Create custom reasons to use in the Discord ban modal, and/or show a text input by default instead of the options.",
    authors: [Devs.Inbestigator],
    patches: [
        {
            find: 'username:"@"',
            replacement: [{
                match: /\[({name:.+?,value:.+?},){2}{name:.+?,value:"other"}\]/,
                replace: "$self.getReasons($1)"
            },
            {
                match: /useState\(""\)(?=.{0,100}isArchivedThread)/,
                replace: "useState($self.getDefaultState())"
            }]
        }
    ],
    getReasons() {
        const storedReasons = settings.store.reasons.filter((r: string) => r.trim());
        const reasons: string[] = storedReasons.length
            ? storedReasons
            : [
                getIntlMessage("BAN_REASON_OPTION_SPAM_ACCOUNT"),
                getIntlMessage("BAN_REASON_OPTION_HACKED_ACCOUNT"),
                getIntlMessage("BAN_REASON_OPTION_BREAKING_RULES"),
            ];
        return reasons.map(s => ({ name: s, value: s })).concat({ name: getIntlMessage("BAN_REASON_OPTION_OTHER"), value: "other" });
    },
    getDefaultState: () => settings.store.isOtherDefault ? "other" : "",
    settings,
});
