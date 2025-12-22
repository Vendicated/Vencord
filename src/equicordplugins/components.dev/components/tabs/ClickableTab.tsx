/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Clickable, Paragraph, useState } from "..";
import { SectionWrapper } from "../SectionWrapper";

export default function ClickableTab() {
    const [clickCount, setClickCount] = useState(0);
    const [lastAction, setLastAction] = useState("None");

    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Basic Clickable">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Default clickable element. Click count: {clickCount}
                </Paragraph>
                <Clickable
                    onClick={() => setClickCount(c => c + 1)}
                    style={{
                        padding: "8px 16px",
                        backgroundColor: "var(--background-secondary)",
                        borderRadius: 4,
                        cursor: "pointer"
                    }}
                >
                    Click me!
                </Clickable>
            </SectionWrapper>

            <SectionWrapper title="With Custom Tag">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Clickable can render as different HTML elements using the tag prop.
                </Paragraph>
                <div style={{ display: "flex", gap: 8 }}>
                    <Clickable
                        tag="div"
                        onClick={() => setLastAction("Clicked div")}
                        style={{
                            padding: "8px 16px",
                            backgroundColor: "var(--background-tertiary)",
                            borderRadius: 4,
                            cursor: "pointer"
                        }}
                    >
                        tag="div"
                    </Clickable>
                    <Clickable
                        tag="span"
                        onClick={() => setLastAction("Clicked span")}
                        style={{
                            padding: "8px 16px",
                            backgroundColor: "var(--background-tertiary)",
                            borderRadius: 4,
                            cursor: "pointer"
                        }}
                    >
                        tag="span"
                    </Clickable>
                    <Clickable
                        tag="button"
                        onClick={() => setLastAction("Clicked button")}
                        style={{
                            padding: "8px 16px",
                            backgroundColor: "var(--background-tertiary)",
                            borderRadius: 4,
                            cursor: "pointer",
                            border: "none",
                            color: "inherit"
                        }}
                    >
                        tag="button"
                    </Clickable>
                </div>
                <Paragraph color="text-muted" style={{ marginTop: 8 }}>
                    Last action: {lastAction}
                </Paragraph>
            </SectionWrapper>

            <SectionWrapper title="With Role and TabIndex">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Accessibility props for keyboard navigation.
                </Paragraph>
                <div style={{ display: "flex", gap: 8 }}>
                    <Clickable
                        role="button"
                        tabIndex={0}
                        onClick={() => setLastAction("Role: button")}
                        style={{
                            padding: "8px 16px",
                            backgroundColor: "var(--background-secondary)",
                            borderRadius: 4,
                            cursor: "pointer"
                        }}
                    >
                        role="button" tabIndex=0
                    </Clickable>
                    <Clickable
                        role="link"
                        tabIndex={0}
                        onClick={() => setLastAction("Role: link")}
                        style={{
                            padding: "8px 16px",
                            backgroundColor: "var(--background-secondary)",
                            borderRadius: 4,
                            cursor: "pointer"
                        }}
                    >
                        role="link" tabIndex=0
                    </Clickable>
                </div>
            </SectionWrapper>

            <SectionWrapper title="Ignore Key Press">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    When ignoreKeyPress is true, Enter/Space won't trigger onClick.
                </Paragraph>
                <div style={{ display: "flex", gap: 8 }}>
                    <Clickable
                        tabIndex={0}
                        onClick={() => setLastAction("Normal (keys work)")}
                        style={{
                            padding: "8px 16px",
                            backgroundColor: "var(--background-secondary)",
                            borderRadius: 4,
                            cursor: "pointer"
                        }}
                    >
                        Normal (try Enter/Space)
                    </Clickable>
                    <Clickable
                        tabIndex={0}
                        ignoreKeyPress
                        onClick={() => setLastAction("Ignored (keys blocked)")}
                        style={{
                            padding: "8px 16px",
                            backgroundColor: "var(--background-secondary)",
                            borderRadius: 4,
                            cursor: "pointer"
                        }}
                    >
                        ignoreKeyPress (keys blocked)
                    </Clickable>
                </div>
            </SectionWrapper>

            <SectionWrapper title="Without onClick">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    When no onClick is provided, renders as non-interactive element.
                </Paragraph>
                <Clickable
                    style={{
                        padding: "8px 16px",
                        backgroundColor: "var(--background-modifier-accent)",
                        borderRadius: 4
                    }}
                >
                    Non-interactive (no onClick)
                </Clickable>
            </SectionWrapper>

            <SectionWrapper title="Styled Examples">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Clickable with different visual styles.
                </Paragraph>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Clickable
                        onClick={() => setLastAction("Card clicked")}
                        style={{
                            padding: 16,
                            backgroundColor: "var(--background-secondary)",
                            borderRadius: 8,
                            cursor: "pointer",
                            width: 120,
                            textAlign: "center"
                        }}
                    >
                        <div style={{ fontSize: 24, marginBottom: 4 }}>📁</div>
                        <div>Card Style</div>
                    </Clickable>
                    <Clickable
                        onClick={() => setLastAction("Chip clicked")}
                        style={{
                            padding: "4px 12px",
                            backgroundColor: "var(--brand-experiment)",
                            borderRadius: 16,
                            cursor: "pointer",
                            color: "white"
                        }}
                    >
                        Chip Style
                    </Clickable>
                    <Clickable
                        onClick={() => setLastAction("List item clicked")}
                        style={{
                            padding: "8px 16px",
                            backgroundColor: "var(--background-secondary)",
                            cursor: "pointer",
                            width: 200
                        }}
                    >
                        List Item Style →
                    </Clickable>
                </div>
            </SectionWrapper>

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">
                    <strong>Clickable</strong> - Interactive element wrapper
                </Paragraph>
                <Paragraph color="text-muted">• tag?: keyof JSX.IntrinsicElements - HTML element to render (default: div)</Paragraph>
                <Paragraph color="text-muted">• onClick?: MouseEventHandler - Click handler</Paragraph>
                <Paragraph color="text-muted">• onKeyPress?: KeyboardEventHandler - Key press handler</Paragraph>
                <Paragraph color="text-muted">• focusProps?: object - Props for FocusLock wrapper</Paragraph>
                <Paragraph color="text-muted">• innerRef?: Ref - Ref to the inner element</Paragraph>
                <Paragraph color="text-muted">• role?: string - ARIA role attribute</Paragraph>
                <Paragraph color="text-muted">• tabIndex?: number - Tab index for keyboard navigation</Paragraph>
                <Paragraph color="text-muted">• ignoreKeyPress?: boolean - Disable Enter/Space triggering onClick</Paragraph>
                <Paragraph color="text-muted">• href?: string - Optional href (affects key handling)</Paragraph>
                <Paragraph color="text-muted">• className?: string - CSS class name</Paragraph>
                <Paragraph color="text-muted">• children?: ReactNode - Child elements</Paragraph>
            </SectionWrapper>
        </div>
    );
}
