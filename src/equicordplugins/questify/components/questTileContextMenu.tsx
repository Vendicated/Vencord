/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { copyToClipboard } from "@utils/clipboard";
import type { Quest } from "@vencord/discord-types";
import { Menu } from "@webpack/common";
import type { ReactNode } from "react";

import { addIgnoredQuest, questIsIgnored, removeIgnoredQuest } from "../settings/ignoredQuests";
import { rerenderQuests } from "../settings/rerender";
import { canAutoCompleteQuest, enrollAndStartQuestAutoComplete, ensureQuestEnrolled, getQuestAutoCompleteEntry, isQuestEnrollmentCompatible, stopQuestAutoComplete } from "../utils/completion";
import { getQuestStatus, QuestStatus, refreshQuest } from "../utils/questState";
import { q } from "../utils/ui";

export function QuestTileContextMenu(
    children: ReactNode[],
    props: { quest?: Quest; },
    isClaimedMenu: boolean = false,
): void {
    const quest = props.quest && refreshQuest(props.quest);

    if (!quest) {
        return;
    }

    const isIgnored = questIsIgnored(quest.id);
    const isEnrolled = Boolean(quest.userStatus?.enrolledAt);
    const isAutoCompleting = getQuestAutoCompleteEntry(quest) != null;
    const canStartAutoComplete = !isClaimedMenu && canAutoCompleteQuest(quest);
    const canEnroll = !isClaimedMenu && !isEnrolled && !quest.userStatus?.completedAt
        && getQuestStatus(quest, []) === QuestStatus.Unclaimed && isQuestEnrollmentCompatible(quest);

    children.unshift((
        <Menu.MenuGroup>
            {canEnroll && (
                <Menu.MenuItem
                    id={q("enroll-in-quest")}
                    label="Enroll in Quest"
                    action={async () => {
                        if ((await ensureQuestEnrolled(quest)).type === "success") {
                            rerenderQuests();
                        }
                    }}
                />
            )}
            {isAutoCompleting ? (
                <Menu.MenuItem
                    id={q("stop-auto-complete")}
                    label="Stop Auto-Complete"
                    action={() => {
                        stopQuestAutoComplete(quest, {
                            manual: true,
                            preserveResume: false,
                            terminalHeartbeat: true,
                        });
                        rerenderQuests();
                    }}
                />
            ) : canStartAutoComplete ? (
                <Menu.MenuItem
                    id={q("start-auto-complete")}
                    label="Start Auto-Complete"
                    action={async () => {
                        if (await enrollAndStartQuestAutoComplete(quest)) {
                            rerenderQuests();
                        }
                    }}
                />
            ) : null}
            {!isClaimedMenu && (!isIgnored ? (
                <Menu.MenuItem
                    id={q("ignore-quest")}
                    label="Mark as Ignored"
                    action={() => addIgnoredQuest(quest.id)}
                />
            ) : (
                <Menu.MenuItem
                    id={q("unignore-quest")}
                    label="Unmark as Ignored"
                    action={() => removeIgnoredQuest(quest.id)}
                />
            ))}
            <Menu.MenuItem
                id={q("copy-quest-id")}
                label="Copy Quest ID"
                action={() => copyToClipboard(quest.id)}
            />
        </Menu.MenuGroup>
    ));
}
