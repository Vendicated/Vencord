/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 cegged
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Switch } from "@components/Switch";
import { cl } from "@plugins/soundPanel.desktop/components/common";
import type { ScreenSource } from "@plugins/soundPanel.desktop/native";
import { logger } from "@plugins/soundPanel.desktop/utils/logger";
import { Native } from "@plugins/soundPanel.desktop/utils/native";
import type { RenderModalProps } from "@vencord/discord-types";
import { Modal, openModal, useEffect, useState } from "@webpack/common";

export interface ScreenShareChoice {
    id: string;
    audio: boolean;
}

type SourceKind = "screen" | "window";

const kindOf = (source: ScreenSource): SourceKind => source.id.startsWith("screen:") ? "screen" : "window";

function SourceTile({ source, selected, onSelect, onConfirm }: {
    source: ScreenSource;
    selected: boolean;
    onSelect(): void;
    onConfirm(): void;
}) {
    return (
        <button
            type="button"
            className={cl("source", { "source-selected": selected })}
            onClick={onSelect}
            onDoubleClick={onConfirm}
            title={source.name}
        >
            <img className={cl("source-thumbnail")} src={source.thumbnail} alt="" />
            <span className={cl("source-label")}>
                {source.icon && <img className={cl("source-icon")} src={source.icon} alt="" />}
                <span className={cl("source-name")}>{source.name}</span>
            </span>
        </button>
    );
}

function SourcePickerModal({ modalProps, audioRequested, onPick }: {
    modalProps: RenderModalProps;
    audioRequested: boolean;
    onPick(choice: ScreenShareChoice): void;
}) {
    const [sources, setSources] = useState<ScreenSource[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [kind, setKind] = useState<SourceKind>("screen");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [audio, setAudio] = useState(audioRequested);

    useEffect(() => {
        Native!.getScreenSources()
            .then(list => {
                setSources(list);
                setSelectedId(list.find(s => kindOf(s) === "screen")?.id ?? null);
            })
            .catch(err => {
                logger.error("Failed to list screen sources", err);
                setError("Couldn't list your screens and windows");
            });
    }, []);

    const confirm = (id = selectedId) => {
        if (!id) return;
        onPick({ id, audio: audioRequested && audio });
        modalProps.onClose();
    };

    const visible = sources?.filter(source => kindOf(source) === kind) ?? [];

    return (
        <Modal
            {...modalProps}
            size="lg"
            title="Choose what to share"
            subtitle="Pick a screen or a window to stream"
            actions={[
                { text: "Cancel", variant: "secondary", onClick: modalProps.onClose },
                { text: "Go Live", variant: "primary", disabled: !selectedId, onClick: () => confirm() }
            ]}
            actionBarInput={audioRequested && (
                <label className={cl("share-audio")}>
                    <Switch checked={audio} onChange={setAudio} />
                    <span>Share audio (people in the call are left out)</span>
                </label>
            )}
        >
            <div className={cl("source-tabs")} role="tablist">
                {(["screen", "window"] as const).map(k => (
                    <button
                        key={k}
                        type="button"
                        role="tab"
                        aria-selected={kind === k}
                        className={cl("tab-button", { "tab-button-active": kind === k })}
                        onClick={() => setKind(k)}
                    >
                        {k === "screen" ? "Screens" : "Windows"}
                    </button>
                ))}
            </div>

            {error ? (
                <div className={cl("notice")}>{error}</div>
            ) : !sources ? (
                <div className={cl("notice")}>Loading screens and windows...</div>
            ) : visible.length === 0 ? (
                <div className={cl("notice")}>Nothing to share here</div>
            ) : (
                <div className={cl("source-grid")}>
                    {visible.map(source => (
                        <SourceTile
                            key={source.id}
                            source={source}
                            selected={source.id === selectedId}
                            onSelect={() => setSelectedId(source.id)}
                            onConfirm={() => confirm(source.id)}
                        />
                    ))}
                </div>
            )}
        </Modal>
    );
}

export function pickScreenSource(audioRequested: boolean) {
    return new Promise<ScreenShareChoice | null>(resolve => {
        let settled = false;
        const settle = (choice: ScreenShareChoice | null) => {
            if (settled) return;
            settled = true;
            resolve(choice);
        };

        openModal(
            props => <SourcePickerModal modalProps={props} audioRequested={audioRequested} onPick={settle} />,
            { onCloseCallback: () => settle(null) }
        );
    });
}
