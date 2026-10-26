/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 MentionControl contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { BaseText } from "@components/BaseText";
import { Button } from "@components/Button";
import { FormSwitch } from "@components/FormSwitch";
import { Heading } from "@components/Heading";

import type { Options } from "./preferences";

type Language = "ar" | "en";

export interface SettingsPanelProps {
    accountId?: string;
    options: Options;
    language: Language;
    binding: "pending" | "ready" | "incompatible";
    active: boolean;
    storageError?: string;
    onOptionsChange(options: Options): void;
    onLanguageChange(language: Language): void;
    onReset(): void;
}

const filters = [
    { key: "suppressEveryone", title: "Mute @everyone / @here" },
    { key: "suppressPersonal", title: "Mute direct mentions" },
    { key: "suppressDirectMessages", title: "Mute Direct Messages" },
    { key: "suppressReplies", title: "Mute replies to me" },
    { key: "suppressRoles", title: "Mute role mentions" }
] as const;

export function SettingsPanel(props: SettingsPanelProps) {
    const { accountId, options, binding, active, storageError } = props;
    const canEdit = Boolean(accountId) && !storageError;
    const status = !canEdit || !active ? "Off"
        : binding === "incompatible" ? "Update needed"
            : options.paused ? "Paused"
                : binding === "pending" ? "Waiting" : "Ready";

    return <section className="mc-panel" lang="en" dir="ltr">
        <div className="mc-header">
            <Heading tag="h3" className="mc-title">Alert filters</Heading>
            <BaseText tag="span" size="sm" role="status" className="mc-status">{status}</BaseText>
        </div>
        <BaseText tag="p" size="sm" className="mc-scope">Muted messages are read automatically.</BaseText>
        <BaseText tag="p" size="sm" className="mc-scope">Earlier messages in that channel may also be read.</BaseText>
        {storageError && <BaseText tag="p" size="sm" role="alert" className="mc-error">Settings unavailable.</BaseText>}
        {!accountId && <BaseText tag="p" size="sm">Sign in to edit.</BaseText>}

        <FormSwitch title="Pause filtering" value={options.paused} disabled={!canEdit}
            onChange={paused => props.onOptionsChange({ ...options, paused })} />
        {filters.map(({ key, title }) => <FormSwitch key={key} title={title} value={options[key]}
            disabled={!canEdit || (binding === "incompatible" && !options[key])}
            onChange={enabled => props.onOptionsChange({ ...options, [key]: enabled })} />)}

        <Button type="button" variant="secondary" size="small" disabled={!canEdit} onClick={() => {
            if (canEdit) props.onReset();
        }}>Reset this account</Button>
    </section>;
}
