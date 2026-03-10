/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Margins } from "@utils/margins";
import { Patch, ReplaceFn } from "@utils/types";
import { Forms, TextArea, useEffect, useRef, useState } from "@webpack/common";

export interface FullPatchInputProps {
    setFind(v: string): void;
    setParsedFind(v: string | RegExp): void;
    setMatch(v: string): void;
    setReplacement(v: string | ReplaceFn): void;
}

export function FullPatchInput({ setFind, setParsedFind, setMatch, setReplacement }: FullPatchInputProps) {
    const [patch, setPatch] = useState<string>("");
    const [error, setError] = useState<string>("");

    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    function update() {
        if (patch === "") {
            setError("");

            setFind("");
            setParsedFind("");
            setMatch("");
            setReplacement("");
            return;
        }

        try {
            let { find, replacement } = (0, eval)(`([${patch}][0])`) as Patch;

            if (!find) throw new Error("No 'find' field");
            if (!replacement) throw new Error("No 'replacement' field");

            if (replacement instanceof Array) {
                if (replacement.length === 0) throw new Error("Invalid replacement");

                // Only test the first replacement
                replacement = replacement[0];
            }

            if (!replacement.match) throw new Error("No 'replacement.match' field");
            if (replacement.replace == null) throw new Error("No 'replacement.replace' field");

            setFind(find instanceof RegExp ? `/${find.source}/` : find);
            setParsedFind(find);
            setMatch(replacement.match instanceof RegExp ? replacement.match.source : replacement.match);
            setReplacement(replacement.replace);
            setError("");
        } catch (e) {
            setError((e as Error).message);
        }
    }

    useEffect(() => {
        const { current: textArea } = textAreaRef;
        if (textArea) {
            textArea.style.height = "auto";
            textArea.style.height = `${textArea.scrollHeight}px`;
        }
    }, [patch]);

    return (
        <>
            <Forms.FormText className={Margins.bottom8}>
                Paste your full JSON patch here to fill out the fields
            </Forms.FormText>
            <TextArea
                inputRef={textAreaRef}
                value={patch}
                onChange={setPatch}
                onBlur={update}
            />
            {error !== "" && <Forms.FormText style={{ color: "var(--text-feedback-critical)" }}>{error}</Forms.FormText>}
        </>
    );
}
