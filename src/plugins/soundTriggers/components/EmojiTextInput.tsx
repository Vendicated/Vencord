/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { LazyComponent } from "@utils/react";
import { find, findByPropsLazy } from "@webpack";

import { classFactory } from "..";

const InputTypes = findByPropsLazy("VOICE_CHANNEL_STATUS", "SIDEBAR");
const InputComponent = LazyComponent(() => find(m => m?.type?.render?.toString().includes("CHANNEL_TEXT_AREA).AnalyticsLocationProvider")));

interface EmojiTextInputProps {
    value: string;
    onChange(v: string): void;
    onSubmit(v: string): void;
}

export const formatEmojiTextInput = (text: string) => {
    return text.trim();
};

export function EmojiTextInput(props: EmojiTextInputProps) {
    return (
        <InputComponent
            className={classFactory("emoji-picker")}
            style={{ margin: "10px" }}
            type={InputTypes.FORM}
            channel={{
                flags_: 256,
                guild_id_: null,
                id: "0",
                getGuildId: () => null,
                isPrivate: () => true,
                isActiveThread: () => false,
                isArchivedLockedThread: () => false,
                isDM: () => true,
                roles: { "0": { permissions: 0n } },
                getRecipientId: () => "0",
                hasFlag: () => false,
            }}
            textValue={props.value}
            placeholder="Text"
            onSubmit={async res => {
                props.onSubmit(res.value);
                return {
                    shouldClear: false,
                    shouldRefocus: true,
                };
            }}
            onChange={(_: any, u: string) => {
                props.onChange(u);
            }}
        />
    );
}
