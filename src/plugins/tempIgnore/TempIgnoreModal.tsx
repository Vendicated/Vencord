/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { RenderModalProps } from "@vencord/discord-types";
import { Modal, openModal, Forms, Text, React, Button } from "@webpack/common";

import { addIgnoredUser } from "./store";

const cl = classNameFactory("vc-temp-ignore-");

interface DurationPreset {
    label: string;
    ms: number;
}

const PRESETS: DurationPreset[] = [
    { label: "1 Hour", ms: 1 * 60 * 60 * 1000 },
    { label: "6 Hours", ms: 6 * 60 * 60 * 1000 },
    { label: "12 Hours", ms: 12 * 60 * 60 * 1000 },
    { label: "1 Day", ms: 24 * 60 * 60 * 1000 },
    { label: "3 Days", ms: 3 * 24 * 60 * 60 * 1000 },
    { label: "7 Days", ms: 7 * 24 * 60 * 60 * 1000 },
];

function TempIgnoreModalContent({ userId, username, modalProps }: {
    userId: string;
    username: string;
    modalProps: RenderModalProps;
}) {
    const [selectedPreset, setSelectedPreset] = React.useState<number | null>(null);
    const [customAmount, setCustomAmount] = React.useState("1");
    const [customUnit, setCustomUnit] = React.useState<"hours" | "days">("hours");
    const [useCustom, setUseCustom] = React.useState(false);

    function getDurationMs(): number {
        if (useCustom) {
            const amount = parseFloat(customAmount) || 1;
            const multiplier = customUnit === "days" ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
            return amount * multiplier;
        }
        if (selectedPreset !== null) {
            return PRESETS[selectedPreset].ms;
        }
        return 0;
    }

    function getDurationLabel(): string {
        if (useCustom) {
            const amount = parseFloat(customAmount) || 1;
            return `${amount} ${customUnit}`;
        }
        if (selectedPreset !== null) {
            return PRESETS[selectedPreset].label;
        }
        return "";
    }

    function handleConfirm() {
        const ms = getDurationMs();
        if (ms <= 0) return;
        addIgnoredUser(userId, username, ms);
        modalProps.onClose();
    }

    const canConfirm = useCustom ? (parseFloat(customAmount) > 0) : (selectedPreset !== null);

    return (
        <Modal
            {...modalProps}
            title="⏱ Temp Ignore"
            actions={[
                {
                    text: "Cancel",
                    variant: "secondary",
                    onClick: modalProps.onClose
                },
                {
                    text: "Confirm",
                    variant: "primary",
                    onClick: handleConfirm,
                    disabled: !canConfirm
                }
            ]}
        >
            <div className={cl("modal-content")}>
                <div className={cl("user-info")}>
                    <Text variant="text-md/normal">
                        Temporarily ignore <strong>{username}</strong>
                    </Text>
                    <Text variant="text-sm/normal" style={{ color: "var(--text-muted)", marginTop: 4 }}>
                        Their messages, DMs, status, and voice presence will be hidden for the selected duration.
                    </Text>
                </div>

                <Forms.FormTitle className={cl("section-title")}>
                    Quick Presets
                </Forms.FormTitle>
                <div className={cl("presets-grid")}>
                    {PRESETS.map((preset, i) => (
                        <Button
                            key={i}
                            size={Button.Sizes.SMALL}
                            color={selectedPreset === i && !useCustom ? Button.Colors.BRAND : Button.Colors.PRIMARY}
                            look={selectedPreset === i && !useCustom ? Button.Looks.FILLED : Button.Looks.OUTLINED}
                            onClick={() => {
                                setSelectedPreset(i);
                                setUseCustom(false);
                            }}
                        >
                            {preset.label}
                        </Button>
                    ))}
                </div>

                <Forms.FormTitle className={cl("section-title")} style={{ marginTop: 16 }}>
                    Custom Duration
                </Forms.FormTitle>
                <div className={cl("custom-row")}>
                    <input
                        type="number"
                        min="1"
                        step="1"
                        value={customAmount}
                        onChange={e => {
                            setCustomAmount(e.target.value);
                            setUseCustom(true);
                            setSelectedPreset(null);
                        }}
                        className={cl("custom-input")}
                        placeholder="Amount"
                    />
                    <select
                        value={customUnit}
                        onChange={e => {
                            setCustomUnit(e.target.value as "hours" | "days");
                            if (customAmount) {
                                setUseCustom(true);
                                setSelectedPreset(null);
                            }
                        }}
                        className={cl("custom-select")}
                    >
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                    </select>
                </div>

                {canConfirm && (
                    <div className={cl("summary")}>
                        <Text variant="text-sm/medium" style={{ color: "var(--text-positive)" }}>
                            ✓ Will ignore <strong>{username}</strong> for {getDurationLabel()}
                        </Text>
                    </div>
                )}
            </div>
        </Modal>
    );
}

export function openTempIgnoreModal(userId: string, username: string) {
    openModal(props => (
        <TempIgnoreModalContent
            userId={userId}
            username={username}
            modalProps={props}
        />
    ));
}
