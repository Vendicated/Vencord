/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { TimerIcon } from "@plugins/callTimer/TimerIcon";

import { cancelScheduledStatusReset, setStatusDndForDuration } from "../../../registry";
import type { PalettePageSpec, PaletteSuggestion } from "../types";

const DURATION_CHOICES = [
    { id: "15", label: "15 minutes", icon: TimerIcon },
    { id: "30", label: "30 minutes", icon: TimerIcon },
    { id: "45", label: "45 minutes", icon: TimerIcon },
    { id: "60", label: "1 hour", icon: TimerIcon },
    { id: "120", label: "2 hours", icon: TimerIcon },
    { id: "cancel", label: "Cancel active timer", icon: TimerIcon }
] satisfies PaletteSuggestion[];

function resolveDurationId(input: string, selectedId: string | null): string | null {
    if (selectedId && DURATION_CHOICES.some(choice => choice.id === selectedId)) {
        return selectedId;
    }

    const normalized = input.trim().toLowerCase();
    if (!normalized) return null;

    const choice = DURATION_CHOICES.find(entry => entry.label.toLowerCase() === normalized || entry.id === normalized);
    return choice?.id ?? null;
}

const statusTimerPageSpec: PalettePageSpec = {
    id: "status-timer",
    title: "Set DND Timer",
    submitLabel: "Apply",
    fields: [
        {
            key: "duration",
            label: "Duration",
            type: "picker",
            placeholder: "Choose a duration",
            suggestionLimit: DURATION_CHOICES.length
        }
    ],
    resolveSuggestions(fieldKey, query) {
        if (fieldKey !== "duration") return [];
        const trimmed = query.trim().toLowerCase();
        if (!trimmed) return DURATION_CHOICES;
        return DURATION_CHOICES.filter(choice => {
            const label = choice.label.toLowerCase();
            return label.includes(trimmed) || choice.id.includes(trimmed);
        });
    },
    validate(context) {
        const durationId = resolveDurationId(context.values.duration ?? "", context.selectedIds.duration ?? null);
        if (!durationId) return "Choose a duration.";
        return null;
    },
    async submit(context) {
        const durationId = resolveDurationId(context.values.duration ?? "", context.selectedIds.duration ?? null);
        if (!durationId) {
            throw new Error("Choose a duration.");
        }

        if (durationId === "cancel") {
            cancelScheduledStatusReset();
            return;
        }

        const minutes = Number.parseInt(durationId, 10);
        if (!setStatusDndForDuration(minutes)) {
            throw new Error("Unable to set DND timer.");
        }
    }
};

export default statusTimerPageSpec;
