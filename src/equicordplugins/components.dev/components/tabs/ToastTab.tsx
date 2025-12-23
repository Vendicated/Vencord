/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ManaButton, Paragraph, showToast, Toasts, ToastType, ToastTypeValue } from "..";
import { SectionWrapper } from "../SectionWrapper";

const TOAST_TYPES = [
    { type: ToastType.MESSAGE, label: "MESSAGE", description: "Default message toast" },
    { type: ToastType.SUCCESS, label: "SUCCESS", description: "Green success toast" },
    { type: ToastType.FAILURE, label: "FAILURE", description: "Red failure/error toast" },
    { type: ToastType.CLIP, label: "CLIP", description: "Clip/copy toast" },
    { type: ToastType.LINK, label: "LINK", description: "Link copied toast" },
    { type: ToastType.FORWARD, label: "FORWARD", description: "Forward action toast" },
    { type: ToastType.INVITE, label: "INVITE", description: "Invite action toast" },
    { type: ToastType.BOOKMARK, label: "BOOKMARK", description: "Bookmark action toast" },
    { type: ToastType.CLOCK, label: "CLOCK", description: "Clock/timer toast" },
    { type: ToastType.AI, label: "AI", description: "AI action toast" },
] as const;

export default function ToastTab() {
    const showSimpleToast = (type: ToastTypeValue, label: string) => {
        showToast(`This is a ${label} toast!`, type);
    };

    const showAdvancedToast = () => {
        const toast = Toasts.create("Advanced toast with options", ToastType.SUCCESS, {
            duration: 5000,
            position: Toasts.Position.BOTTOM,
        });
        Toasts.show(toast);
    };

    const showCustomToast = () => {
        const toast = Toasts.create("Custom component toast", ToastType.CUSTOM, {
            component: <span style={{ color: "var(--text-brand)" }}>Custom JSX content!</span>,
        });
        Toasts.show(toast);
    };

    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Toast Types">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Click buttons to show different toast types. Toasts appear at screen edges.
                </Paragraph>
                <div className="vc-compfinder-grid" style={{ gap: 8 }}>
                    {TOAST_TYPES.map(({ type, label, description }) => (
                        <div key={label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <ManaButton
                                variant="secondary"
                                text={label}
                                onClick={() => showSimpleToast(type, label)}
                            />
                            <Paragraph color="text-muted" style={{ fontSize: 10 }}>
                                {description}
                            </Paragraph>
                        </div>
                    ))}
                </div>
            </SectionWrapper>

            <SectionWrapper title="Simple Usage">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    showToast(message, type) - Quick way to show a toast.
                </Paragraph>
                <ManaButton
                    variant="primary"
                    text="Show Simple Toast"
                    onClick={() => showToast("Hello from showToast!", ToastType.SUCCESS)}
                />
            </SectionWrapper>

            <SectionWrapper title="Advanced Usage">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Toasts.show() with full options object.
                </Paragraph>
                <div className="vc-compfinder-grid" style={{ gap: 8 }}>
                    <ManaButton
                        variant="secondary"
                        text="Advanced Toast (5s duration)"
                        onClick={showAdvancedToast}
                    />
                    <ManaButton
                        variant="secondary"
                        text="Custom Component Toast"
                        onClick={showCustomToast}
                    />
                </div>
            </SectionWrapper>

            <SectionWrapper title="Pop Toast">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Toasts.pop() removes the most recent toast.
                </Paragraph>
                <ManaButton
                    variant="critical-secondary"
                    text="Pop Last Toast"
                    onClick={() => Toasts.pop()}
                />
            </SectionWrapper>

            <SectionWrapper title="ToastType">
                <Paragraph color="text-muted">• MESSAGE - Default message style</Paragraph>
                <Paragraph color="text-muted">• SUCCESS - Green checkmark icon</Paragraph>
                <Paragraph color="text-muted">• FAILURE - Red X icon</Paragraph>
                <Paragraph color="text-muted">• CUSTOM - Custom component content</Paragraph>
                <Paragraph color="text-muted">• CLIP - Clip/scissors icon</Paragraph>
                <Paragraph color="text-muted">• LINK - Link icon</Paragraph>
                <Paragraph color="text-muted">• FORWARD - Forward arrow icon</Paragraph>
                <Paragraph color="text-muted">• INVITE - Invite icon</Paragraph>
                <Paragraph color="text-muted">• BOOKMARK - Bookmark icon</Paragraph>
                <Paragraph color="text-muted">• CLOCK - Clock icon</Paragraph>
                <Paragraph color="text-muted">• AI - AI icon</Paragraph>
            </SectionWrapper>

            <SectionWrapper title="ToastPosition">
                <Paragraph color="text-muted">• TOP (0) - Toast appears at top</Paragraph>
                <Paragraph color="text-muted">• BOTTOM (1) - Toast appears at bottom</Paragraph>
            </SectionWrapper>

            <SectionWrapper title="Toasts.show() Options">
                <Paragraph color="text-muted">• message - Toast message text</Paragraph>
                <Paragraph color="text-muted">• type - Toast type from ToastType</Paragraph>
                <Paragraph color="text-muted">• id - Unique ID (use Toasts.genId())</Paragraph>
                <Paragraph color="text-muted">• options.duration - Display time in ms</Paragraph>
                <Paragraph color="text-muted">• options.position - ToastPosition value</Paragraph>
                <Paragraph color="text-muted">• options.component - Custom React component</Paragraph>
            </SectionWrapper>

            <SectionWrapper title="Import">
                <Paragraph color="text-muted">
                    {"import { showToast, Toasts, ToastType, ToastPosition } from \"../components\";"}
                </Paragraph>
            </SectionWrapper>
        </div>
    );
}
