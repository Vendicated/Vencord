/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Alerts, Button, Paragraph, showToast, ToastType } from "..";
import { SectionWrapper } from "../SectionWrapper";

export default function AlertTab() {
    const showBasicAlert = () => {
        Alerts.show({
            title: "Basic Alert",
            body: "This is a basic alert dialog with just an OK button.",
        });
    };

    const showConfirmAlert = () => {
        Alerts.show({
            title: "Confirm Action",
            body: "Are you sure you want to proceed with this action?",
            confirmText: "Yes, proceed",
            cancelText: "Cancel",
            onConfirm: () => showToast("Confirmed!", ToastType.SUCCESS),
            onCancel: () => showToast("Cancelled", ToastType.MESSAGE),
        });
    };

    const showDangerAlert = () => {
        Alerts.show({
            title: "Delete Item",
            body: "This action cannot be undone. Are you sure you want to delete this item?",
            confirmText: "Delete",
            confirmVariant: "critical-primary",
            cancelText: "Keep it",
            onConfirm: () => showToast("Deleted!", ToastType.SUCCESS),
        });
    };

    const showExpressiveAlert = () => {
        Alerts.show({
            title: "Premium Feature",
            body: "This feature requires a premium subscription.",
            confirmText: "Upgrade Now",
            confirmVariant: "expressive",
            cancelText: "Maybe Later",
            onConfirm: () => showToast("Upgrading!", ToastType.SUCCESS),
        });
    };

    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Basic Alert">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Simple alert with just a title and body.
                </Paragraph>
                <Button onClick={showBasicAlert}>
                    Show Basic Alert
                </Button>
            </SectionWrapper>

            <SectionWrapper title="Confirm Alert">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Alert with confirm and cancel buttons and callbacks.
                </Paragraph>
                <Button onClick={showConfirmAlert}>
                    Show Confirm Alert
                </Button>
            </SectionWrapper>

            <SectionWrapper title="Danger Alert">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Alert with red danger button for destructive actions.
                </Paragraph>
                <Button variant="dangerPrimary" onClick={showDangerAlert}>
                    Show Danger Alert
                </Button>
            </SectionWrapper>

            <SectionWrapper title="Expressive Alert">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Alert with premium/expressive styled button.
                </Paragraph>
                <Button onClick={showExpressiveAlert}>
                    Show Expressive Alert
                </Button>
            </SectionWrapper>

            <SectionWrapper title="Alerts API">
                <Paragraph color="text-muted">
                    <strong>Alerts.show(options)</strong> - Show an alert dialog
                </Paragraph>
                <Paragraph color="text-muted">
                    <strong>Alerts.close()</strong> - Close the current alert
                </Paragraph>
                <Paragraph color="text-muted">
                    <strong>Alerts.confirm(options)</strong> - Show a confirm dialog
                </Paragraph>
            </SectionWrapper>

            <SectionWrapper title="Options">
                <Paragraph color="text-muted">
                    <strong>title</strong> - Alert title text
                </Paragraph>
                <Paragraph color="text-muted">
                    <strong>body</strong> - Alert body content (string or ReactNode)
                </Paragraph>
                <Paragraph color="text-muted">
                    <strong>confirmText</strong> - Text for confirm button
                </Paragraph>
                <Paragraph color="text-muted">
                    <strong>cancelText</strong> - Text for cancel button (shows cancel if set)
                </Paragraph>
                <Paragraph color="text-muted">
                    <strong>confirmVariant</strong> - "primary", "critical-primary", or "expressive"
                </Paragraph>
                <Paragraph color="text-muted">
                    <strong>onConfirm</strong> - Callback when confirm clicked
                </Paragraph>
                <Paragraph color="text-muted">
                    <strong>onCancel</strong> - Callback when cancel clicked
                </Paragraph>
                <Paragraph color="text-muted">
                    <strong>onCloseCallback</strong> - Callback when alert closes
                </Paragraph>
            </SectionWrapper>
        </div>
    );
}
