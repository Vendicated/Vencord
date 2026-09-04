/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { Divider } from "@components/Divider";
import { ErrorCard } from "@components/ErrorCard";
import { Flex } from "@components/Flex";
import { FormSwitch } from "@components/FormSwitch";
import { HeadingSecondary } from "@components/Heading";
import { DeleteIcon, PencilIcon } from "@components/Icons";
import { Margins } from "@components/margins";
import { Paragraph } from "@components/Paragraph";
import { Span } from "@components/Span";
import { Switch } from "@components/Switch";
import { classes } from "@utils/misc";
import { React, Select, TextInput, useEffect, useState } from "@webpack/common";

import { evaluate, getActiveRuleId, settings } from ".";
import {
    DAY_NAMES,
    DAYS,
    DEFAULT_STATUS_OPTIONS,
    DefaultStatusType,
    findConflict,
    formatDays,
    isRuleActive,
    ScheduleRule,
    STATUS_OPTIONS,
    statusName,
    StatusType
} from "./types";

function DayPicker({ selected, onChange }: { selected: number[]; onChange(d: number[]): void; }) {
    const toggle = (v: number) =>
        onChange(selected.includes(v) ? selected.filter(d => d !== v) : [...selected, v]);

    return (
        <section>
            <Flex style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <Span size="sm" weight="medium">Days</Span>
                <div className="vc-scheduledStatus-pills">
                    <Button variant="secondary" size="min" onClick={() => onChange([0, 1, 2, 3, 4])}>Weekdays</Button>
                    <Button variant="secondary" size="min" onClick={() => onChange([5, 6])}>Weekends</Button>
                    <Button variant="secondary" size="min" onClick={() => onChange([0, 1, 2, 3, 4, 5, 6])}>All</Button>
                    <Button variant="secondary" size="min" onClick={() => onChange([])}>Clear</Button>
                </div>
            </Flex>
            <div className="vc-scheduledStatus-pills">
                {DAYS.map(d => (
                    <button
                        key={d.value}
                        type="button"
                        className={classes("vc-scheduledStatus-pill", selected.includes(d.value) && "vc-scheduledStatus-pill-on")}
                        onClick={() => toggle(d.value)}
                        title={d.long}
                    >
                        {d.short}
                    </button>
                ))}
            </div>
        </section>
    );
}

function TimePicker({ start, end, onStart, onEnd }: {
    start: string; end: string;
    onStart(v: string): void; onEnd(v: string): void;
}) {
    return (
        <div className="vc-scheduledStatus-timeRow">
            <section>
                <Span size="sm" weight="medium">Start</Span>
                <input type="time" className="vc-scheduledStatus-timeInput" value={start} onChange={e => onStart(e.currentTarget.value)} />
            </section>
            <section>
                <Span size="sm" weight="medium">End</Span>
                <input type="time" className="vc-scheduledStatus-timeInput" value={end} onChange={e => onEnd(e.currentTarget.value)} />
            </section>
        </div>
    );
}

