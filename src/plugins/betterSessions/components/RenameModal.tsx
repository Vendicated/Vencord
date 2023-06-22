import { ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot } from "@utils/modal";
import { Button, Forms, React, TextInput } from "@webpack/common";
import { savedNamesCache, getDefaultName, saveNamesToDataStore } from "../utils";
import { SessionInfo } from "../types";
import { KeyboardEvent } from "react";

export function RenameModal({ props, session, state }: { props: ModalProps, session: SessionInfo["session"], state: [string, React.Dispatch<React.SetStateAction<string>>]; }) {
    const [name, setName] = state;
    const ref = React.useRef<HTMLInputElement>(null);

    let newName = savedNamesCache.get(session.id_hash) ?? "";

    function onSaveClick() {
        savedNamesCache.set(session.id_hash, newName);
        if (newName !== "") {
            setName(`${newName}*`);
        } else {
            setName(getDefaultName(session.client_info));
        }

        saveNamesToDataStore();
        props.onClose();
    }

    return (
        <ModalRoot {...props}>
            <ModalHeader>
                <Forms.FormTitle tag="h4">Rename</Forms.FormTitle>
            </ModalHeader>

            <ModalContent>
                <Forms.FormTitle tag="h5" style={{ marginTop: "10px" }}>New device name</Forms.FormTitle>
                <TextInput
                    inputRef={ref}
                    style={{ marginBottom: "10px" }}
                    placeholder={getDefaultName(session.client_info)}
                    defaultValue={newName}
                    onChange={(e: string) => {
                        newName = e;
                    }}
                    onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === "Enter") {
                            onSaveClick();
                        }
                    }}
                />
                <Button
                    style={{
                        marginBottom: "20px",
                        paddingLeft: "1px",
                        paddingRight: "1px",
                        opacity: 0.6
                    }}
                    look={Button.Looks.LINK}
                    color={Button.Colors.LINK}
                    size={Button.Sizes.NONE}
                    onClick={() => {
                        ref.current!.value = newName = "";
                    }}
                >
                    Reset Name
                </Button>
            </ModalContent>

            <ModalFooter>
                <Button
                    color={Button.Colors.BRAND}
                    onClick={onSaveClick}
                >
                    Save
                </Button>
                <Button
                    color={Button.Colors.TRANSPARENT}
                    look={Button.Looks.LINK}
                    onClick={() => {
                        props.onClose();
                    }}
                >
                    Cancel
                </Button>
            </ModalFooter>
        </ModalRoot >
    );
}
