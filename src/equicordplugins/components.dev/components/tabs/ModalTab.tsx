/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { classNameFactory } from "@utils/css";
import {
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalRoot,
    ModalSize,
    openModal
} from "@utils/modal";
import { findComponentByCodeLazy } from "@webpack";

import { ManaButton } from "..";
import { SectionWrapper } from "../SectionWrapper";

const cl = classNameFactory("vc-compfinder-modal-");

const ModalCloseButton = findComponentByCodeLazy("CLOSE_BUTTON_LABEL") as React.ComponentType<{
    onClick: () => void;
    className?: string;
    withCircleBackground?: boolean;
    hideOnFullscreen?: boolean;
}>;

const SIZES = [
    { size: ModalSize.SMALL, label: "Small" },
    { size: ModalSize.MEDIUM, label: "Medium" },
    { size: ModalSize.LARGE, label: "Large" },
    { size: ModalSize.DYNAMIC, label: "Dynamic" },
] as const;

function openDemoModal(size: ModalSize, label: string, showCloseButton = true, showFooter = true) {
    openModal(props => (
        <ModalRoot {...props} size={size}>
            <ModalHeader separator={false} className={cl("header")}>
                <div className={cl("header-content")}>
                    <Heading tag="h2">
                        {label} Modal
                    </Heading>
                    <Paragraph color="text-muted">
                        This is a {label.toLowerCase()} modal using Discord's native modal system.
                    </Paragraph>
                </div>
                {showCloseButton && (
                    <ModalCloseButton
                        onClick={props.onClose}
                        className={cl("close")}
                    />
                )}
            </ModalHeader>
            <ModalContent className={cl("content")}>
                <Paragraph color="text-muted">
                    Size: {size}
                </Paragraph>
                <Paragraph color="text-muted" style={{ marginTop: 8 }}>
                    The modal header, content, and footer use Discord's native components
                    from the webpack modules.
                </Paragraph>
            </ModalContent>
            {showFooter && (
                <ModalFooter className={cl("footer")}>
                    <ManaButton variant="primary" text="Confirm" onClick={props.onClose} />
                    <ManaButton variant="secondary" text="Cancel" onClick={props.onClose} />
                </ModalFooter>
            )}
        </ModalRoot>
    ));
}

export default function ModalTab() {
    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Modal Sizes">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Uses ModalRoot, ModalHeader, ModalContent, ModalFooter from @utils/modal
                    and native ModalCloseButton via findComponentByCodeLazy("CLOSE_BUTTON_LABEL")
                </Paragraph>
                <div className="vc-compfinder-grid">
                    {SIZES.map(({ size, label }) => (
                        <ManaButton
                            key={size}
                            variant="secondary"
                            text={label}
                            onClick={() => openDemoModal(size, label)}
                        />
                    ))}
                </div>
            </SectionWrapper>

            <SectionWrapper title="Without Close Button">
                <div className="vc-compfinder-grid">
                    <ManaButton
                        variant="secondary"
                        text="Open Modal"
                        onClick={() => openDemoModal(ModalSize.SMALL, "No Close Button", false, true)}
                    />
                </div>
            </SectionWrapper>

            <SectionWrapper title="Without Footer">
                <div className="vc-compfinder-grid">
                    <ManaButton
                        variant="secondary"
                        text="Open Modal"
                        onClick={() => openDemoModal(ModalSize.SMALL, "No Footer", true, false)}
                    />
                </div>
            </SectionWrapper>

            <SectionWrapper title="Minimal (No Close Button or Footer)">
                <div className="vc-compfinder-grid">
                    <ManaButton
                        variant="secondary"
                        text="Open Modal"
                        onClick={() => openDemoModal(ModalSize.DYNAMIC, "Minimal", false, false)}
                    />
                </div>
            </SectionWrapper>

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">
                    <strong>ModalRoot</strong> - from @utils/modal
                </Paragraph>
                <Paragraph color="text-muted">
                    • size: ModalSize - SMALL, MEDIUM, LARGE, or DYNAMIC
                </Paragraph>
                <Paragraph color="text-muted">
                    • ...modalProps - Props from openModal callback
                </Paragraph>
                <Paragraph color="text-muted" style={{ marginTop: 12 }}>
                    <strong>ModalHeader</strong>
                </Paragraph>
                <Paragraph color="text-muted">
                    • separator?: boolean - Show separator line (default: true)
                </Paragraph>
                <Paragraph color="text-muted" style={{ marginTop: 12 }}>
                    <strong>ModalCloseButton</strong> - findComponentByCodeLazy("CLOSE_BUTTON_LABEL")
                </Paragraph>
                <Paragraph color="text-muted">
                    • onClick: () =&gt; void - Close handler
                </Paragraph>
                <Paragraph color="text-muted">
                    • withCircleBackground?: boolean - Circle background style
                </Paragraph>
                <Paragraph color="text-muted" style={{ marginTop: 12 }}>
                    <strong>openModal</strong> - from @utils/modal
                </Paragraph>
                <Paragraph color="text-muted">
                    • (render: (props) =&gt; ReactNode) =&gt; string - Returns modal key
                </Paragraph>
            </SectionWrapper>
        </div>
    );
}
