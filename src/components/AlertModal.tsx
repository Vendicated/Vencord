/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./AlertModal.css";

import { isTruthy } from "@utils/guards";
import { ModalContent, ModalFooter, ModalProps, ModalRoot, openModal } from "@utils/modal";
import { Clickable } from "@webpack/common";
import { ReactNode } from "react";

import { BaseText } from "./BaseText";
import { Button } from "./Button";
import { Flex } from "./Flex";
import { Grid } from "./Grid";
import { Margins } from "./margins";
import { Paragraph } from "./Paragraph";
import { Span } from "./Span";

interface AlertProps {
    title: ReactNode;
    body: ReactNode;
    cancelText?: string;
    confirmText?: string;
    secondaryConfirmText?: string;
    onCancel?(): void;
    onConfirm?(): void;
    onConfirmSecondary?(): void;
    onCloseCallback?(): void;
}

export function AlertModal(props: AlertProps & { modalProps: ModalProps; }) {
    const { body, title, cancelText, confirmText, onCancel, onCloseCallback, onConfirm, onConfirmSecondary, secondaryConfirmText, modalProps } = props;

    const handleClose = () => {
        modalProps.onClose();
        onCloseCallback?.();
    };

    const handleCancel = () => {
        handleClose();
        onCancel?.();
    };

    const handleConfirm = () => {
        handleClose();
        onConfirm?.();
    };

    const handleSecondaryConfirm = () => {
        handleClose();
        onConfirmSecondary?.();
    };

    const buttons = [
        cancelText && <Button key="cancel" variant="secondary" onClick={handleCancel}>{cancelText}</Button>,
        confirmText && <Button key="confirm" variant="primary" onClick={handleConfirm}>{confirmText}</Button>
    ].filter(isTruthy);

    return (
        <ModalRoot {...modalProps}>
            <ModalContent>
                <BaseText tag="h2" size="lg" weight="bold" className="vc-alert-title">{title}</BaseText>
                <Paragraph className="vc-alert-body">{body}</Paragraph>
            </ModalContent>

            <ModalFooter>
                <div>
                    {buttons.length > 0 && <Grid columns={buttons.length} gap="8px">{buttons}</Grid>}

                    {secondaryConfirmText && (
                        <Flex justifyContent="center" className={buttons.length > 0 ? Margins.top8 : undefined}>
                            {!!secondaryConfirmText && (
                                <Clickable onClick={handleSecondaryConfirm} className="vc-alert-secondaryConfirm">
                                    <Span size="xs" weight="medium" className="vc-alert-secondaryConfirm-text">{secondaryConfirmText}</Span>
                                </Clickable>
                            )}
                        </Flex>
                    )}
                </div>
            </ModalFooter>
        </ModalRoot>
    );
}

export function showAlert(props: AlertProps) {
    openModal(modalProps => <AlertModal {...props} modalProps={modalProps} />);
}
