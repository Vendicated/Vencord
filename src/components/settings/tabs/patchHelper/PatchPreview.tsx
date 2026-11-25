/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { CodeBlock } from "@components/CodeBlock";
import { Flex } from "@components/Flex";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { PatchTarget, previewPatchReplacement, testPatchReplacements } from "@debug/testPatch";
import { escapeRegExp } from "@utils/text";
import { PatchReplacement } from "@utils/types";
import { useMemo, useState } from "@webpack/common";

interface PatchPreviewProps {
    target: PatchTarget;
    replacements: PatchReplacement[];
}

interface ReplacementPreview {
    match?: string[];
    diff?: ReturnType<typeof makeDiff>;
    error?: string;
}

const CONTEXT_LENGTH = 100;
const PREVIEW_LENGTH = 1000;

function diffLines(text: string, prefix: string) {
    return text ? text.split("\n").map(line => prefix + line) : [];
}

function makeDiff(original: string, patched: string, matchIndex: number) {
    let firstChange = matchIndex;
    const sharedLength = Math.min(original.length, patched.length);
    while (firstChange < sharedLength && original[firstChange] === patched[firstChange]) {
        firstChange++;
    }

    let remainingContext = 0;
    while (
        remainingContext < sharedLength - firstChange &&
        original[original.length - 1 - remainingContext] === patched[patched.length - 1 - remainingContext]
    ) {
        remainingContext++;
    }

    const start = Math.max(0, firstChange - CONTEXT_LENGTH);
    const beforeEnd = original.length - remainingContext;
    const afterEnd = patched.length - remainingContext;
    const limit = firstChange + PREVIEW_LENGTH;
    const truncated = beforeEnd > limit || afterEnd > limit;
    const trailingContext = truncated ? "" : original.slice(beforeEnd, beforeEnd + CONTEXT_LENGTH);

    return {
        content: [
            ...diffLines(original.slice(start, firstChange), "  "),
            ...diffLines(original.slice(firstChange, Math.min(beforeEnd, limit)), "- "),
            ...diffLines(patched.slice(firstChange, Math.min(afterEnd, limit)), "+ "),
            ...diffLines(trailingContext, "  ")
        ].join("\n"),
        truncated
    };
}

function previewReplacements(source: string, replacements: PatchReplacement[]) {
    const previews: ReplacementPreview[] = [];
    for (const replacement of replacements) {
        try {
            const { canonicalMatch, patchedSource } = previewPatchReplacement(source, replacement, "YourPlugin");
            const matcher = typeof canonicalMatch === "string"
                ? new RegExp(escapeRegExp(canonicalMatch))
                : new RegExp(canonicalMatch);
            const result = matcher.exec(source);
            const match = result?.map(value =>
                value?.length > PREVIEW_LENGTH ? value.slice(0, PREVIEW_LENGTH) + "…" : value
            );

            if (source === patchedSource) {
                previews.push({ match, error: "Had no effect" });
            } else {
                previews.push({
                    match,
                    diff: makeDiff(source, patchedSource, result?.index ?? 0)
                });
            }
            source = patchedSource;
        } catch (error) {
            previews.push({ error: error instanceof Error ? error.message : String(error) });
            break;
        }
    }

    return previews;
}

function Match({ match }: { match: string[]; }) {
    const [fullMatch, ...groups] = match;
    const groupsCode = groups.map((value, index) => `Group ${index + 1}: ${value}`).join("\n");

    return (
        <details className="vc-patch-helper-disclosure">
            <summary>Match</summary>
            <Flex flexDirection="column" gap={8}>
                {fullMatch && <CodeBlock lang="js" content={fullMatch} />}
                {groupsCode && <CodeBlock lang="yml" content={groupsCode} />}
            </Flex>
        </details>
    );
}

export function PatchPreview({ target, replacements }: PatchPreviewProps) {
    const { moduleId, source } = target;
    const previews = useMemo(() => previewReplacements(source, replacements), [source, replacements]);
    const [compileResult, setCompileResult] = useState<{ previews: ReplacementPreview[]; error?: string; }>();

    function compile() {
        const result = testPatchReplacements(source, replacements, "YourPlugin");
        setCompileResult({ previews, error: result.ok ? undefined : result.error });
    }

    return (
        <Flex flexDirection="column" gap={16}>
            <Flex alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={8}>
                <Heading tag="h4" style={{ userSelect: "text" }}>Module {moduleId}</Heading>
                <Button onClick={compile}>
                    {replacements.length > 1 ? "Compile all replacements" : "Compile"}
                </Button>
            </Flex>
            {compileResult?.previews === previews && (
                <Paragraph style={{ color: compileResult.error ? "var(--text-feedback-critical)" : "var(--status-positive)" }}>
                    {compileResult.error ?? "Compiled successfully"}
                </Paragraph>
            )}

            {previews.map(({ match, diff, error }, index) => (
                <Card key={index}>
                    <Flex flexDirection="column" gap={12}>
                        <Heading>{replacements.length > 1 ? `Replacement ${index + 1}` : "Replacement preview"}</Heading>
                        {diff && (
                            <>
                                <CodeBlock className="vc-patch-helper-diff" lang="diff" content={diff.content} />
                                {diff.truncated && <Paragraph>Diff preview truncated.</Paragraph>}
                            </>
                        )}
                        {match && <Match match={match} />}
                        {error && <Paragraph style={{ color: "var(--text-feedback-critical)" }}>{error}</Paragraph>}
                    </Flex>
                </Card>
            ))}
        </Flex>
    );
}
