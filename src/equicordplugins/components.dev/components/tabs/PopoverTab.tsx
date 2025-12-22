/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ManaButton, ManaPopover, Paragraph, PopoverAction, useRef, useState } from "..";
import { SectionWrapper } from "../SectionWrapper";

function PopoverDemo({ title, body, size, actions, position, label }: { title: string; body: string; size?: "sm" | "md" | "lg"; actions?: PopoverAction[]; position?: "top" | "bottom" | "left" | "right"; label: string; }) {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [show, setShow] = useState(false);

    return (
        <>
            <div ref={wrapperRef} style={{ display: "inline-block" }}>
                <ManaButton
                    variant="secondary"
                    text={label}
                    onClick={() => setShow(!show)}
                />
            </div>
            <ManaPopover
                targetElementRef={wrapperRef}
                shouldShow={show}
                onRequestClose={() => setShow(false)}
                title={title}
                body={body}
                size={size}
                actions={actions}
                position={position}
            />
        </>
    );
}

export default function PopoverTab() {
    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Basic Popover">
                <div className="vc-compfinder-grid">
                    <PopoverDemo
                        label="Click me"
                        title="Popover Title"
                        body="This is the popover body text with some helpful information."
                    />
                </div>
            </SectionWrapper>

            <SectionWrapper title="Sizes">
                <div className="vc-compfinder-grid">
                    <PopoverDemo
                        label="sm"
                        title="Small Popover"
                        body="This is a small popover."
                        size="sm"
                    />
                    <PopoverDemo
                        label="md"
                        title="Medium Popover"
                        body="This is a medium popover (default)."
                        size="md"
                    />
                    <PopoverDemo
                        label="lg"
                        title="Large Popover"
                        body="This is a large popover with more space."
                        size="lg"
                    />
                </div>
            </SectionWrapper>

            <SectionWrapper title="Positions">
                <div className="vc-compfinder-grid">
                    <PopoverDemo
                        label="top"
                        title="Top Position"
                        body="Popover appears above."
                        position="top"
                    />
                    <PopoverDemo
                        label="bottom"
                        title="Bottom Position"
                        body="Popover appears below."
                        position="bottom"
                    />
                    <PopoverDemo
                        label="left"
                        title="Left Position"
                        body="Popover appears to the left."
                        position="left"
                    />
                    <PopoverDemo
                        label="right"
                        title="Right Position"
                        body="Popover appears to the right."
                        position="right"
                    />
                </div>
            </SectionWrapper>

            <SectionWrapper title="With Actions">
                <div className="vc-compfinder-grid">
                    <PopoverDemo
                        label="With Actions"
                        title="Popover with Actions"
                        body="This popover has action buttons."
                        actions={[
                            { text: "Primary", variant: "primary" },
                            { text: "Secondary", variant: "secondary" },
                        ]}
                    />
                </div>
            </SectionWrapper>

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">
                    • targetElementRef: React.RefObject - Ref to trigger element
                </Paragraph>
                <Paragraph color="text-muted">
                    • shouldShow: boolean - Controls visibility
                </Paragraph>
                <Paragraph color="text-muted">
                    • onRequestClose?: (reason: string) =&gt; void - Close callback
                </Paragraph>
                <Paragraph color="text-muted">
                    • title?: string - Popover title
                </Paragraph>
                <Paragraph color="text-muted">
                    • body?: string - Popover body text
                </Paragraph>
                <Paragraph color="text-muted">
                    • size?: "sm" | "md" | "lg" - Popover size
                </Paragraph>
                <Paragraph color="text-muted">
                    • position?: "top" | "bottom" | "left" | "right" - Position
                </Paragraph>
                <Paragraph color="text-muted">
                    • actions?: PopoverAction[] - Action buttons
                </Paragraph>
                <Paragraph color="text-muted">
                    • textLink?: {"{"} text: string, onClick?: () =&gt; void {"}"} - Link
                </Paragraph>
                <Paragraph color="text-muted">
                    • graphic?: {"{"} src: string, aspectRatio?: string {"}"} - Image
                </Paragraph>
            </SectionWrapper>
        </div>
    );
}
