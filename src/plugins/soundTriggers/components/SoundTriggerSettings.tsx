/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { Flex } from "@components/Flex";
import { openModal } from "@utils/modal";
import { Button, Clipboard, Forms } from "@webpack/common";

import { classFactory, settings } from "..";
import { successToast } from "../util";
import { EmptyState } from "./EmptyState";
import { ImportModal } from "./ImportModal";
import { SoundTriggerEntry } from "./SoundTriggerEntry";
import { openTriggerModal } from "./SoundTriggerModal";


export function SoundTriggerSettings() {
    const settingsExist = Array.isArray(settings.store.soundTriggers);
    return (
        <Flex flexDirection="column">
            <Flex flexDirection="row">
                <Button
                    style={{ flexGrow: 1 }}
                    disabled={!settingsExist}
                    onClick={() => openTriggerModal({
                        mode: "create",
                        onSubmit(trigger) {
                            settings.store.soundTriggers = [...settings.store.soundTriggers, trigger];
                        }
                    })}
                >
                    New
                </Button>
                <Flex flexDirection="row">
                    <Button
                        disabled={!settingsExist}
                        onClick={() => openModal(modalProps => <ImportModal {...modalProps} />)}
                    >
                        Import
                    </Button>
                    <Button
                        disabled={!settingsExist}
                        onClick={() => {
                            const json = JSON.stringify(settings.store.soundTriggers);
                            Clipboard.copy(json);
                            successToast("Sound triggers exported and copied to clipboard.");
                        }}>
                        Export
                    </Button>
                </Flex>
            </Flex>
            <Flex flexDirection="column" style={{ gap: "6px" }}>
                <Flex flexDirection="row" style={{ flexGrow: 1, alignItems: "center" }}>
                    <Forms.FormTitle tag="h5" style={{ flex: 1 }}>Pattern</Forms.FormTitle>
                    <Forms.FormTitle tag="h5" style={{ flex: 1 }}>Sound</Forms.FormTitle>
                    <div className={classFactory("rounded-button")} />
                </Flex>
                <Forms.FormDivider />
                {settingsExist && settings.store.soundTriggers.length > 0
                    ? settings.store.soundTriggers.map((trigger, i) => (
                        <SoundTriggerEntry
                            key={i}
                            index={i}
                            trigger={trigger}
                            onDelete={i => {
                                const newTriggers = settings.store.soundTriggers.filter((_, idx) => idx !== i);
                                settings.store.soundTriggers = newTriggers;
                            }}
                        />
                    ))
                    : <EmptyState text={settingsExist ? "No Triggers." : "Enable to get started."} />
                }
            </Flex>
        </Flex>

    );
}
