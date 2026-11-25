/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Paragraph } from "@components/Paragraph";
import { Patch } from "@utils/types";
import { TextArea, useEffect, useRef, useState } from "@webpack/common";

interface FullPatchInputProps {
    onPatch(patch: Pick<Patch, "find" | "replacement"> | undefined): void;
}

export function FullPatchInput({ onPatch }: FullPatchInputProps) {
    const [patch, setPatch] = useState<string>("");
    const [error, setError] = useState<string>("");

    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const hasEdits = useRef(false);

    function update() {
        if (!hasEdits.current) {
            return;
        }
        hasEdits.current = false;

        if (patch.trim() === "") {
            setError("");
            onPatch(undefined);
            return;
        }

        try {
            const { find, replacement } = (0, eval)(`([${patch}][0])`) as Patch;
            if (!find || (typeof find !== "string" && !(find instanceof RegExp))) {
                throw new Error("Expected a string or RegExp in 'find'");
            }

            const replacements = Array.isArray(replacement) ? replacement : [replacement];
            if (!replacement || replacements.length === 0) {
                throw new Error("No replacements to test");
            }

            for (const [index, entry] of replacements.entries()) {
                const label = `Replacement ${index + 1}`;
                if (!entry?.match || (typeof entry.match !== "string" && !(entry.match instanceof RegExp))) {
                    throw new Error(`${label} needs a string or RegExp match`);
                }
                if (typeof entry.replace !== "string" && typeof entry.replace !== "function") {
                    throw new Error(`${label} needs a string or function replacement`);
                }
            }

            onPatch({ find, replacement });
            setError("");
        } catch (e) {
            setError((e as Error).message);
            onPatch(undefined);
        }
    }

    useEffect(() => {
        const { current: textArea } = textAreaRef;
        if (textArea) {
            textArea.style.height = "auto";
            textArea.style.height = `${Math.min(textArea.scrollHeight, 224)}px`;
        }
    }, [patch]);

    return (
        <>
            <Paragraph>
                Paste a full patch here. Edit replacement arrays in this field.
            </Paragraph>
            <TextArea
                aria-label="Full patch"
                rows={4}
                inputRef={textAreaRef}
                value={patch}
                onChange={value => {
                    hasEdits.current = true;
                    setPatch(value);
                }}
                onBlur={update}
            />
            {error !== "" && <Paragraph style={{ color: "var(--text-feedback-critical)" }}>{error}</Paragraph>}
        </>
    );
}
