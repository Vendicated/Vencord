/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import "./styles.css";

import { Button } from "@components/Button";
import { CodeBlock } from "@components/CodeBlock";
import { Flex } from "@components/Flex";
import { Heading } from "@components/Heading";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { findPatchTarget, PatchTarget } from "@debug/testPatch";
import { debounce } from "@shared/debounce";
import { copyWithToast } from "@utils/discord";
import { Patch, PatchReplacement } from "@utils/types";
import { React, TextInput, useMemo, useState } from "@webpack/common";

import { FullPatchInput } from "./FullPatchInput";
import { PatchPreview } from "./PatchPreview";
import { isReplacementMethod, ReplacementDraft, ReplacementInput } from "./ReplacementInput";

function formatReplacement({ match, replace }: PatchReplacement, indent: string) {
    const matchCode = match instanceof RegExp ? match.toString() : JSON.stringify(match);
    const replaceCode = typeof replace === "function" ? replace.toString() : JSON.stringify(replace);
    const replacementLine = typeof replace === "function" && isReplacementMethod(replaceCode)
        ? replaceCode
        : `replace: ${replaceCode}`;

    return [
        "{",
        `${indent}    match: ${matchCode},`,
        `${indent}    ${replacementLine}`,
        `${indent}}`
    ].join("\n");
}

const findCandidates = debounce(function ({ find, setTarget, setError }) {
    if (!find) {
        return;
    }

    const result = findPatchTarget(find);
    if (result.ok) {
        setTarget(result.target);
    } else if (result.matchCount === 0) {
        setError("No match. Perhaps that module is lazy loaded?");
    } else {
        setError("Multiple matches. Please refine your filter");
    }
});

function PatchHelper() {
    const [find, setFind] = useState("");
    const [match, setMatch] = useState("");
    const [replacement, setReplacement] = useState<ReplacementDraft>({ value: "", isFunction: false });
    const [replacementArray, setReplacementArray] = useState<PatchReplacement[]>();

    const [parsedFind, setParsedFind] = useState<string | RegExp>("");
    const [parsedMatch, setParsedMatch] = useState<PatchReplacement["match"]>();

    const [findError, setFindError] = useState<string>();
    const [matchError, setMatchError] = useState<string>();
    const [target, setTarget] = useState<PatchTarget>();

    const replacements = useMemo(() => {
        if (replacementArray) {
            return replacementArray;
        }
        return parsedMatch && !replacement.error
            ? [{ match: parsedMatch, replace: replacement.value }]
            : [];
    }, [parsedMatch, replacement, replacementArray]);

    const code = useMemo(() => {
        if (!parsedFind || !replacements.length) {
            return "";
        }

        const find = parsedFind instanceof RegExp ? parsedFind.toString() : JSON.stringify(parsedFind);
        let replacementCode: string;
        if (replacementArray) {
            const entries = replacements.map(entry => "        " + formatReplacement(entry, "        "));
            replacementCode = `[\n${entries.join(",\n")}\n    ]`;
        } else {
            replacementCode = formatReplacement(replacements[0], "    ");
        }

        return `{\n    find: ${find},\n    replacement: ${replacementCode}\n}`;
    }, [parsedFind, replacements, replacementArray]);

    function onFindChange(v: string, parsed?: Patch["find"]) {
        setFind(v);
        setTarget(undefined);

        try {
            const find = parsed ?? (/^\/.+?\/$/.test(v) ? new RegExp(v.slice(1, -1)) : v);
            setFindError(void 0);
            setParsedFind(find);
            findCandidates({ find, setTarget, setError: setFindError });
        } catch (e: any) {
            setParsedFind("");
            findCandidates({ find: "", setTarget, setError: setFindError });
            setFindError((e as Error).message);
        }
    }

    function onMatchChange(v: string, parsed?: PatchReplacement["match"]) {
        setMatch(v);

        try {
            setParsedMatch(v ? parsed ?? new RegExp(v) : undefined);
            setMatchError(void 0);
        } catch (e: any) {
            setParsedMatch(undefined);
            setMatchError((e as Error).message);
        }
    }

    function onFullPatch(patch: Pick<Patch, "find" | "replacement"> | undefined) {
        onFindChange(patch?.find.toString() ?? "", patch?.find);
        const replacement = patch?.replacement;
        if (!replacement || Array.isArray(replacement)) {
            setReplacementArray(replacement);
            onMatchChange("");
            setReplacement({ value: "", isFunction: false });
            return;
        }

        setReplacementArray(undefined);
        const { match, replace } = replacement;
        onMatchChange(match instanceof RegExp ? match.source : match, match);
        setReplacement({ value: replace, isFunction: typeof replace === "function" });
    }

    return (
        <SettingsTab>
            <Flex flexDirection="column" gap={24}>
                <Flex flexDirection="column" gap={8}>
                    <Heading tag="h4">Full patch</Heading>
                    <FullPatchInput onPatch={onFullPatch} />
                </Flex>

                <Flex flexDirection="column" gap={8}>
                    <Heading>Find</Heading>
                    <TextInput
                        type="text"
                        aria-label="Find"
                        value={find}
                        onChange={v => onFindChange(v)}
                        error={findError}
                    />
                </Flex>

                {!replacementArray && (
                    <>
                        <Flex flexDirection="column" gap={8}>
                            <Heading>Match</Heading>
                            <TextInput
                                type="text"
                                aria-label="Match"
                                value={match}
                                onChange={v => onMatchChange(v)}
                                error={matchError}
                            />
                        </Flex>
                        <ReplacementInput draft={replacement} onChange={setReplacement} />
                    </>
                )}

                {target && replacements.length > 0 && (
                    <PatchPreview target={target} replacements={replacements} />
                )}

                {code && (
                    <Flex flexDirection="column" gap={12}>
                        <Heading tag="h4">Code</Heading>
                        <CodeBlock lang="js" content={code} />
                        <Flex flexWrap="wrap" gap={8}>
                            <Button onClick={() => copyWithToast(code)}>
                                Copy to Clipboard
                            </Button>
                            <Button onClick={() => copyWithToast("```ts\n" + code + "\n```")}>
                                Copy as Codeblock
                            </Button>
                        </Flex>
                    </Flex>
                )}
            </Flex>
        </SettingsTab>
    );
}

export default !IS_STANDALONE ? wrapTab(PatchHelper, "PatchHelper") : null;
