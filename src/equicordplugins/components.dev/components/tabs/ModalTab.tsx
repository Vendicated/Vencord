/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
    closeAllModals,
    ConfirmModal,
    ExpressiveModal,
    ManaButton,
    ManaTextInput,
    Modal,
    openModal,
    Paragraph,
    showToast,
    ToastType,
    useState,
} from "..";
import { SectionWrapper } from "../SectionWrapper";

function openBasicModal() {
    openModal(props => (
        <Modal
            title="Basic Modal"
            subtitle="This is a subtitle"
            transitionState={props.transitionState}
            onClose={props.onClose}
            actions={[
                { text: "Cancel", variant: "secondary", onClick: props.onClose },
                { text: "Confirm", variant: "primary", onClick: () => { showToast("Confirmed!", ToastType.SUCCESS); props.onClose(); } },
            ]}
        >
            <Paragraph>This is the modal content. You can put any React components here.</Paragraph>
        </Modal>
    ));
}

function openModalWithNotice() {
    openModal(props => (
        <Modal
            title="Modal with Notice"
            transitionState={props.transitionState}
            onClose={props.onClose}
            notice={{ message: "This is an informational notice", type: "info" }}
            actions={[
                { text: "Got it", variant: "primary", onClick: props.onClose },
            ]}
        >
            <Paragraph>Modals can display notices at the top for important information.</Paragraph>
        </Modal>
    ));
}

function ModalWithInputContent({ onClose, transitionState }: { onClose: () => void; transitionState: number; }) {
    const [inputValue, setInputValue] = useState("");

    return (
        <Modal
            title="Modal with Input"
            subtitle="Enter some information"
            transitionState={transitionState}
            onClose={onClose}
            actions={[
                { text: "Cancel", variant: "secondary", onClick: onClose },
                { text: "Submit", variant: "primary", onClick: () => { showToast(`Submitted: ${inputValue}`, ToastType.SUCCESS); onClose(); } },
            ]}
        >
            <ManaTextInput
                value={inputValue}
                onChange={setInputValue}
                placeholder="Type something..."
            />
            <Paragraph color="text-muted" style={{ marginTop: 8 }}>
                Using ManaTextInput inside the modal content.
            </Paragraph>
        </Modal>
    );
}

function openModalWithInput() {
    openModal(props => (
        <ModalWithInputContent onClose={props.onClose} transitionState={props.transitionState} />
    ));
}

function openConfirmModal() {
    openModal(props => (
        <ConfirmModal
            title="Confirm Action"
            subtitle="Are you sure you want to proceed?"
            transitionState={props.transitionState}
            confirmText="Delete"
            cancelText="Cancel"
            variant="critical"
            onConfirm={() => {
                showToast("Item deleted!", ToastType.SUCCESS);
            }}
            onCancel={() => {
                showToast("Cancelled", ToastType.MESSAGE);
            }}
            onClose={props.onClose}
        >
            <Paragraph>This action cannot be undone. The item will be permanently deleted.</Paragraph>
        </ConfirmModal>
    ));
}

function openConfirmModalPrimary() {
    openModal(props => (
        <ConfirmModal
            title="Save Changes"
            transitionState={props.transitionState}
            confirmText="Save"
            variant="primary"
            onConfirm={() => {
                showToast("Changes saved!", ToastType.SUCCESS);
            }}
            onClose={props.onClose}
        >
            <Paragraph>Do you want to save your changes?</Paragraph>
        </ConfirmModal>
    ));
}

function openExpressiveModal() {
    openModal(props => (
        <ExpressiveModal
            title="Welcome!"
            description="This is an expressive modal with a more visual design."
            transitionState={props.transitionState}
            actions={[
                { text: "Get Started", variant: "primary", onClick: props.onClose },
            ]}
            onClose={props.onClose}
        />
    ));
}

