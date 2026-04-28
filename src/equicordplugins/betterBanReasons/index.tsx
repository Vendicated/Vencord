/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import { Heading } from "@components/Heading";
import { DeleteIcon, PlusIcon } from "@components/Icons";
import { Devs, EquicordDevs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import definePlugin, { OptionType } from "@utils/types";
import { Button, Select, TextInput, useState } from "@webpack/common";

const cl = classNameFactory("vc-bbr-");

interface BanReason {
    text: string;
    deleteSeconds?: number;
}

const DELETE_DURATION_OPTIONS = [
    { label: "Discord default", value: null },
    { label: "Don't delete any", value: 0 },
    { label: "Previous hour", value: 3600 },
    { label: "Previous 6 hours", value: 21600 },
    { label: "Previous 12 hours", value: 43200 },
    { label: "Previous 24 hours", value: 86400 },
    { label: "Previous 3 days", value: 259200 },
    { label: "Previous 7 days", value: 604800 },
];

function normalizeReason(r: BanReason | string): BanReason {
    return typeof r === "string" ? { text: r } : r;
}

function getStoredReasons(): BanReason[] {
    return (settings.store.reasons as (BanReason | string)[]).map(normalizeReason);
}

function ReasonsComponent() {
    const [reasons, setReasons] = useState<BanReason[]>(getStoredReasons);

    const update = (next: BanReason[]) => {
        setReasons(next);
        settings.store.reasons = next;
    };

    return (
        <section>
            <Heading>Reasons</Heading>
            {reasons.map((r, i) => (
                <div key={i} className={cl("reason-wrapper")}>
                    <TextInput
                        value={r.text}
                        onChange={v => update(reasons.map((x, j) => j === i ? { ...x, text: v } : x))}
                        placeholder="Reason"
                    />
                    <Button
                        className={cl("remove-button")}
                        color={Button.Colors.TRANSPARENT}
                        onClick={() => update(reasons.filter((_, j) => j !== i))}
                        look={Button.Looks.FILLED}
                        size={Button.Sizes.MIN}
                    >
                        <DeleteIcon />
                    </Button>
                    <div className={cl("duration-row")}>
                        <span className="vc-text-base vc-text-sm vc-text-normal vc-text-defaultColor vc-plugins-setting-description">Message Auto-delete duration</span>
                        <Select
                            options={DELETE_DURATION_OPTIONS}
                            select={v => update(reasons.map((x, j) => j === i ? { ...x, deleteSeconds: v === null ? undefined : v } : x))}
                            isSelected={v => (v ?? null) === (r.deleteSeconds ?? null)}
                            serialize={v => v == null ? "default" : String(v)}
                        />
                    </div>
                </div>
            ))}
            <div className={cl("reason-wrapper")}>
                <Button
                    onClick={() => update([...reasons, { text: "" }])}
                    className={cl("add-button")}
                    size={Button.Sizes.LARGE}
                    color={Button.Colors.TRANSPARENT}
                >
                    <PlusIcon /> Add another reason
                </Button>
            </div>
        </section>
    );
}

const settings = definePluginSettings({
    reasons: {
        description: "Your custom reasons",
        type: OptionType.COMPONENT,
        default: [] as BanReason[],
        component: ReasonsComponent,
    },
    isTextInputDefault: {
        type: OptionType.BOOLEAN,
        description: 'Shows a text input instead of a select menu by default. (Equivalent to clicking the "Other" option)'
    }
});

export default definePlugin({
    name: "BetterBanReasons",
    description: "Create custom reasons to use in the Discord ban modal, and/or show a text input by default instead of the options.",
    tags: ["Appearance", "Customisation"],
    authors: [Devs.Inbestigator, EquicordDevs.yonn2222],

    durationSetter: null as ((v: number) => void) | null,

    patches: [
        {
            find: "#{intl::BAN_REASON_OPTION_SPAM_ACCOUNT}",
            replacement: [
                {
                    match: /(\[\{name:\i\.\i\.\i\(\i\.\i\.\i\),.+?"other"\}\])/,
                    replace: "$self.getReasons($1)"
                },
                {
                    match: /useState\(null\)(?=.{0,300}targetUserId:)/,
                    replace: "useState($self.getDefaultState())"
                },
                {
                    match: /(\[\i,\i\])=(\i)\.useState\((null!=\i\?\i:\i)\)/,
                    replace: "$1=$self.captureDeleteState($2.useState,$3)"
                },
                {
                    match: /\i=\i\.useCallback\((\i)=>\{.{0,10},\i\(null\)(?=\},\[\]\))/,
                    replace: "$&,$self.onReasonSelect($1)"
                }
            ]
        }
    ],

    getReasons(defaults: { name: string; value: string; }[]) {
        const stored = getStoredReasons().filter(r => r.text.trim());
        return [
            ...stored.map(r => ({ name: r.text, value: r.text })),
            ...defaults,
        ];
    },

    getDefaultState: () => settings.store.isTextInputDefault ? 1 : 0,

    captureDeleteState(hook: (initial: number) => [number, (v: number) => void], initial: number) {
        const result = hook(initial);
        this.durationSetter = result[1];
        return result;
    },

    onReasonSelect(value: string) {
        const reason = getStoredReasons().find(r => r.text === value);
        if (reason?.deleteSeconds !== undefined) {
            this.durationSetter?.(reason.deleteSeconds);
        }
    },

    settings,
});
