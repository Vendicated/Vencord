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
import EventEmitter from "events";

const cl = classNameFactory("vc-charCounter-");

const settings = definePluginSettings({
    colorEffects: {
        type: OptionType.BOOLEAN,
        description: "Enable yellow/red colouring as you get closer to the character limit",
        default: true,
    },
    selectedText: {
        type: OptionType.BOOLEAN,
        description: "Show the character count of your current text selection",
        default: false,
    },
});

function getCounterColor(percentage: number) {
    if (!settings.store.colorEffects) return "var(--primary-330)";
    if (percentage < 50) return "var(--text-muted)";
    if (percentage < 75) return "var(--yellow-330)";
    if (percentage < 90) return "var(--orange-330)";
    return "var(--red-360)";
}

export default definePlugin({
    name: "CharacterCounter",
    description: "Adds a character counter to the chat input",
    authors: [Devs.thororen],
    tags: ["Utility"],
    settings,
    patches: [
        {
            find: ".CREATE_FORUM_POST||",
            replacement: [
                {
                    match: /(?<=(\i)\.emit\("submit-failure".*?textValue:(\i),editorHeight:\i,channelId:\i\.id\}\)),\i/,
                    replace: ",$self.renderCharCounter({text:$2,eventEmitter:$1})"
                }
            ]
        },
        {
            find: "#{intl::PREMIUM_MESSAGE_LENGTH_UPSELL_TOOLTIP}",
            replacement: {
                match: /return \i\?\i\(\):\i\(\)(?<=#{intl::PREMIUM_MESSAGE_LENGTH_UPSELL_TOOLTIP_WITHOUT_LINK}.{0,200}?)/,
                replace: "return null"
            }
        }
    ],

    renderCharCounter: ErrorBoundary.wrap(({ text, eventEmitter }: { text: string; eventEmitter: EventEmitter; }) => {
        if (!text.length) return null;

        const [selectedCount, setSelectedCount] = useState(0);
        const showSelected = selectedCount > 0;
        const premiumType = UserStore.getCurrentUser().premiumType ?? 0;
        const charMax = premiumType === 2 ? 4000 : 2000;
        const color = getCounterColor((text.length / charMax) * 100);

        useEffect(() => {
            function onSelectionChange() {
                const selection = window.getSelection();
                if (!selection || selection.isCollapsed) {
                    setSelectedCount(0);
                    return;
                }
                setSelectedCount(selection.toString().length);
            }

            eventEmitter.on("selection-changed", onSelectionChange);
            return () => void eventEmitter.off("selection-changed", onSelectionChange);
        }, [eventEmitter]);

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
