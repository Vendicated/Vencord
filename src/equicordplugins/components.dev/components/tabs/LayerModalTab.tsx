/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { openModal } from "@utils/modal";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";

import { Heading, ManaButton, Paragraph, useState } from "..";
import { SectionWrapper } from "../SectionWrapper";

const LayerModal = findComponentByCodeLazy('"data-mana-component":"layer-modal"') as React.ComponentType<{
    transitionState: number;
    animationVariant?: "default" | string;
    returnRef?: React.Ref<HTMLDivElement>;
    "aria-label"?: string;
    onClose: () => void;
    children: React.ReactNode;
}>;

const TransitionState = findByPropsLazy("ENTERING", "ENTERED", "EXITING") as {
    ENTERING: number;
    ENTERED: number;
    EXITING: number;
    EXITED: number;
    HIDDEN: number;
};

function LayerModalDemo({ onClose }: { onClose: () => void; }) {
    return (
        <LayerModal
            transitionState={TransitionState.ENTERED}
            onClose={onClose}
            aria-label="Demo Layer Modal"
        >
            <div style={{ padding: 24, minWidth: 300 }}>
                <Heading tag="h2" style={{ marginBottom: 8 }}>Layer Modal</Heading>
                <Paragraph color="text-muted" style={{ marginBottom: 16 }}>
                    This is a layer modal. It's used for layered/stacked modals
                    with different animation behavior than regular modals.
                </Paragraph>
                <ManaButton variant="primary" text="Close" onClick={onClose} />
            </div>
        </LayerModal>
    );
}

export default function LayerModalTab() {
    const [showInline, setShowInline] = useState(false);

    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Layer Modal">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Layer modals are used for stacked/layered modal experiences.
                    They have different animation variants and are typically used
                    when you need to show a modal on top of another modal.
                </Paragraph>
                <div className="vc-compfinder-grid">
                    <ManaButton
                        variant="secondary"
                        text="Open via openModal"
                        onClick={() => openModal(props => (
                            <LayerModalDemo onClose={props.onClose} />
                        ))}
                    />
                </div>
            </SectionWrapper>

            <SectionWrapper title="Inline Preview">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Toggle to see the layer modal rendered inline (not recommended for production).
                </Paragraph>
                <div className="vc-compfinder-grid">
                    <ManaButton
                        variant="secondary"
                        text={showInline ? "Hide Inline" : "Show Inline"}
                        onClick={() => setShowInline(!showInline)}
                    />
                </div>
                {showInline && (
                    <div style={{ marginTop: 16, position: "relative", minHeight: 200 }}>
                        <LayerModal
                            transitionState={TransitionState.ENTERED}
                            onClose={() => setShowInline(false)}
                            aria-label="Inline Demo"
                        >
                            <div style={{ padding: 16 }}>
                                <Paragraph>Inline layer modal content</Paragraph>
                            </div>
                        </LayerModal>
                    </div>
                )}
            </SectionWrapper>

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">
                    <strong>LayerModal</strong>
                </Paragraph>
                <Paragraph color="text-muted">
                    • transitionState: number - Use TransitionState.ENTERED for visible
                </Paragraph>
                <Paragraph color="text-muted">
                    • onClose: () =&gt; void - Close handler
                </Paragraph>
                <Paragraph color="text-muted">
                    • children: ReactNode - Modal content
                </Paragraph>
                <Paragraph color="text-muted">
                    • animationVariant?: "default" | string - Animation style
                </Paragraph>
                <Paragraph color="text-muted">
                    • returnRef?: React.Ref - Ref for the modal element
                </Paragraph>
                <Paragraph color="text-muted">
                    • aria-label?: string - Accessibility label
                </Paragraph>
                <Paragraph color="text-muted" style={{ marginTop: 12 }}>
                    <strong>TransitionState</strong> - findByPropsLazy("ENTERING", "ENTERED", "EXITING")
                </Paragraph>
                <Paragraph color="text-muted">
                    • ENTERING, ENTERED, EXITING, EXITED, HIDDEN
                </Paragraph>
                <Paragraph color="text-muted" style={{ marginTop: 12 }}>
                    <strong>Usage Notes</strong>
                </Paragraph>
                <Paragraph color="text-muted">
                    • Use with openModal() for proper backdrop and positioning
                </Paragraph>
                <Paragraph color="text-muted">
                    • Has built-in animation handling based on transitionState
                </Paragraph>
            </SectionWrapper>
        </div>
    );
}
