/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { useForceUpdater } from "@utils/react";
import { findByCodeLazy, findLazy } from "@webpack";
import { Button, Card, Forms, Slider, Switch, Tooltip, useRef } from "@webpack/common";
import { ComponentType, Ref, SyntheticEvent } from "react";

import { SoundOverride, SoundPlayer, SoundType } from "../types";

type FileInput = ComponentType<{
    ref: Ref<HTMLInputElement>;
    onChange: (event: SyntheticEvent<HTMLInputElement>) => void;
    multiple?: boolean;
    filters?: { name?: string; extensions: string[]; }[];
    disabled?: boolean;
}>;

const playSound: (id: string) => SoundPlayer = findByCodeLazy(".playWithListener().then");
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
                <Tooltip text={type.id}>
                    {tooltipProps => <span {...tooltipProps}>{type.name}</span>}
                </Tooltip>
            </Switch>
            <Forms.FormTitle>Sound File</Forms.FormTitle>
            <div className={classes(cl("file"), Margins.bottom16)} >
                <Forms.FormText className={cl("file-name")}>{override.url.length === 0 ? "Discord Default" : (override.fileName || "Custom Sound")}</Forms.FormText>
                <Button
                    color={Button.Colors.PRIMARY}
                    size={Button.Sizes.SMALL}
                    disabled={!override.enabled}
                    className={cl("file-replace")}
                >
                    Replace
                    <FileInput
                        ref={fileInputRef}
                        disabled={!override.enabled}
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
                                override.fileName = file.name;
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
                    size={Button.Sizes.SMALL}
                    onClick={() => {
                        override.url = "";
                        onChange();
                        update();
                    }}
                    disabled={!(override.enabled && override.url.length !== 0)}
                    className={cl("file-reset")}
                >
                    Reset
                </Button>
            </div>
            <Forms.FormTitle>Volume</Forms.FormTitle>
            <Slider
                initialValue={override.volume}
                onValueChange={value => {
                    override.volume = value;
                    onChange();
                    update();
                }}
                className={Margins.bottom16}
                disabled={!override.enabled}
            />
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
        </Card>
    );
}
