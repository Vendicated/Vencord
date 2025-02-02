/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Flex } from "@components/Flex";
import { DeleteIcon } from "@components/Icons";
import { Alerts, Button, ContextMenuApi, FluxDispatcher, Menu, Text } from "@webpack/common";

import { classFactory, settings, SoundTrigger } from "..";
import { openTriggerModal } from "./SoundTriggerModal";

function EditIcon() {
    return (
        <svg role="img" width="18" height="18" viewBox="0 0 24 24">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M19.2929 9.8299L19.9409 9.18278C21.353 7.77064 21.353 5.47197 19.9409 4.05892C18.5287 2.64678 16.2292 2.64678 14.817 4.05892L14.1699 4.70694L19.2929 9.8299ZM12.8962 5.97688L5.18469 13.6906L10.3085 18.813L18.0201 11.0992L12.8962 5.97688ZM4.11851 20.9704L8.75906 19.8112L4.18692 15.239L3.02678 19.8796C2.95028 20.1856 3.04028 20.5105 3.26349 20.7337C3.48669 20.9569 3.8116 21.046 4.11851 20.9704Z" fill="currentColor"></path>
        </svg>
    );
}

function MoreIcon() {
    return (
        <svg role="img" width="18" height="18" viewBox="0 0 24 24">
            <path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M7 12.001C7 10.8964 6.10457 10.001 5 10.001C3.89543 10.001 3 10.8964 3 12.001C3 13.1055 3.89543 14.001 5 14.001C6.10457 14.001 7 13.1055 7 12.001ZM14 12.001C14 10.8964 13.1046 10.001 12 10.001C10.8954 10.001 10 10.8964 10 12.001C10 13.1055 10.8954 14.001 12 14.001C13.1046 14.001 14 13.1055 14 12.001ZM19 10.001C20.1046 10.001 21 10.8964 21 12.001C21 13.1055 20.1046 14.001 19 14.001C17.8954 14.001 17 13.1055 17 12.001C17 10.8964 17.8954 10.001 19 10.001Z"></path>
        </svg>
    );
}

interface SoundTriggerEntryMenuProps {
    trigger: SoundTrigger;
    index: number;
    onDelete(index: number): void;
}

function SoundTriggerEntryMenu(props: SoundTriggerEntryMenuProps) {
    const { trigger, index, onDelete } = props;
    return (
        <Menu.Menu
            navId="sound-trigger-menu"
            onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
        >
            <Menu.MenuItem
                id="sound-trigger-edit"
                label="Edit"
                icon={() => <EditIcon />}
                action={() =>
                    openTriggerModal({
                        mode: "edit",
                        onSubmit(trigger) {
                            settings.store.soundTriggers[index] = trigger;
                        },
                        data: trigger
                    })}
            />
            <Menu.MenuItem
                id="sound-trigger-delete"
                label="Delete"
                icon={() => <DeleteIcon width={18} height={18} />}
                color="danger"
                action={() =>
                    Alerts.show({
                        title: "Delete Trigger",
                        body: (
                            <>
                                <Text>Are you sure you want to delete this trigger?</Text>
                                <Flex flexDirection="column" style={{ gap: "6px" }}>
                                    <Text><b>Patterns: </b>{trigger.patterns.join(", ")}</Text>
                                    <Text><b>Sound URL: </b>{trigger.sound}</Text>
                                </Flex>
                            </>
                        ),
                        onConfirm: () => onDelete(index),
                        confirmText: "Delete",
                        confirmColor: Button.Colors.RED,
                        cancelText: "Cancel"
                    })}
            />
        </Menu.Menu>
    );
}

interface SoundTriggerEntryProps {
    index: number;
    trigger: SoundTrigger;
    onDelete(index: number): void;
}

export function SoundTriggerEntry(props: SoundTriggerEntryProps) {
    const { trigger, index, onDelete } = props;

    return (
        <Flex flexDirection="row" className={classFactory("trigger-entry", "section", "hoverable-section")}>
            <Flex flexDirection="row" style={{ flexGrow: 1 }}>
                <Text style={{ flex: 1, overflowWrap: "anywhere" }}>{trigger.patterns.join(", ")}</Text>
                <Text style={{ flex: 1, overflowWrap: "anywhere" }}>{trigger.sound}</Text>
            </Flex>
            <Flex flexDirection="row">
                <Button
                    look={Button.Looks.BLANK}
                    className={classFactory("rounded-button", "more-button")}
                    onClick={e =>
                        ContextMenuApi.openContextMenu(e, () =>
                            <SoundTriggerEntryMenu
                                index={index}
                                trigger={trigger}
                                onDelete={onDelete}
                            />)}
                >
                    <MoreIcon />
                </Button>
            </Flex>
        </Flex>
    );
}
