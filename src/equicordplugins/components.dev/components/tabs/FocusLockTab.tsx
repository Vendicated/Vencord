/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { FocusLock, ManaButton, ManaTextInput, Paragraph, useRef, useState } from "..";
import { SectionWrapper } from "../SectionWrapper";

export default function FocusLockTab() {
    const [focusLockEnabled, setFocusLockEnabled] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [inputValue, setInputValue] = useState("");

    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="FocusLock Demo">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    FocusLock traps keyboard focus within a container. Enable it and try tabbing - focus stays inside the box.
                </Paragraph>
                <ManaButton
                    variant={focusLockEnabled ? "primary" : "secondary"}
                    text={focusLockEnabled ? "Disable Focus Lock" : "Enable Focus Lock"}
                    onClick={() => setFocusLockEnabled(!focusLockEnabled)}
                    style={{ marginBottom: 16 }}
                />
                <div
                    ref={containerRef}
                    style={{
                        padding: 16,
                        border: `2px solid ${focusLockEnabled ? "var(--brand-500)" : "var(--background-modifier-accent)"}`,
                        borderRadius: 8,
                        background: "var(--background-secondary)",
                    }}
                >
                    {focusLockEnabled && (
                        <FocusLock containerRef={containerRef}>
                            <Paragraph style={{ marginBottom: 12 }}>
                                Focus is now trapped! Tab between these elements:
                            </Paragraph>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                <ManaTextInput
                                    value={inputValue}
                                    onChange={setInputValue}
                                    placeholder="First input"
                                />
                                <ManaTextInput
                                    value=""
                                    onChange={() => { }}
                                    placeholder="Second input"
                                />
                                <div style={{ display: "flex", gap: 8 }}>
                                    <ManaButton variant="secondary" text="Button 1" onClick={() => { }} />
                                    <ManaButton variant="secondary" text="Button 2" onClick={() => { }} />
                                    <ManaButton
                                        variant="primary"
                                        text="Exit Focus Lock"
                                        onClick={() => setFocusLockEnabled(false)}
                                    />
                                </div>
                            </div>
                        </FocusLock>
                    )}
                    {!focusLockEnabled && (
                        <Paragraph color="text-muted">
                            Click "Enable Focus Lock" to activate the focus trap demo.
                        </Paragraph>
                    )}
                </div>
            </SectionWrapper>

            <SectionWrapper title="Use Cases">
                <Paragraph color="text-muted">• Modal dialogs - Keep focus within the modal</Paragraph>
                <Paragraph color="text-muted">• Dropdown menus - Trap focus while open</Paragraph>
                <Paragraph color="text-muted">• Settings panels - Improve keyboard navigation</Paragraph>
                <Paragraph color="text-muted">• Accessibility - Ensure screen readers stay in context</Paragraph>
            </SectionWrapper>

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">• containerRef - React ref to the container element</Paragraph>
                <Paragraph color="text-muted">• keyboardModeEnabled - Enable keyboard focus trapping</Paragraph>
                <Paragraph color="text-muted">• children - Content to render inside the focus trap</Paragraph>
            </SectionWrapper>
        </div>
    );
}
