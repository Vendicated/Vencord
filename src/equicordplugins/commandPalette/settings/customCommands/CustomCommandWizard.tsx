/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button, TextButton } from "@components/Button";
import { Paragraph } from "@components/Paragraph";
import { React } from "@webpack/common";

import type { CustomCommandDefinition } from "../../registry";
import { AdvancedSection } from "./AdvancedSection";
import { hasAdvancedContent } from "./helpers";
import { ActionStep } from "./steps/ActionStep";
import { BasicsStep } from "./steps/BasicsStep";
import { ReviewStep } from "./steps/ReviewStep";
import type { CategoryOption } from "./types";
import { hasStepBlockingError, validateCustomCommand } from "./validation";

interface CustomCommandWizardProps {
    command: CustomCommandDefinition;
    categoryOptions: CategoryOption[];
    onDraftChange?(command: CustomCommandDefinition): void;
    onCommit(command: CustomCommandDefinition): void;
    onCancel(): void;
}

const STEP_LABELS = ["Basics", "Action", "Review"] as const;

export function CustomCommandWizard({ command, categoryOptions, onDraftChange, onCommit, onCancel }: CustomCommandWizardProps) {
    const [draft, setDraft] = React.useState(command);
    const [wizardStep, setWizardStep] = React.useState<0 | 1 | 2>(0);
    const [showAdvanced, setShowAdvanced] = React.useState(() => hasAdvancedContent(command));
    const [showStepWarning, setShowStepWarning] = React.useState(false);
    const issues = React.useMemo(() => validateCustomCommand(draft), [draft]);
    const hasBlockingForStep = hasStepBlockingError(draft, wizardStep);

    React.useEffect(() => {
        setDraft(command);
        setShowAdvanced(hasAdvancedContent(command));
        setShowStepWarning(false);
    }, [command]);

    React.useEffect(() => {
        onDraftChange?.(draft);
    }, [draft, onDraftChange]);

    const handleNext = () => {
        if (wizardStep >= 2) return;
        if (hasBlockingForStep) {
            setShowStepWarning(true);
            return;
        }
        setShowStepWarning(false);
        setWizardStep(current => (current + 1) as 0 | 1 | 2);
    };

    const handleBack = () => {
        if (wizardStep <= 0) return;
        setShowStepWarning(false);
        setWizardStep(current => (current - 1) as 0 | 1 | 2);
    };

    const handleDone = () => {
        if (validateCustomCommand(draft).some(issue => issue.severity === "error")) {
            setShowStepWarning(true);
            return;
        }
        setShowStepWarning(false);
        onCommit(draft);
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {STEP_LABELS.map((label, index) => {
                    const active = wizardStep === index;
                    return (
                        <span
                            key={label}
                            style={{
                                fontSize: 12,
                                color: active ? "var(--text-normal, #dcddde)" : "var(--text-muted, #a5a6ab)",
                                fontWeight: active ? 700 : 500
                            }}
                        >
                            {index + 1}. {label}
                        </span>
                    );
                })}
            </div>

            {wizardStep === 0 && <BasicsStep command={draft} onChange={setDraft} />}
            {wizardStep === 1 && <ActionStep command={draft} onChange={setDraft} showAdvanced={showAdvanced} />}
            {wizardStep === 2 && <ReviewStep command={draft} issues={issues} />}

            <TextButton variant="secondary" onClick={() => setShowAdvanced(value => !value)}>
                {showAdvanced ? "Hide advanced options" : "Show advanced options"}
            </TextButton>

            {showAdvanced && (
                <AdvancedSection
                    command={draft}
                    categoryOptions={categoryOptions}
                    onChange={setDraft}
                />
            )}

            {showStepWarning && hasBlockingForStep && (
                <Paragraph size="sm" style={{ color: "var(--status-danger-text, #f04747)" }}>
                    Resolve required fields before moving forward.
                </Paragraph>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div style={{ display: "flex", gap: 8 }}>
                    <Button variant="secondary" size="small" disabled={wizardStep === 0} onClick={handleBack}>
                        Back
                    </Button>
                    <Button variant="secondary" size="small" onClick={onCancel}>
                        Cancel
                    </Button>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                    {wizardStep < 2 ? (
                        <Button size="small" onClick={handleNext} disabled={hasBlockingForStep}>
                            Next
                        </Button>
                    ) : (
                        <Button size="small" onClick={handleDone} disabled={issues.some(issue => issue.severity === "error")}>
                            Done
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
