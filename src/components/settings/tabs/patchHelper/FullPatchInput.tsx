/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Margins } from "@utils/margins";
import { Patch, ReplaceFn } from "@utils/types";
import { Forms, TextArea, useState } from "@webpack/common";

export interface FullPatchInputProps {
    setFind(v: string): void;
    setParsedFind(v: string | RegExp): void;
    setMatch(v: string): void;
    setReplacement(v: string | ReplaceFn): void;
}

export function FullPatchInput({ setFind, setParsedFind, setMatch, setReplacement }: FullPatchInputProps) {
    const [fullPatch, setFullPatch] = useState<string>("");
    const [fullPatchError, setFullPatchError] = useState<string>("");

    function update() {
        if (fullPatch === "") {
            setFullPatchError("");

            setFind("");
            setParsedFind("");
            setMatch("");
            setReplacement("");
            return;
        }

        try {
            const parsed = (0, eval)(`([${fullPatch}][0])`) as Patch;

            if (!parsed.find) throw new Error("No 'find' field");
            if (!parsed.replacement) throw new Error("No 'replacement' field");

            if (parsed.replacement instanceof Array) {
                if (parsed.replacement.length === 0) throw new Error("Invalid replacement");

                parsed.replacement = {
                    match: parsed.replacement[0].match,
                    replace: parsed.replacement[0].replace
                };
            }

            if (!parsed.replacement.match) throw new Error("No 'replacement.match' field");
            if (!parsed.replacement.replace) throw new Error("No 'replacement.replace' field");

            setFind(parsed.find instanceof RegExp ? parsed.find.toString() : parsed.find);
            setParsedFind(parsed.find);
            setMatch(parsed.replacement.match instanceof RegExp ? parsed.replacement.match.source : parsed.replacement.match);
            setReplacement(parsed.replacement.replace);
            setFullPatchError("");
        } catch (e) {
            setFullPatchError((e as Error).message);
        }
    }

    return (
        <>
            <Forms.FormText className={Margins.bottom8}>Paste your full JSON patch here to fill out the fields</Forms.FormText>
            <TextArea value={fullPatch} onChange={setFullPatch} onBlur={update} />
            {fullPatchError !== "" && <Forms.FormText style={{ color: "var(--text-danger)" }}>{fullPatchError}</Forms.FormText>}
        </>
    );
}
