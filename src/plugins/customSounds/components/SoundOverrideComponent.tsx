/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./SoundOverrideComponent.css";

import { makeRange } from "@components/PluginSettings/components";
import { Margins } from "@utils/margins";
import { findByCodeLazy, findLazy } from "@webpack";
import { Button, Card, Forms, Slider, Switch, TextInput, useRef } from "@webpack/common";

import { SoundOverride, SoundPlayer, SoundType } from "../types";
import { FolderIcon, OpenExternalIcon } from "@components/Icons";
import { Flex } from "@components/Flex";
import { ComponentType, Ref, SyntheticEvent } from "react";

type FileInput = ComponentType<{
    ref: Ref<HTMLInputElement>;
    onChange: (e: SyntheticEvent<HTMLInputElement>) => void;
    multiple?: boolean;
    filters?: { name?: string; extensions: string[]; }[];
}>;

const playSound: (id: string) => SoundPlayer = findByCodeLazy(".playWithListener().then");
const FileInput: FileInput = findLazy(m => m.prototype?.activateUploadDialogue && m.prototype.setRef);

export function SoundOverrideComponent({ type, override }: { type: SoundType; override: SoundOverride; }) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const sound: React.MutableRefObject<SoundPlayer | null> = useRef(null);

    return (
        <Card style={{ padding: "1em 1em 0" }}>
            <Switch
                value={override.enabled}
                onChange={value => override.enabled = value}
                hideBorder={true}
            >
                {type.name} <span style={{ color: "var(--text-muted)" }}>({type.id})</span>
            </Switch>
            <Button
                color={Button.Colors.PRIMARY}
                className={Margins.bottom16}
                onClick={() => {
                    if (sound.current != null)
                        sound.current.stop();
                    sound.current = playSound(type.id);
                }}
                disabled={!override.enabled}
            >
                Preview
            </Button>
            <Forms.FormTitle>Link or File</Forms.FormTitle>
            <Flex
                flexDirection="row"
                className={Margins.bottom16}
                style={{
                    justifyContent: "space-between",
                    alignItems: "center"
                }}
            >
                <TextInput
                    type="text"
                    value={override.url}
                    onChange={value => override.url = value}
                    placeholder="Leave blank to use the default..."
                    className={Margins.bottom16 + " sound-override-input"}
                    disabled={!override.enabled}
                    maxLength={999_999}
                />

                <Button
                    className={Margins.bottom16}
                >
                    Upload
                    <FileInput
                        ref={fileInputRef}
                        onChange={e => {
                            e.stopPropagation();
                            e.preventDefault();

                            if (!e.currentTarget?.files?.length) return;
                            const { files } = e.currentTarget;
                            const file = files[0];

                            // Set override URL to a data URI
                            const reader = new FileReader();
                            reader.onload = () => override.url = reader.result as string;
                            reader.readAsDataURL(file);
                        }}
                    />
                </Button>
            </Flex>
            <Forms.FormTitle>Volume</Forms.FormTitle>
            <Slider
                markers={makeRange(0, 100, 10)}
                initialValue={override.volume}
                onValueChange={value => override.volume = value}
                className={Margins.bottom16}
                disabled={!override.enabled}
            />
        </Card>
    );
}
