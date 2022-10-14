import { filters } from "../webpack";
import { lazyWebpack } from "./misc";
import { mapMangledModuleLazy } from "../webpack/webpack";

const ModalRoot = lazyWebpack(filters.byCode("headerIdIsManaged:"));
const Modals = mapMangledModuleLazy("onCloseRequest:null!=", {
    openModal: filters.byCode("onCloseRequest:null!="),
    closeModal: filters.byCode("onCloseCallback&&")
});

let modalId = 1337;

/**
 * Open a modal
 * @param Component The component to render in the modal
 * @returns The key of this modal. This can be used to close the modal later with closeModal
 */
export function openModal(Component: React.ComponentType, modalProps: Record<string, any>) {
    let key = `Vencord${modalId++}`;
    Modals.openModal(props => (
        <ModalRoot {...props} {...modalProps}>
            <Component />
        </ModalRoot>
    ), { modalKey: key });

    return key;
}

/**
 * Close a modal by key. The id you need for this is returned by openModal.
 * @param key The key of the modal to close
 */
export function closeModal(key: string) {
    Modals.closeModal(key);
}
