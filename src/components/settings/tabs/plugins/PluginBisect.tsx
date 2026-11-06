/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotice } from "@api/Notices";
import { BisectState, estimateRemainingSteps, getBisectCandidates, getBisectState, reportBisectStep, startBisect, stopBisect } from "@api/PluginBisect";
import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { confirmAction } from "@utils/discord";
import { Logger } from "@utils/Logger";
import { Margins } from "@utils/margins";
import { ModalAction, RenderModalProps } from "@vencord/discord-types";
import { Modal, openModal, showToast, useState } from "@webpack/common";

import { NavigationCard } from "./UIElements";

const logger = new Logger("PluginBisect", "#a6d189");

function ResultContent({ state }: { state: BisectState; }) {
    switch (state.result!.type) {
        case "found":
            return (
                <Paragraph>
                    Your issue seems to be caused by <b>{state.result!.plugin}</b>.
                    You can keep it disabled while restoring all your other plugins.
                </Paragraph>
            );
        case "notPlugin":
            return (
                <Paragraph>
                    Your issue still happened with all plugins disabled, so it is most likely not caused by a plugin.
                    It might be caused by your themes or QuickCSS, Vencord itself, or Discord.
                </Paragraph>
            );
        case "inconclusive":
            return (
                <Paragraph>
                    Your issue could not be narrowed down to a single plugin.
                    It probably only happens when multiple specific plugins are enabled together.
                </Paragraph>
            );
    }
}

function StepContent({ state }: { state: BisectState; }) {
    const { testing } = state;

    return (
        <>
            <Paragraph className={Margins.bottom8}>
                {testing.length
                    ? `Only ${testing.length} of your plugins ${testing.length === 1 ? "is" : "are"} enabled right now:`
                    : "All of your plugins are disabled right now."}
            </Paragraph>
            {testing.length > 0 && (
                <Paragraph className={Margins.bottom8} weight="semibold">{testing.join(", ")}</Paragraph>
            )}
            <Paragraph>
                Try to reproduce your issue, then let us know whether it still happens. Discord will restart after each step.
            </Paragraph>
        </>
    );
}

function BisectModal(props: RenderModalProps) {
    const [state, setState] = useState(getBisectState);
    const [busy, setBusy] = useState(false);

    if (!state) return null;

    const run = (fn: () => Promise<unknown> | unknown) => async () => {
        setBusy(true);
        try {
            await fn();
        } catch (e) {
            logger.error("Bisect action failed", e);
            showToast({ text: "Something went wrong, check the console for details", variant: "critical" });
        } finally {
            setBusy(false);
        }
    };

    const report = (issuePresent: boolean) => run(async () => setState(await reportBisectStep(issuePresent)));

    const { result } = state;

    const actions: ModalAction[] = !result
        ? [
            { text: "It still happens", variant: "primary", onClick: report(true) },
            { text: "It's gone", variant: "primary", onClick: report(false) },
            {
                text: "Stop",
                variant: "secondary",
                onClick: () => confirmAction({
                    title: "Stop bisecting?",
                    subtitle: "Your plugins will be restored to how they were before and Discord will restart.",
                    confirmText: "Stop",
                    onConfirm: () => stopBisect()
                })
            }
        ]
        : result.type === "found"
            ? [
                { text: `Disable ${result.plugin} and restore others`, variant: "primary", onClick: run(() => stopBisect([result.plugin])) },
                { text: "Restore all plugins", variant: "secondary", onClick: run(() => stopBisect()) }
            ]
            : [
                { text: "Restore plugins", variant: "primary", onClick: run(() => stopBisect()) }
            ];

    return (
        <Modal
            {...props}
            size="md"
            title={result ? "Plugin bisect finished" : "Plugin bisect"}
            subtitle={!result && `Step ${state.step}: ${state.suspects.length} suspects left, about ${estimateRemainingSteps(state)} more restarts`}
            actions={actions.map(a => ({ ...a, disabled: busy }))}
        >
            {result ? <ResultContent state={state} /> : <StepContent state={state} />}
        </Modal>
    );
}

export const openBisectModal = () => openModal(props => <BisectModal {...props} />);

function promptStartBisect() {
    const count = getBisectCandidates().length;
    if (!count) {
        showToast({ text: "You don't have any plugins enabled", variant: "critical" });
        return;
    }

    confirmAction({
        title: "Find a problematic plugin",
        subtitle: `First, all ${count} of your enabled plugins will be disabled. Then they will be re-enabled in halves until the plugin causing your issue is found. ` +
            "After every restart, check whether your issue still happens. Once done, your plugins will be restored.",
        confirmText: "Start",
        variant: "primary",
        onConfirm: startBisect
    }).catch(e => logger.error("Failed to start bisect", e));
}

export function PluginBisectCard() {
    const state = getBisectState();

    if (!state) return (
        <NavigationCard
            title="Find a problematic plugin"
            description="Narrow down which plugin is causing an issue by disabling plugins step by step"
            onClick={promptStartBisect}
        />
    );

    return (
        <Card variant={state.result ? "success" : "warning"} className={Margins.top8} defaultPadding>
            <Heading tag="h4">{state.result ? "Plugin bisect finished" : "Plugin bisect in progress"}</Heading>
            <Paragraph className={Margins.bottom8}>
                {state.result
                    ? "Restore your plugins to get back to normal."
                    : "Changes you make to enabled plugins will be lost once the bisect ends."}
            </Paragraph>
            <Button onClick={openBisectModal}>{state.result ? "View result" : "Continue"}</Button>
        </Card>
    );
}

export function showPluginBisectNotice() {
    const state = getBisectState();
    if (!state) return;

    if (state.result)
        showNotice("Vencord plugin bisect finished!", "View result", openBisectModal);
    else
        showNotice(`Vencord plugin bisect in progress (step ${state.step}). Check whether your issue still happens.`, "Continue", openBisectModal);
}
