/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Flex } from "@components/Flex";
import { LazyComponent } from "@utils/react";
import { find, findByPropsLazy } from "@webpack";
import { Button, useRef } from "@webpack/common";
import React from "react";

import { classFactory } from "..";

const Editor = findByPropsLazy("start", "end", "addMark");
const Transform = findByPropsLazy("unwrapNodes");
const InputTypes = findByPropsLazy("VOICE_CHANNEL_STATUS", "SIDEBAR");
const InputComponent = LazyComponent(() => find(m => m?.type?.render?.toString().includes("CHANNEL_TEXT_AREA).AnalyticsLocationProvider")));

interface EmojiTextInputProps {
    value: string;
    onChange(v: string): void;
    onSubmit(v: string): void;
}

export const clearEmojiTextInput = (ref: React.MutableRefObject<any>) => {
    const slateEditor = ref.current.ref.current.getSlateEditor();
    Transform.delete(slateEditor, {
        at: {
            anchor: Editor.start(slateEditor, []),
            focus: Editor.end(slateEditor, []),
        }
    });
};

// ripped from reviewdb
export function EmojiTextInput(props: EmojiTextInputProps) {
    const editorRef = useRef<any>(null);
    return (
        <Flex flexDirection="row" style={{ alignItems: "center" }}>
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
                setEditorRef={ref => editorRef.current = ref}
                placeholder="Pattern"
                onSubmit={async res => {
                    props.onSubmit(res.value);
                    clearEmojiTextInput(editorRef);
                    return {
                        shouldClear: false,
                        shouldRefocus: true,
                    };
                }}
                onChange={(_: any, u: string) => {
                    props.onChange(u);
                }}
            />
            <Button onClick={() => {
                props.onSubmit(props.value);
                clearEmojiTextInput(editorRef);
            }}>
                Add
            </Button>
        </Flex>
    );
}
