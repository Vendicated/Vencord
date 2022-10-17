import { filters } from "../webpack";
import { mapMangledModuleLazy } from "../webpack/webpack";

export enum ModalSize {
    SMALL = "small",
    MEDIUM = "medium",
    LARGE = "large",
    DYNAMIC = "dynamic",
}

enum ModalTransitionState {
    ENTERING,
    ENTERED,
    EXITING,
    EXITED,
    HIDDEN,
}

export interface ModalProps {
    transitionState: ModalTransitionState;
    onClose(): Promise<void>;
}

export interface ModalOptions {
    modalKey?: string;
    onCloseRequest?: (() => void);
    onCloseCallback?: (() => void);
}

interface ModalRootProps {
    transitionState: ModalTransitionState;
    children: React.ReactNode;
    size?: ModalSize;
    role?: "alertdialog" | "dialog";
    className?: string;
    onAnimationEnd?(): string;
}

type RenderFunction = (props: ModalProps) => React.ReactNode;

export const Modals = mapMangledModuleLazy(".onAnimationEnd,", {
    ModalRoot: filters.byCode("headerIdIsManaged:"),
    ModalHeader: filters.byCode("children", "separator", "wrap", "NO_WRAP", "grow", "shrink", "id", "header"),
    ModalContent: filters.byCode("scrollerRef", "content", "className", "children"),
    ModalFooter: filters.byCode("HORIZONTAL_REVERSE", "START", "STRETCH", "NO_WRAP", "footerSeparator"),
    ModalCloseButton: filters.byCode("closeWithCircleBackground", "hideOnFullscreen"),
});

export const ModalRoot = (props: ModalRootProps) => <Modals.ModalRoot {...props} />;
export const ModalHeader = (props: any) => <Modals.ModalHeader {...props} />;
export const ModalContent = (props: any) => <Modals.ModalContent {...props} />;
export const ModalFooter = (props: any) => <Modals.ModalFooter {...props} />;
export const ModalCloseButton = (props: any) => <Modals.ModalCloseButton {...props} />;

const ModalAPI = mapMangledModuleLazy("onCloseRequest:null!=", {
    openModal: filters.byCode("onCloseRequest:null!="),
    closeModal: filters.byCode("onCloseCallback&&"),
    openModalLazy: m => m?.length === 1 && filters.byCode(".apply(this,arguments)")(m),
});

export function openModalLazy(render: () => Promise<RenderFunction>, options?: ModalOptions & { contextKey?: string; }): Promise<string> {
    return ModalAPI.openModalLazy(render, options);
}

export function openModal(render: RenderFunction, options?: ModalOptions, contextKey?: string): string {
    return ModalAPI.openModal(render, options, contextKey);
}

export function closeModal(modalKey: string, contextKey?: string): void {
    return ModalAPI.closeModal(modalKey, contextKey);
}
