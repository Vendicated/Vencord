/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findByPropsLazy } from "@webpack";
import { Parser } from "@webpack/common";

const CodeContainerClasses = findByPropsLazy("markup", "codeContainer");

/**
 * Renders code in a Discord codeblock
 */
export function CodeBlock(props: { content?: string, lang: string; }) {
    return (
        <div className={CodeContainerClasses.markup}>
            {Parser.defaultRules.codeBlock.react(props, null, {})}
        </div>
    );
}

/**
 * Renders inline code like `this`
 */
export function InlineCode({ children }: { children: React.ReactNode; }) {
    return (
        <span className={CodeContainerClasses.markup}>
            <code className="inline">{children}</code>
        </span>
    );
}
