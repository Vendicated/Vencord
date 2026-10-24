/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getQuestifySettings } from "./access";
import { defaultAllowChangingDangerousSettings, defaultAutoCompleteQuests, defaultAutoCompleteQuestsSimultaneously, defaultAutoCompleteQuestTypes, defaultAutoEnrollQuests, defaultCompleteVideoQuestsQuicker, defaultHideNonAutoCompletableQuests, defaultMakeMobileVideoQuestsDesktopCompatible, defaultPreventVideoQuestsPausing, defaultResumeInterruptedQuests } from "./def";
import { validateIgnoredQuests } from "./ignoredQuests";

export function resetDangerousSettings(): void {
    const settings = getQuestifySettings();

    settings.allowChangingDangerousSettings = defaultAllowChangingDangerousSettings;
    settings.autoEnrollQuests = defaultAutoEnrollQuests;
    settings.autoCompleteQuests = defaultAutoCompleteQuests;
    settings.autoCompleteQuestsSimultaneously = defaultAutoCompleteQuestsSimultaneously;
    settings.completeVideoQuestsQuicker = defaultCompleteVideoQuestsQuicker;
    settings.hideNonAutoCompletableQuests = defaultHideNonAutoCompletableQuests;
    settings.makeMobileVideoQuestsDesktopCompatible = defaultMakeMobileVideoQuestsDesktopCompatible;
    settings.preventVideoQuestsPausing = defaultPreventVideoQuestsPausing;
    settings.resumeInterruptedQuests = defaultResumeInterruptedQuests;
    settings.autoCompleteQuestTypes = { ...defaultAutoCompleteQuestTypes };

    validateIgnoredQuests();
}
