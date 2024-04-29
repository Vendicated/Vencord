

import { ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, openModalLazy } from "@utils/modal";
import { Button, Forms, Text, TextInput, Toasts, useEffect, useState } from "@webpack/common";
import { classNameFactory } from "@api/Styles";
import { addUser, removeUser } from "./data";
import { extractAndLoadChunksLazy } from "@webpack";



interface Props {
    username: string;
    userID: string;
    modalProps: ModalProps;
}

const cl = classNameFactory("edit-user-modal-");
export const requireSettingsMenu = extractAndLoadChunksLazy(['name:"UserSettings"'], /createPromise:.{0,20}Promise\.all\((\[\i\.\i\(".+?"\).+?\])\).then\(\i\.bind\(\i,"(.+?)"\)\).{0,50}"UserSettings"/);



function NewUserModal({ username, userID, modalProps }: Props) {
    let pfplink = "";

    const onSave = async (e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        e.preventDefault();
        if (pfplink === "") {
            await removeUser(userID);
        } else {
            const newuser = {
                id: userID,
                profilepic: pfplink
            };
            await addUser(newuser);
        }
        modalProps.onClose();
    };



    return (
        <ModalRoot {...modalProps}>
            <ModalHeader>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}> {"Change" + username} </Text>
            </ModalHeader>

            {
                <form onSubmit={onSave}>
                    <ModalContent className={cl("content")}>
                        <Forms.FormSection>
                            <Forms.FormTitle>PFP link</Forms.FormTitle>
                            <TextInput
                                placeholder={"put the link for the pfp here"}
                                onChange={e => pfplink = e}
                            />
                        </Forms.FormSection>
                    </ModalContent>
                    <ModalFooter>
                        <Button type="submit" onClick={onSave}>{"Submit"}</Button>
                    </ModalFooter>
                </form>
            }
        </ModalRoot>
    );
}

export const openModal = (username: string, userID: string) =>
    openModalLazy(async () => {
        await requireSettingsMenu();
        return modalProps => <NewUserModal username={username} userID={userID} modalProps={modalProps} />;
    });
