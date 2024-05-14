/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Flex } from "@components/Flex";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { Button, useRef } from "@webpack/common";
import React from "react";

import { classFactory } from "..";

const { Editor, Transforms } = findByPropsLazy("Editor", "Transforms");
const { ChatInputTypes } = findByPropsLazy("ChatInputTypes");
const InputComponent = findComponentByCodeLazy("default.CHANNEL_TEXT_AREA", "input");
const { createChannelRecordFromServer } = findByPropsLazy("createChannelRecordFromServer");

interface EmojiTextInputProps {
    value: string;
    onChange(v: string): void;
    onSubmit(v: string): void;
}

export const clearEmojiTextInput = (ref: React.MutableRefObject<any>) => {
    const slateEditor = ref.current.ref.current.getSlateEditor();
    Transforms.delete(slateEditor, {
        at: {
            anchor: Editor.start(slateEditor, []),
            focus: Editor.end(slateEditor, []),
        }
    });
};

// ripped from reviewdb
export function EmojiTextInput(props: EmojiTextInputProps) {
    const editorRef = useRef<any>(null);
    const channel = createChannelRecordFromServer({ id: "0", type: 1 });
    const inputType = ChatInputTypes.FORM;
    inputType.disableAutoFocus = true;
    return (
        <Flex flexDirection="row" style={{ alignItems: "center", gap: "10px" }}>
            <InputComponent
                className={classFactory("emoji-picker")}
                channel={channel}
                type={inputType}
                disableThemedBackground={true}
                textValue={props.value}
                setEditorRef={ref => editorRef.current = ref}
                placeholder="Add pattern"
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
