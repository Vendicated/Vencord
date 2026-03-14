/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { CalculatorViewMode } from "../../calculator/types";
import type { CommandActionIntent } from "../../registry";
import type { PalettePageRef } from "../pages/types";

interface DispatchPaletteActionIntentInput {
    intent: CommandActionIntent;
    executePrimary(): Promise<void>;
    executeSecondary(actionKey: string): Promise<void>;
    togglePin(commandId: string): Promise<void>;
    openPage(page: PalettePageRef): void;
    openDrilldown(categoryId: string): void;
    submitActivePage(): Promise<void>;
    goBack(): void;
    setCalculatorViewMode(mode: CalculatorViewMode): void;
    copyCalculatorResult(mode: "formatted" | "raw" | "qa"): Promise<void>;
}

export async function dispatchPaletteActionIntent({
    intent,
    executePrimary,
    executeSecondary,
    togglePin,
    openPage,
    openDrilldown,
    submitActivePage,
    goBack,
    setCalculatorViewMode,
    copyCalculatorResult
}: DispatchPaletteActionIntentInput): Promise<void> {
    switch (intent.type) {
        case "execute-primary":
            await executePrimary();
            return;
        case "execute-secondary":
            await executeSecondary(intent.actionKey);
            return;
        case "toggle-pin":
            await togglePin(intent.commandId);
            return;
        case "open-page":
            openPage(intent.page);
            return;
        case "open-drilldown":
            openDrilldown(intent.categoryId);
            return;
        case "submit-active-page":
            await submitActivePage();
            return;
        case "go-back":
            goBack();
            return;
        case "toggle-calculator-view":
            setCalculatorViewMode(intent.mode);
            return;
        case "copy-calculator":
            await copyCalculatorResult(intent.mode);
            return;
    }
}
