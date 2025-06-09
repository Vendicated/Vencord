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

import { CodeBlock } from "@components/CodeBlock";
import { debounce } from "@shared/debounce";
import { copyToClipboard } from "@utils/clipboard";
import { Margins } from "@utils/margins";
import { canonicalizeMatch, canonicalizeReplace } from "@utils/patches";
import { makeCodeblock } from "@utils/text";
import { Patch, ReplaceFn } from "@utils/types";
import { search } from "@webpack";
import { Button, Forms, Parser, React, Switch, TextArea, TextInput } from "@webpack/common";

import { SettingsTab, wrapTab } from "./shared";

// Do not include diff in non dev builds (side effects import)
if (IS_DEV) {
    var differ = require("diff") as typeof import("diff");
}

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

interface ReplacementComponentProps {
    module: [id: number, factory: Function];
    match: string;
    replacement: string | ReplaceFn;
    setReplacementError(error: any): void;
}

function ReplacementComponent({ module, match, replacement, setReplacementError }: ReplacementComponentProps) {
    const [id, fact] = module;
    const [compileResult, setCompileResult] = React.useState<[boolean, string]>();

    const [patchedCode, matchResult, diff] = React.useMemo(() => {
        const src: string = fact.toString().replaceAll("\n", "");

        try {
            new RegExp(match);
        } catch (e) {
            return ["", [], []];
        }
        const canonicalMatch = canonicalizeMatch(new RegExp(match));
        try {
            const canonicalReplace = canonicalizeReplace(replacement, 'Vencord.Plugins.plugins["YourPlugin"]');
            var patched = src.replace(canonicalMatch, canonicalReplace as string);
            setReplacementError(void 0);
        } catch (e) {
            setReplacementError((e as Error).message);
            return ["", [], []];
        }
        const m = src.match(canonicalMatch);
        return [patched, m, makeDiff(src, patched, m)];
    }, [id, match, replacement]);

    function makeDiff(original: string, patched: string, match: RegExpMatchArray | null) {
        if (!match || original === patched) return null;

        const changeSize = patched.length - original.length;

        // Use 200 surrounding characters of context
        const start = Math.max(0, match.index! - 200);
        const end = Math.min(original.length, match.index! + match[0].length + 200);
        // (changeSize may be negative)
        const endPatched = end + changeSize;

        const context = original.slice(start, end);
        const patchedContext = patched.slice(start, endPatched);

        return differ.diffWordsWithSpace(context, patchedContext);
    }

    function renderMatch() {
        if (!matchResult)
            return <Forms.FormText>Regex doesn't match!</Forms.FormText>;

        const fullMatch = matchResult[0] ? makeCodeblock(matchResult[0], "js") : "";
        const groups = matchResult.length > 1
            ? makeCodeblock(matchResult.slice(1).map((g, i) => `Group ${i + 1}: ${g}`).join("\n"), "yml")
            : "";

        return (
            <>
                <div style={{ userSelect: "text" }}>{Parser.parse(fullMatch)}</div>
                <div style={{ userSelect: "text" }}>{Parser.parse(groups)}</div>
            </>
        );
    }

    function renderDiff() {
        return diff?.map((p, idx) => {
            const color = p.added ? "lime" : p.removed ? "red" : "grey";
            return <div key={idx} style={{ color, userSelect: "text", wordBreak: "break-all", lineBreak: "anywhere" }}>{p.value}</div>;
        });
    }

    return (
        <>
            <Forms.FormTitle>Module {id}</Forms.FormTitle>

            {!!matchResult?.[0]?.length && (
                <>
                    <Forms.FormTitle>Match</Forms.FormTitle>
                    {renderMatch()}
                </>)
            }

            {!!diff?.length && (
                <>
                    <Forms.FormTitle>Diff</Forms.FormTitle>
                    {renderDiff()}
                </>
            )}

            {!!diff?.length && (
                <Button className={Margins.top20} onClick={() => {
                    try {
                        Function(patchedCode.replace(/^function\(/, "function patchedModule("));
                        setCompileResult([true, "Compiled successfully"]);
                    } catch (err) {
                        setCompileResult([false, (err as Error).message]);
                    }
                }}>Compile</Button>
            )}

            {compileResult &&
                <Forms.FormText style={{ color: compileResult[0] ? "var(--text-positive)" : "var(--text-danger)" }}>
                    {compileResult[1]}
                </Forms.FormText>
            }
        </>
    );
}

function ReplacementInput({ replacement, setReplacement, replacementError }) {
    const [isFunc, setIsFunc] = React.useState(false);
    const [error, setError] = React.useState<string>();

    function onChange(v: string) {
        setError(void 0);

        if (isFunc) {
            try {
                const func = (0, eval)(v);
                if (typeof func === "function")
                    setReplacement(() => func);
                else
                    setError("Replacement must be a function");
            } catch (e) {
                setReplacement(v);
                setError((e as Error).message);
            }
        } else {
            setReplacement(v);
        }
    }

    React.useEffect(
        () => void (isFunc ? onChange(replacement) : setError(void 0)),
        [isFunc]
    );

    return (
        <>
            {/* FormTitle adds a class if className is not set, so we set it to an empty string to prevent that */}
            <Forms.FormTitle className="">replacement</Forms.FormTitle>
            <TextInput
                value={replacement?.toString()}
                onChange={onChange}
                error={error ?? replacementError}
            />
            {!isFunc && (
                <div className="vc-text-selectable">
                    <Forms.FormTitle className={Margins.top8}>Cheat Sheet</Forms.FormTitle>
                    {Object.entries({
                        "\\i": "Special regex escape sequence that matches identifiers (varnames, classnames, etc.)",
                        "$$": "Insert a $",
                        "$&": "Insert the entire match",
                        "$`\u200b": "Insert the substring before the match",
                        "$'": "Insert the substring after the match",
                        "$n": "Insert the nth capturing group ($1, $2...)",
                        "$self": "Insert the plugin instance",
                    }).map(([placeholder, desc]) => (
                        <Forms.FormText key={placeholder}>
                            {Parser.parse("`" + placeholder + "`")}: {desc}
                        </Forms.FormText>
                    ))}
                </div>
            )}

            <Switch
                className={Margins.top8}
                value={isFunc}
                onChange={setIsFunc}
                note="'replacement' will be evaled if this is toggled"
                hideBorder={true}
            >
                Treat as Function
            </Switch>
        </>
    );
}

interface FullPatchInputProps {
    setFind(v: string): void;
    setParsedFind(v: string | RegExp): void;
    setMatch(v: string): void;
    setReplacement(v: string | ReplaceFn): void;
}

function FullPatchInput({ setFind, setParsedFind, setMatch, setReplacement }: FullPatchInputProps) {
    const [fullPatch, setFullPatch] = React.useState<string>("");
    const [fullPatchError, setFullPatchError] = React.useState<string>("");

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

    return <>
        <Forms.FormText className={Margins.bottom8}>Paste your full JSON patch here to fill out the fields</Forms.FormText>
        <TextArea value={fullPatch} onChange={setFullPatch} onBlur={update} />
        {fullPatchError !== "" && <Forms.FormText style={{ color: "var(--text-danger)" }}>{fullPatchError}</Forms.FormText>}
    </>;
}

function PatchHelper() {
    const [find, setFind] = React.useState<string>("");
    const [parsedFind, setParsedFind] = React.useState<string | RegExp>("");
    const [match, setMatch] = React.useState<string>("");
    const [replacement, setReplacement] = React.useState<string | ReplaceFn>("");

    const [replacementError, setReplacementError] = React.useState<string>();

    const [module, setModule] = React.useState<[number, Function]>();
    const [findError, setFindError] = React.useState<string>();
    const [matchError, setMatchError] = React.useState<string>();

    const code = React.useMemo(() => {
        return `
{
    find: ${parsedFind instanceof RegExp ? parsedFind.toString() : JSON.stringify(parsedFind)},
    replacement: {
        match: /${match.replace(/(?<!\\)\//g, "\\/")}/,
        replace: ${typeof replacement === "function" ? replacement.toString() : JSON.stringify(replacement)}
    }
}
        `.trim();
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
        <SettingsTab title="Patch Helper">
            <Forms.FormTitle>full patch</Forms.FormTitle>
            <FullPatchInput
                setFind={onFindChange}
                setParsedFind={setParsedFind}
                setMatch={onMatchChange}
                setReplacement={setReplacement}
            />

            <Forms.FormTitle className={Margins.top8}>find</Forms.FormTitle>
            <TextInput
                type="text"
                value={find}
                onChange={onFindChange}
                error={findError}
            />

            <Forms.FormTitle className={Margins.top8}>match</Forms.FormTitle>
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

            <Forms.FormDivider />
            {module && (
                <ReplacementComponent
                    module={module}
                    match={match}
                    replacement={replacement}
                    setReplacementError={setReplacementError}
                />
            )}

            {!!(find && match && replacement) && (
                <>
                    <Forms.FormTitle className={Margins.top20}>Code</Forms.FormTitle>
                    <CodeBlock lang="js" content={code} />
                    <Button onClick={() => copyToClipboard(code)}>Copy to Clipboard</Button>
                    <Button className={Margins.top8} onClick={() => copyToClipboard("```ts\n" + code + "\n```")}>Copy as Codeblock</Button>
                </>
            )}
        </SettingsTab>
    );
}

export default IS_DEV ? wrapTab(PatchHelper, "PatchHelper") : null;
