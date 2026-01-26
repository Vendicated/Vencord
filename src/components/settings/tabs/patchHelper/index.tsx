/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { CodeBlock } from "@components/CodeBlock";
import { Divider } from "@components/Divider";
import { Flex } from "@components/Flex";
import { HeadingTertiary } from "@components/Heading";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { debounce } from "@shared/debounce";
import { copyWithToast } from "@utils/discord";
import { Margins } from "@utils/margins";
import { stripIndent } from "@utils/text";
import { ReplaceFn } from "@utils/types";
import { search } from "@webpack";
import { React, TextInput, useMemo, useState } from "@webpack/common";

import { FullPatchInput } from "./FullPatchInput";
import { PatchPreview } from "./PatchPreview";
import { ReplacementInput } from "./ReplacementInput";

const findCandidates = debounce(function ({ find, setModule, setError }) {
    const candidates = search(find);
    const keys = Object.keys(candidates);
    const len = keys.length;

    if (len === 0)
        setError("No match. Perhaps that module is lazy loaded?");
    else if (len !== 1)
        setError("Multiple matches. Please refine your filter");
    else
        setModule([keys[0], candidates[keys[0]]]);
});

function PatchHelper() {
    const [find, setFind] = useState("");
    const [match, setMatch] = useState("");
    const [replacement, setReplacement] = useState<string | ReplaceFn>("");

    const [parsedFind, setParsedFind] = useState<string | RegExp>("");

    const [findError, setFindError] = useState<string>();
    const [matchError, setMatchError] = useState<string>();
    const [replacementError, setReplacementError] = useState<string>();

    const [module, setModule] = useState<[number, Function]>();

    const code = useMemo(() => {
        const find = parsedFind instanceof RegExp ? parsedFind.toString() : JSON.stringify(parsedFind);
        const replace = typeof replacement === "function" ? replacement.toString() : JSON.stringify(replacement);

        return stripIndent`
            {
                find: ${find},
                replacement: {
                    match: /${match.replace(/(?<!\\)\//g, "\\/")}/,
                    replace: ${replace}
                }
            }
        `;
    }, [parsedFind, match, replacement]);

    function onFindChange(v: string) {
        setFind(v);

        try {
            let parsedFind = v as string | RegExp;
            if (/^\/.+?\/$/.test(v)) parsedFind = new RegExp(v.slice(1, -1));

            setFindError(void 0);
            setParsedFind(parsedFind);

            if (v.length) {
                findCandidates({ find: parsedFind, setModule, setError: setFindError });
            }
        } catch (e: any) {
            setFindError((e as Error).message);
        }
    }

    function onMatchChange(v: string) {
        setMatch(v);

        try {
            new RegExp(v);
            setMatchError(void 0);
        } catch (e: any) {
            setMatchError((e as Error).message);
        }
    }

    return (
        <SettingsTab>
            <HeadingTertiary>Full patch</HeadingTertiary>
            <FullPatchInput
                setFind={onFindChange}
                setParsedFind={setParsedFind}
                setMatch={onMatchChange}
                setReplacement={setReplacement}
            />

            <HeadingTertiary className={Margins.top8}>Find</HeadingTertiary>
            <TextInput
                type="text"
                value={find}
                onChange={onFindChange}
                error={findError}
            />

            <HeadingTertiary className={Margins.top8}>Match</HeadingTertiary>
            <TextInput
                type="text"
                value={match}
                onChange={onMatchChange}
                error={matchError}
            />

            <div className={Margins.top8} />
            <ReplacementInput
                replacement={replacement}
                setReplacement={setReplacement}
                replacementError={replacementError}
            />

            <Divider />
            {module && (
                <PatchPreview
                    module={module}
                    match={match}
                    replacement={replacement}
                    setReplacementError={setReplacementError}
                />
            )}

            {!!(find && match && replacement) && (
                <>
                    <HeadingTertiary className={Margins.top20}>Code</HeadingTertiary>
                    <CodeBlock lang="js" content={code} />
                    <Flex className={Margins.top16}>
                        <Button onClick={() => copyWithToast(code)}>
                            Copy to Clipboard
                        </Button>
                        <Button onClick={() => copyWithToast("```ts\n" + code + "\n```")}>
                            Copy as Codeblock
                        </Button>
                    </Flex>
                </>
            )}
        </SettingsTab>
    );
}

export default IS_DEV ? wrapTab(PatchHelper, "PatchHelper") : null;
