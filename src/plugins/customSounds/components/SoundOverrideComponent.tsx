/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { makeRange } from "@components/PluginSettings/components";
import { Margins } from "@utils/margins";
import { classes, identity } from "@utils/misc";
import { useForceUpdater } from "@utils/react";
import { findByPropsLazy, findLazy } from "@webpack";
import { Button, Card, Forms, Select, Slider, Switch, TextInput, useRef } from "@webpack/common";
import { ComponentType, Ref, SyntheticEvent } from "react";

import { SoundOverride, SoundPlayer, SoundType } from "../types";

type FileInput = ComponentType<{
    ref: Ref<HTMLInputElement>;
    onChange: (e: SyntheticEvent<HTMLInputElement>) => void;
    multiple?: boolean;
    filters?: { name?: string; extensions: string[]; }[];
}>;

const { playSound }: { playSound(id: string): SoundPlayer; } = findByPropsLazy("createSoundForPack", "createSound", "playSound");
const FileInput: FileInput = findLazy(m => m.prototype?.activateUploadDialogue && m.prototype.setRef);
const cl = classNameFactory("vc-custom-sounds-");

export function SoundOverrideComponent({ type, override, onChange }: { type: SoundType; override: SoundOverride; onChange: () => Promise<void>; }) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const sound = useRef<SoundPlayer | null>(null);
    const update = useForceUpdater();

    return (
        <Card className={cl("card")}>
            <Switch
                value={override.enabled}
                onChange={value => {
                    override.enabled = value;
                    onChange();
                    update();
                }}
                className={Margins.bottom16}
                hideBorder={true}
            >
                {type.name} <span className={cl("id")}>({type.id})</span>
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
            <Forms.FormTitle>Replacement Sound</Forms.FormTitle>
            <Select
                options={[
                    { label: "URL", value: false },
                    { label: "File", value: true }
                ]}
                select={value => {
                    override.useFile = value;
                    override.url = "";
                    onChange();
                    update();
                }}
                className={Margins.bottom16 + " sound-override-input"}
                isSelected={value => override.useFile === value}
                isDisabled={!override.enabled}
                serialize={identity}
            />
            {
                !override.useFile ? <>
                    <TextInput
                        type="text"
                        value={override.url}
                        onChange={value => {
                            override.url = value;
                            onChange();
                            update();
                        }}
                        placeholder="Leave blank to use the default..."
                        className={Margins.bottom16}
                        disabled={!override.enabled}
                        maxLength={999_999}
                    />
                </> : <>
                    <Button
                        color={Button.Colors.PRIMARY}
                        disabled={!override.enabled}
                        className={classes(Margins.right8, Margins.bottom16, cl("upload"))}
                    >
                        Upload
                        <FileInput
                            ref={fileInputRef}
                            onChange={event => {
                                event.stopPropagation();
                                event.preventDefault();

                                if (!event.currentTarget?.files?.length)
                                    return;

                                const { files } = event.currentTarget;
                                const file = files[0];

                                // Set override URL to a data URI
                                const reader = new FileReader;
                                reader.onload = () => {
                                    override.url = reader.result as string;
                                    onChange();
                                    update();
                                };
                                reader.readAsDataURL(file);
                            }}
                            // Sorry .caf lovers, https://en.wikipedia.org/wiki/HTML5_audio#Supported_audio_coding_formats
                            filters={[{ extensions: ["mp3", "wav", "ogg", "webm", "flac"] }]}
                        />
                    </Button>
                    <Button
                        color={Button.Colors.RED}
                        onClick={() => {
                            override.url = "";
                            onChange();
                            update();
                        }}
                        disabled={!(override.enabled && override.url.length !== 0)}
                        style={{ display: "inline" }}
                        className={classes(Margins.right8, Margins.bottom16)}
                    >
                        Clear
                    </Button>
                </>
            }
            <Forms.FormTitle>Volume</Forms.FormTitle>
            <Slider
                markers={makeRange(0, 100, 10)}
                initialValue={override.volume}
                onValueChange={value => {
                    override.volume = value;
                    onChange();
                    update();
                }}
                className={Margins.bottom16}
                disabled={!override.enabled}
            />
        </Card>
    );
}
