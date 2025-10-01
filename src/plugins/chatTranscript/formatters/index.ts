/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Message } from "@vencord/discord-types";

import type { FormatOptions } from "../types";
import { buildHtmlTranscript } from "./html";
import { buildJsonTranscript } from "./json";
import { buildMarkdownTranscript } from "./markdown";

interface TranscriptFile {
    content: string;
    mime: string;
    extension: string;
    filenameHint: string;
}

function formatTranscript(messages: Message[], options: FormatOptions): TranscriptFile {
    switch (options.format) {
        case "markdown":
            return buildMarkdownTranscript(messages, options);
        case "json":
            return buildJsonTranscript(messages, options);
        case "html":
        default:
            return buildHtmlTranscript(messages, options);
    }
}

export type { TranscriptFile };
export { formatTranscript };

