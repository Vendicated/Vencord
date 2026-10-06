/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import definePlugin, { OptionType } from "@utils/types";
import { useEffect, UserStore, useState } from "@webpack/common";

const cl = classNameFactory("vc-charCounter-");

const settings = definePluginSettings({
    colorEffects: {
        type: OptionType.BOOLEAN,
        description: "Enable yellow/red colouring as you get closer to the character limit",
        default: true,
    }
});

export function getCounterColor(percentage: number) {
    if (!settings.store.colorEffects) return "var(--primary-330)";
    if (percentage < 50) return "var(--text-muted)";
    if (percentage < 75) return "var(--yellow-330)";
    if (percentage < 90) return "var(--orange-330)";
    return "var(--red-360)";
}

export function getCharMax(type?: any, editorRef?: any): number {
    if (
        type?.analyticsName === "voice_channel_status" ||
        editorRef?.current?.props?.type?.analyticsName === "voice_channel_status"
    ) {
        return 500;
    }

    const maxFromProps = editorRef?.current?.props?.maxCharacterCount;
    if (typeof maxFromProps === "number" && maxFromProps > 0) {
        return maxFromProps;
    }

    const premiumType = UserStore.getCurrentUser()?.premiumType ?? 0;
    return premiumType === 2 ? 4000 : 2000;
}

export default definePlugin({
    name: "CharacterCounter",
    description: "Adds a character counter to the chat input",
    authors: [Devs.thororen, Devs.creations],
    tags: ["Utility"],
    settings,
    patches: [
        {
            find: ".CREATE_FORUM_POST||",
            replacement: [
                {
                    match: /(?<=type:(\i),.{0,100}editorRef:(\i),.{0,200}textValue:(\i),editorHeight:\i,channelId:\i\.id\}\)),\i/,
                    replace: ",$self.renderCharCounter({type:$1,editorRef:$2,text:$3})"
                }
            ]
        },
        {
            find: "#{intl::PREMIUM_MESSAGE_LENGTH_UPSELL_TOOLTIP}",
            replacement: {
                match: /(?<=\.PREMIUM_UPSELL\);)(?=.{0,50}\.PREMIUM_UPSELL_VIEWED)/,
                replace: "return null;"
            }
        }
    ],

    renderCharCounter: ErrorBoundary.wrap(({ type, editorRef, text }: { text: string; editorRef: any; type?: any; }) => {
        const [selectedCount, setSelectedCount] = useState(0);
        const showSelected = selectedCount > 0 && (editorRef?.current?.state?.focused ?? false);

        useEffect(() => {
            const listener = () => {
                setSelectedCount(document.getSelection()?.toString()?.length ?? 0);
            };

            document.addEventListener("selectionchange", listener);
            return () => document.removeEventListener("selectionchange", listener);
        }, []);

        if (!text.length) return null;

        const charMax = getCharMax(type, editorRef);
        const color = getCounterColor((text.length / charMax) * 100);

        return (
            <div className={cl("counter")} style={{ color }}>
                {showSelected && (
                    <>
                        <span className={cl("selected")}>{selectedCount}</span>
                        /
                    </>
                )}
                <span className={cl("count")}>{text.length}</span>
                /
                <span className={cl("max")}>{charMax}</span>
            </div>
        );
    }, { noop: true })
});
