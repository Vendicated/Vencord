import { ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot } from "@utils/modal";
import { Button, Forms, Switch, TextInput, useState } from "@webpack/common";
import { EMPTY_SOUND, classFactory } from "..";
import { EmojiSelector } from "./EmojiSelector";

export type EmojiModalMode = "create" | "edit";

interface EmojiModalProps extends ModalProps {
    mode: EmojiModalMode;
    onSubmit(emoji: string, soundUrl: string, caseSensitive: boolean): void;
}

export function EmojiModal(props: EmojiModalProps) {
    const [emojiSound, setEmojiSound] = useState(EMPTY_SOUND);

    return (
        <ModalRoot {...props}>
            <ModalHeader>
                <Forms.FormTitle tag="h4">{props.mode} Emoji Sound</Forms.FormTitle>
            </ModalHeader>

            <ModalContent>
                <EmojiSelector onChange={(v: string) => {
                    console.log(v);
                }} />
                <TextInput
                    type="text"
                    value={emojiSound.sound}
                    placeholder="Sound"
                    onChange={(v) => setEmojiSound({ ...emojiSound, sound: v })}
                />
                <Switch
                    style={{ marginTop: "20px", marginBottom: "20px" }}
                    value={emojiSound.caseSensitive}
                    onChange={(v) => setEmojiSound({ ...emojiSound, caseSensitive: v })}
                    hideBorder
                >
                    Case Sensitive
                </Switch>

            </ModalContent>

            <ModalFooter className={classFactory("modal-footer")}>
                <Button
                    color={Button.Colors.GREEN}
                    onClick={() => {
                        props.onClose();
                    }}>
                    {props.mode === "create" ? "Create" : "Save"}
                </Button>
                <Button onClick={props.onClose}>
                    Cancel
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
}
