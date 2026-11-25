/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Flex } from "@components/Flex";
import { FormSwitch } from "@components/FormSwitch";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { ReplaceFn } from "@utils/types";
import { Parser, TextInput } from "@webpack/common";

const RegexGuide = {
    "\\i": "Special regex escape sequence that matches identifiers (varnames, classnames, etc.)",
    "$$": "Insert a $",
    "$&": "Insert the entire match",
    "$`\u200b": "Insert the substring before the match",
    "$'": "Insert the substring after the match",
    "$n": "Insert the nth capturing group ($1, $2...)",
    "$self": "Insert the plugin instance",
} as const;

export const isReplacementMethod = (source: string) => /^replace\s*\(/.test(source);

export interface ReplacementDraft {
    value: string | ReplaceFn;
    isFunction: boolean;
    error?: string;
}

interface ReplacementInputProps {
    draft: ReplacementDraft;
    onChange(draft: ReplacementDraft): void;
}

export function ReplacementInput({ draft, onChange }: ReplacementInputProps) {
    const { value, isFunction, error } = draft;

    function edit(text: string, asFunction: boolean) {
        if (!asFunction) {
            onChange({ value: text, isFunction: false });
            return;
        }

        try {
            const expression = isReplacementMethod(text.trimStart()) ? `({${text}}).replace` : `(${text})`;
            const replacement = (0, eval)(expression);
            if (typeof replacement !== "function") {
                throw new Error("Replacement must be a function");
            }
            onChange({ value: replacement, isFunction: true });
        } catch (error) {
            onChange({
                value: text,
                isFunction: true,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }

    return (
        <Flex flexDirection="column" gap={8}>
            <Heading>Replacement</Heading>
            <TextInput
                aria-label="Replacement"
                value={value.toString()}
                onChange={text => edit(text, isFunction)}
                error={error}
            />
            <FormSwitch
                value={isFunction}
                onChange={enabled => edit(value.toString(), enabled)}
                title={'Treat "Replacement" as a function'}
                description='"Replacement" will be evaluated as a function if this is enabled'
                hideBorder
            />
            {!isFunction && (
                <details className="vc-patch-helper-disclosure">
                    <summary>Replacement syntax</summary>
                    <Flex flexDirection="column" gap={4}>
                        {Object.entries(RegexGuide).map(([placeholder, desc]) => (
                            <Paragraph key={placeholder}>
                                {Parser.parse("`" + placeholder + "`")}: {desc}
                            </Paragraph>
                        ))}
                    </Flex>
                </details>
            )}
        </Flex>
    );
}