export default function ModalTab() {
    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Basic Modal">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Simple modal with title, subtitle, content, and action buttons.
                </Paragraph>
                <ManaButton variant="secondary" text="Open Basic Modal" onClick={openBasicModal} />
            </SectionWrapper>

            <SectionWrapper title="Modal with Notice">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Modal with a notice banner (info, warn, critical, positive).
                </Paragraph>
                <ManaButton variant="secondary" text="Open Modal with Notice" onClick={openModalWithNotice} />
            </SectionWrapper>

            <SectionWrapper title="Modal with Input">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Modal with input controls in the header area.
                </Paragraph>
                <ManaButton variant="secondary" text="Open Modal with Input" onClick={openModalWithInput} />
            </SectionWrapper>

            <SectionWrapper title="Confirm Modal (Critical)">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Confirmation dialog for destructive actions.
                </Paragraph>
                <ManaButton variant="critical-secondary" text="Open Confirm Modal" onClick={openConfirmModal} />
            </SectionWrapper>

            <SectionWrapper title="Confirm Modal (Primary)">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Confirmation dialog for non-destructive actions.
                </Paragraph>
                <ManaButton variant="secondary" text="Open Save Dialog" onClick={openConfirmModalPrimary} />
            </SectionWrapper>

            <SectionWrapper title="Expressive Modal">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Visual modal with graphic/badge support.
                </Paragraph>
                <ManaButton variant="secondary" text="Open Expressive Modal" onClick={openExpressiveModal} />
            </SectionWrapper>

            <SectionWrapper title="Close All Modals">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Utility to close all open modals at once.
                </Paragraph>
                <ManaButton variant="critical-secondary" text="Close All Modals" onClick={closeAllModals} />
            </SectionWrapper>

            <SectionWrapper title="Modal Props">
                <Paragraph color="text-muted">• title - Modal title (required)</Paragraph>
                <Paragraph color="text-muted">• subtitle - Optional subtitle</Paragraph>
                <Paragraph color="text-muted">• size - "sm" or "md"</Paragraph>
                <Paragraph color="text-muted">• children - Modal content</Paragraph>
                <Paragraph color="text-muted">• actions - Array of action buttons</Paragraph>
                <Paragraph color="text-muted">• notice - {"{ message, type }"} for notices</Paragraph>
                <Paragraph color="text-muted">• input - Controls in header area</Paragraph>
                <Paragraph color="text-muted">• onClose - Close handler (required)</Paragraph>
            </SectionWrapper>

            <SectionWrapper title="ConfirmModal Props">
                <Paragraph color="text-muted">• confirmText - Confirm button text</Paragraph>
                <Paragraph color="text-muted">• cancelText - Cancel button text</Paragraph>
                <Paragraph color="text-muted">• variant - "critical" | "primary" | "secondary"</Paragraph>
                <Paragraph color="text-muted">• onConfirm - Confirm callback (can be async)</Paragraph>
                <Paragraph color="text-muted">• onCancel - Cancel callback</Paragraph>
                <Paragraph color="text-muted">• checkboxProps - Optional checkbox</Paragraph>
            </SectionWrapper>

            <SectionWrapper title="Action Button">
                <Paragraph color="text-muted">• text - Button text</Paragraph>
                <Paragraph color="text-muted">• variant - "primary" | "secondary" | "critical-primary"</Paragraph>
                <Paragraph color="text-muted">• onClick - Click handler</Paragraph>
                <Paragraph color="text-muted">• disabled - Disable button</Paragraph>
                <Paragraph color="text-muted">• loading - Show loading state</Paragraph>
            </SectionWrapper>

            <SectionWrapper title="openModal Options">
                <Paragraph color="text-muted">• modalKey - Unique key for the modal</Paragraph>
                <Paragraph color="text-muted">• dismissable - Allow clicking backdrop to close</Paragraph>
                <Paragraph color="text-muted">• instant - Skip animation</Paragraph>
                <Paragraph color="text-muted">• onCloseCallback - Called when modal closes</Paragraph>
            </SectionWrapper>

            <SectionWrapper title="Import">
                <Paragraph color="text-muted">
                    {"import { Modal, ConfirmModal, openModal, closeModal } from \"../components\";"}
                </Paragraph>
            </SectionWrapper>
        </div>
    );
}
