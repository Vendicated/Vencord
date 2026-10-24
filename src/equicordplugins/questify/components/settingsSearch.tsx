/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "../settings.css";

import { showToast, TextInput, useEffect, useState } from "@webpack/common";
import type { JSX, KeyboardEvent } from "react";

import { getQuestifySettings } from "../settings/access";
import { setSettingsSearchQuery, useSettingsSearchMatchCount, useSettingsSearchQuery } from "../settings/search";
import { q } from "../utils/ui";

const KONAMI_CODE_LABEL = "Konami Code";
const KONAMI_ARROWS: Record<string, string> = { ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→" };

export function SettingsSearch(): JSX.Element {
    const query = useSettingsSearchQuery();
    const matchCount = useSettingsSearchMatchCount();
    const [inputValue, setInputValue] = useState(query);

    useEffect(() => {
        if (!inputValue.trim() || inputValue === KONAMI_CODE_LABEL) {
            setSettingsSearchQuery("");
            return;
        }

        const timeout = setTimeout(() => setSettingsSearchQuery(inputValue), 250);

        return () => clearTimeout(timeout);
    }, [inputValue]);

    useEffect(() => () => setSettingsSearchQuery(""), []);

    function handleChange(value: string): void {
        const code = value.toLowerCase().replace(/[\s,]/g, "")
            .replace(/up/g, "↑").replace(/down/g, "↓").replace(/left/g, "←").replace(/right/g, "→");

        if (code === "↑↑↓↓←→←→ba") {
            const settings = getQuestifySettings();
            settings.usedKonamiCode = settings.usedKonamiCode !== true;
            showToast({ text: `Quest Automation ${settings.usedKonamiCode ? "Unlocked" : "Locked"}.`, variant: "success", duration: 5000 });
            setInputValue(KONAMI_CODE_LABEL);
            setSettingsSearchQuery("");
            return;
        }

        setInputValue(value);
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.nativeEvent.isComposing) return;
        const arrow = KONAMI_ARROWS[event.key];
        if (!arrow) return;

        const input = event.target;
        if (!(input instanceof HTMLInputElement)) return;

        event.preventDefault();

        const isCodeLabel = input.value === KONAMI_CODE_LABEL;
        const start = isCodeLabel ? 0 : input.selectionStart ?? input.value.length;
        const end = isCodeLabel ? input.value.length : input.selectionEnd ?? start;
        input.setRangeText(arrow, start, end, "end");
        handleChange(input.value);
    }

    return (
        <div className={q("settings-search")}>
            <TextInput
                type="search"
                aria-label="Search Questify Settings"
                placeholder="Search Questify Settings..."
                value={inputValue}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
            />
            {query.trim() && matchCount === 0 && (
                <div className={q("settings-search-empty")} role="status">No matching settings.</div>
            )}
        </div>
    );
}
