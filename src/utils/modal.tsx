// TODO: fix

import Components from "discord-types/components";
import { waitFor } from "../webpack";

export let Modal: Components.Modal;
export let modals: any;

waitFor("openModalLazy", m => modals = m);
waitFor("ModalRoot", m => Modal = m);

let modalId = 1337;

/**
 * Open a modal
 * @param Component The component to render in the modal
 * @returns The key of this modal. This can be used to close the modal later with closeModal
 */
export function openModal(Component: React.ComponentType, modalProps: Record<string, any>) {
    let key = `Vencord${modalId++}`;
    modals.openModal(props => (
        <Modal.ModalRoot {...props} {...modalProps}>
            <Component />
        </Modal.ModalRoot>
    ), { modalKey: key });

    return key;
}

/**
 * Close a modal by key. The id you need for this is returned by openModal.
 * @param key The key of the modal to close
 */
export function closeModal(key: string) {
    modals.closeModal(key);
}
