/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findByPropsLazy } from "@webpack";
import { Parser } from "@webpack/common";

import { Paragraph } from "..";
import { SectionWrapper } from "../SectionWrapper";

const MarkupClasses = findByPropsLazy("markup", "codeContainer");

interface CodeBlockProps {
    content: string;
    language?: string;
}

function CodeBlock({ content, language = "" }: CodeBlockProps) {
    const codeBlock = `\`\`\`${language}\n${content}\n\`\`\``;
    return (
        <div className={MarkupClasses.markup}>
            {Parser.parse(codeBlock)}
        </div>
    );
}

function InlineCode({ children }: { children: React.ReactNode; }) {
    return (
        <span className={MarkupClasses.markup}>
            <code className="inline">{children}</code>
        </span>
    );
}

const JS_EXAMPLE = `function greet(name) {
    return \`Hello, \${name}!\`;
}

console.log(greet("World"));`;

const TS_EXAMPLE = `interface User {
    id: string;
    name: string;
    email?: string;
}

const getUser = (id: string): User => {
    return { id, name: "John" };
};`;

const CSS_EXAMPLE = `.container {
    display: flex;
    gap: 8px;
    padding: 16px;
    background: var(--background-secondary);
    border-radius: 8px;
}`;

const PYTHON_EXAMPLE = `def fibonacci(n: int) -> list[int]:
    if n <= 0:
        return []
    sequence = [0, 1]
    while len(sequence) < n:
        sequence.append(sequence[-1] + sequence[-2])
    return sequence[:n]

print(fibonacci(10))`;

const JSON_EXAMPLE = `{
    "name": "equicord",
    "version": "1.0.0",
    "plugins": ["example"],
    "settings": {
        "enabled": true,
        "theme": "dark"
    }
}`;

const BASH_EXAMPLE = `#!/bin/bash
for file in *.ts; do
    echo "Processing $file"
    node "$file"
done`;

const PLAIN_EXAMPLE = `This is a plain code block
without syntax highlighting.
It preserves whitespace and formatting.`;

export default function CodeBlockTab() {
    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Inline Code">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Use <InlineCode>InlineCode</InlineCode> component for inline code snippets.
                </Paragraph>
                <Paragraph>I really like <InlineCode>cats</InlineCode> so yeah</Paragraph>
                <Paragraph>Use <InlineCode>console.log()</InlineCode> to debug your code.</Paragraph>
                <Paragraph>
                    Combine <InlineCode>const</InlineCode> with <InlineCode>let</InlineCode> and
                    use <InlineCode>===</InlineCode> for strict equality.
                </Paragraph>
            </SectionWrapper>

            <SectionWrapper title="JavaScript">
                <CodeBlock content={JS_EXAMPLE} language="js" />
            </SectionWrapper>

            <SectionWrapper title="TypeScript">
                <CodeBlock content={TS_EXAMPLE} language="ts" />
            </SectionWrapper>

            <SectionWrapper title="CSS">
                <CodeBlock content={CSS_EXAMPLE} language="css" />
            </SectionWrapper>

            <SectionWrapper title="Python">
                <CodeBlock content={PYTHON_EXAMPLE} language="py" />
            </SectionWrapper>

            <SectionWrapper title="JSON">
                <CodeBlock content={JSON_EXAMPLE} language="json" />
            </SectionWrapper>

            <SectionWrapper title="Bash">
                <CodeBlock content={BASH_EXAMPLE} language="bash" />
            </SectionWrapper>

            <SectionWrapper title="Plain Code Block">
                <CodeBlock content={PLAIN_EXAMPLE} />
            </SectionWrapper>

            <SectionWrapper title="Usage">
                <Paragraph color="text-muted">
                    Use <InlineCode>Parser.parse()</InlineCode> from <InlineCode>@webpack/common</InlineCode> to
                    render markdown with code blocks. Wrap in <InlineCode>markup</InlineCode> class for proper styling.
                </Paragraph>
            </SectionWrapper>
        </div>
    );
}
