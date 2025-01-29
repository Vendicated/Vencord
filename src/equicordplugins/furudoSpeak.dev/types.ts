/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface FurudoSettings {
    provider: "openai" | "ollama";
    apiKey: string;
    model: string;
    showIcon: string;
    contextMenu: string;
    characterName: string;
    characterDescription: string;
    extraCharacterDescription: string;
    extraInstructions: string;
    exampleOne: string;
    exampleTwo: string;
    exampleThree: string;
}
