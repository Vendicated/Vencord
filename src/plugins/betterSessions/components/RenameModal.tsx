import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, closeModal } from "@utils/modal";
import { Button, Forms, TextInput } from "@webpack/common";
import { savedNamesCache, getDefaultName, saveNamesToDataStore } from "../utils";
import { SessionInfo } from "../types";

export function RenameModal({ props, session, state, close }: { props: ModalProps, session: SessionInfo["session"], state: [string, React.Dispatch<React.SetStateAction<string>>], close(): void; }) {
    const [name, setName] = state;

    return (
        <ModalRoot {...props}>
            <ModalHeader>
                <Forms.FormTitle tag="h4">Rename</Forms.FormTitle>
                <ModalCloseButton onClick={close} />
            </ModalHeader>

            <ModalContent>
                <Forms.FormTitle tag="h5" style={{ marginTop: "10px" }}>New device name</Forms.FormTitle>
                <TextInput
                    style={{ marginBottom: "10px" }}
                    defaultValue={savedNamesCache.get(session.id_hash) ?? ""}
                    onChange={(e: string) => {
                        savedNamesCache.set(session.id_hash, e);
                    }}
                ></TextInput>
            </ModalContent>

            <ModalFooter>
                <Button
                    color={Button.Colors.BRAND}
                    onClick={() => {
                        const savedName = savedNamesCache.get(session.id_hash);
                        if (savedName) {
                            setName(`${savedName}*`);
                        } else {
                            savedNamesCache.delete(session.id_hash);
                            setName(getDefaultName(session.client_info));
                        }
                        saveNamesToDataStore();

                        props.onClose();
                    }}
                >Save</Button>
                <Button
                    color={Button.Colors.TRANSPARENT}
                    look={Button.Looks.LINK}
                    onClick={() => {
                        savedNamesCache.delete(session.id_hash);
                        setName(getDefaultName(session.client_info));
                        saveNamesToDataStore();

                        props.onClose();
                    }}
                >
                    Reset
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
}