export function SettingsPanel() {
    const [, setTick] = useState(0);
    const rerender = () => setTick(t => t + 1);
    useEffect(() => {
        const id = setInterval(rerender, 10_000);
        return () => clearInterval(id);
    }, []);

    const rules: ScheduleRule[] = settings.store.schedules ?? [];
    const now = new Date();
    const activeId = getActiveRuleId();
    const activeRule = rules.find(r => r.id === activeId || (activeId == null && isRuleActive(r, now)));

    const [days, setDays] = useState<number[]>([0]);
    const [startTime, setStartTime] = useState("08:00");
    const [endTime, setEndTime] = useState("17:00");
    const [status, setStatus] = useState<StatusType>("dnd");
    const [name, setName] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [editId, setEditId] = useState<string | null>(null);

    function save(next: ScheduleRule[]) {
        settings.store.schedules = next;
        rerender();
        evaluate();
    }

    function addRule() {
        setError(null);
        if (!days.length) return setError("Select at least one day.");
        if (!startTime || !endTime) return setError("Set a start and end time.");

        const rule: ScheduleRule = {
            id: crypto.randomUUID(),
            name: name.trim() || `${statusName(status)} (${startTime} – ${endTime})`,
            enabled: true,
            days: [...days],
            startTime,
            endTime,
            status,
        };

        const conflict = findConflict(rule, rules);
        if (conflict) {
            return setError(`Overlaps with "${conflict.rule.name}" on ${DAY_NAMES[conflict.day]}`);
        }

        save([...rules, rule]);
        setName("");
        setError(null);
    }

    function updateRule(idx: number, updated: ScheduleRule) {
        setError(null);
        if (updated.enabled) {
            const conflict = findConflict(updated, rules, updated.id);
            if (conflict) {
                return setError(`"${updated.name}" overlaps with "${conflict.rule.name}" on ${DAY_NAMES[conflict.day]}`);
            }
        }
        const next = [...rules];
        next[idx] = updated;
        save(next);
    }

    function deleteRule(idx: number) {
        if (rules[idx].id === editId) setEditId(null);
        save(rules.filter((_, i) => i !== idx));
    }

    return (
        <Flex flexDirection="column" gap="1em">
            <section>
                <HeadingSecondary>Add Time Slot</HeadingSecondary>
                <Flex flexDirection="column" gap="0.75em" className={Margins.top8}>
                    <DayPicker selected={days} onChange={d => { setDays(d); setError(null); }} />

                    <TimePicker
                        start={startTime} end={endTime}
                        onStart={v => { setStartTime(v); setError(null); }}
                        onEnd={v => { setEndTime(v); setError(null); }}
                    />

                    <section>
                        <Span size="sm" weight="medium">Status</Span>
                        <Select
                            options={STATUS_OPTIONS}
                            isSelected={v => v === status}
                            select={v => setStatus(v as StatusType)}
                            serialize={String}
                            closeOnSelect
                        />
                    </section>

                    <section>
                        <Span size="sm" weight="medium">Name (optional)</Span>
                        <TextInput placeholder="e.g. Work, Gaming, Sleep" value={name} onChange={setName} />
                    </section>

                    {error && (
                        <ErrorCard>
                            <Paragraph size="sm" weight="medium">⚠️ {error}</Paragraph>
                        </ErrorCard>
                    )}

                    <Flex style={{ justifyContent: "flex-end" }}>
                        <Button onClick={addRule}>Add</Button>
                    </Flex>
                </Flex>
            </section>

            <Divider />

            <section>
                <HeadingSecondary>Schedules ({rules.length})</HeadingSecondary>

                {rules.length === 0 ? (
                    <Card className={Margins.top8}>
                        <Paragraph size="sm" style={{ textAlign: "center" }}>No schedules yet</Paragraph>
                    </Card>
                ) : (
                    <Flex flexDirection="column" gap="0.5em" className={Margins.top8}>
                        {rules.map((rule, idx) => {
                            const active = activeRule?.id === rule.id && rule.enabled;
                            const editing = editId === rule.id;

                            return (
                                <React.Fragment key={rule.id}>
                                    <Card className={classes("vc-scheduledStatus-card", active && "vc-scheduledStatus-card-active")}>
                                        <Switch checked={rule.enabled} onChange={v => updateRule(idx, { ...rule, enabled: v })} />
                                        <div className="vc-scheduledStatus-info">
                                            <Flex style={{ alignItems: "center", gap: 6 }}>
                                                <span className={`vc-scheduledStatus-dot vc-scheduledStatus-dot-${rule.status}`} />
                                                <Span size="md" weight="semibold">{rule.name}</Span>
                                                {active && <span className="vc-scheduledStatus-badge">Active</span>}
                                            </Flex>
                                            <Span size="xs">
                                                {formatDays(rule.days)} · {rule.startTime} – {rule.endTime} · {statusName(rule.status)}
                                            </Span>
                                        </div>
                                        <Button variant="secondary" size="iconOnly" onClick={() => setEditId(editing ? null : rule.id)}>
                                            <PencilIcon aria-label="Edit" width={20} height={20} />
                                        </Button>
                                        <Button variant="dangerSecondary" size="iconOnly" onClick={() => deleteRule(idx)}>
                                            <DeleteIcon aria-label="Delete" width={20} height={20} />
                                        </Button>
                                    </Card>

                                    {editing && (
                                        <Card defaultPadding>
                                            <Flex flexDirection="column" gap="0.75em">
                                                <section>
                                                    <Span size="sm" weight="medium">Name</Span>
                                                    <TextInput value={rule.name} onChange={v => updateRule(idx, { ...rule, name: v })} />
                                                </section>
                                                <section>
                                                    <Span size="sm" weight="medium">Status</Span>
                                                    <Select
                                                        options={STATUS_OPTIONS}
                                                        isSelected={v => v === rule.status}
                                                        select={v => updateRule(idx, { ...rule, status: v as StatusType })}
                                                        serialize={String}
                                                        closeOnSelect
                                                    />
                                                </section>
                                                <DayPicker selected={rule.days} onChange={d => updateRule(idx, { ...rule, days: d })} />
                                                <TimePicker
                                                    start={rule.startTime} end={rule.endTime}
                                                    onStart={v => updateRule(idx, { ...rule, startTime: v })}
                                                    onEnd={v => updateRule(idx, { ...rule, endTime: v })}
                                                />
                                                <Flex style={{ justifyContent: "flex-end" }}>
                                                    <Button variant="secondary" size="small" onClick={() => setEditId(null)}>Done</Button>
                                                </Flex>
                                            </Flex>
                                        </Card>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </Flex>
                )}
            </section>

            {rules.length > 0 && (<>
                <Divider />
                <section>
                    <HeadingSecondary>Weekly Overview</HeadingSecondary>
                    <Flex flexDirection="column" gap="0.5em" className={Margins.top8}>
                        {DAYS.map(d => {
                            const slots = rules
                                .filter(r => r.enabled && r.days.includes(d.value))
                                .sort((a, b) => a.startTime.localeCompare(b.startTime));

                            return (
                                <Card key={d.value} className="vc-scheduledStatus-weekCard">
                                    <Span size="sm" weight="semibold">{d.long}</Span>
                                    {slots.length === 0 ? (
                                        <Span size="xs">—</Span>
                                    ) : (
                                        <Flex style={{ gap: 6, flexWrap: "wrap" }}>
                                            {slots.map(s => (
                                                <span key={s.id} className="vc-scheduledStatus-slotPill">
                                                    <span className={`vc-scheduledStatus-dot vc-scheduledStatus-dot-${s.status}`} />
                                                    {s.startTime} – {s.endTime}
                                                </span>
                                            ))}
                                        </Flex>
                                    )}
                                </Card>
                            );
                        })}
                    </Flex>
                </section>
            </>)}

            <Divider />

            <section>
                <HeadingSecondary>Options</HeadingSecondary>
                <div className={Margins.top8}>
                    <Span size="sm" weight="medium">Fallback status</Span>
                    <Select
                        options={DEFAULT_STATUS_OPTIONS}
                        isSelected={v => v === (settings.store.defaultStatus ?? "previous")}
                        select={v => { settings.store.defaultStatus = v as DefaultStatusType; rerender(); evaluate(); }}
                        serialize={String}
                        closeOnSelect
                    />
                </div>
                <FormSwitch
                    title="Toast Notifications"
                    description="Show a toast when status changes due to a schedule"
                    value={settings.store.notifyOnChange ?? true}
                    onChange={v => { settings.store.notifyOnChange = v; rerender(); }}
                    className={Margins.top16}
                    hideBorder
                />
            </section>
        </Flex>
    );
}
