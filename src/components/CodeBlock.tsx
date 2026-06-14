/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classes } from "@utils/misc";
import { findCssClassesLazy } from "@webpack";
import { Parser } from "@webpack/common";

const CodeContainerClasses = findCssClassesLazy("markup", "codeContainer");

/**
 * Renders code in a Discord codeblock
 */
export function CodeBlock({ className, ...props }: { content?: string, lang: string; className?: string; }) {
    return (
        <div className={classes(CodeContainerClasses.markup, className)}>
            {Parser.defaultRules.codeBlock.react(props, null, {})}
        </div>
    );
}

/**
 * Renders inline code like `this`
 */
export function InlineCode({ children, className }: { children: React.ReactNode; className?: string; }) {
    return (
        <span className={classes(CodeContainerClasses.markup, className)}>
            <code className="inline">{children}</code>
        </span>
    );
}
