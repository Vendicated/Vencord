/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { makeRange } from "@components/PluginSettings/components";
import { Margins } from "@utils/margins";
import { findByCodeLazy } from "@webpack";
import { Button, Card, Forms, Slider, Switch, TextInput, useRef } from "@webpack/common";

import { SoundOverride, SoundPlayer, SoundType } from "../types";

const playSound: (id: string) => SoundPlayer = findByCodeLazy(".playWithListener().then");

export function SoundOverrideComponent({ type, override }: { type: SoundType; override: SoundOverride; }) {
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
            <Forms.FormTitle>File</Forms.FormTitle>
            <TextInput
                type="text"
                value={override.url}
                onChange={value => override.url = value}
                placeholder="Use default"
                className={Margins.bottom16}
                disabled={!override.enabled}
            />
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
