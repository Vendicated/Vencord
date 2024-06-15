/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findByPropsLazy } from "@webpack";
import { MarkupUtils } from "@webpack/common";

const CodeContainerClasses: Record<string, string> = findByPropsLazy("markup", "codeContainer");

/**
 * Renders code in a Discord codeblock
 */
export const CodeBlock = (props: { content?: string, lang: string; }) => (
    <div className={CodeContainerClasses.markup}>
        {MarkupUtils.defaultRules.codeBlock!.react(props, null, {})}
    </div>
);
