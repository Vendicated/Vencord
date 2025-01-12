/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

function cleanUpText(original: string, corrected: string): string {
    // Remove added leading and trailing quotation marks if they weren't in the original
    const quoteRegex = /^["“”']+|["“”']+$/g;

    // If the original text starts/ends with quotes, preserve them
    const originalStartsWithQuote = /^["“”']/.test(original);
    const originalEndsWithQuote = /["“”']$/.test(original);

    const cleaned = corrected.replace(quoteRegex, "").trim();

    // Restore original leading/trailing quotes if they existed
    return `${originalStartsWithQuote ? '"' : ""}${cleaned}${originalEndsWithQuote ? '"' : ""}`;
}

async function correctTextWithOpenAI(input: string, apiKey: string): Promise<string> {
    if (input.trim().length <= 3) return input;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "user",
                    content: `Please correct only grammar and spelling without altering the meaning or format. Just respond with the raw corrected text:\n\n"${input}"`,
                },
            ],
        }),
    });

    const data = await response.json();

    let correctedText = data.choices?.[0]?.message?.content?.trim() || input;

    // Use the clean-up logic
    correctedText = cleanUpText(input, correctedText);

    return correctedText === input || correctedText.toLowerCase() === input.toLowerCase()
        ? input
        : correctedText;
}

async function correctTextWithLanguageTool(input: string): Promise<string> {
    if (input.trim().length <= 3) return input;

    const response = await fetch("https://api.languagetool.org/v2/check", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            text: input,
            language: "en-US",
        }).toString(),
    });

    const data = await response.json();

    if (data.matches?.length) {
        for (const match of data.matches.reverse()) {
            const { offset, length, replacements } = match;
            if (replacements?.length) {
                input =
                    input.slice(0, offset) +
                    replacements[0].value +
                    input.slice(offset + length);
            }
        }
    }

    // Use the clean-up logic
    return cleanUpText(input, input);
}

export async function correctText(input: string, apiKey: string, service: string): Promise<string> {
    let correctedText;

    try {
        switch (service) {
            case "languagetool":
                correctedText = await correctTextWithLanguageTool(input);
                break;
            case "openai":
            default:
                correctedText = await correctTextWithOpenAI(input, apiKey);
                break;
        }

        return correctedText && correctedText.trim() !== "" ? correctedText : input;
    } catch (error) {
        console.error("[TextCorrector] Error correcting text:", error);
        return input;
    }
}
