import { filters } from "../webpack";
import { lazyWebpack } from "./misc";
import { mapMangledModuleLazy } from "../webpack/webpack";
import { proxyLazy } from "./proxyLazy";

// const ModalRoot = lazyWebpack(filters.byCode("headerIdIsManaged:"));
// const Modals = mapMangledModuleLazy("onCloseRequest:null!=", {
//     openModal: filters.byCode("onCloseRequest:null!="),
//     closeModal: filters.byCode("onCloseCallback&&")
// });

// let modalId = 1337;

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

// export const ModalRoot: (props: ModalRootProps) => JSX.Element = lazyWebpack(filters.byCode("headerIdIsManaged:"));
// export const ModalHeader = lazyWebpack(filters.byCode("children", "separator", "wrap", "NO_WRAP", "grow", "shrink", "id"));
// export const ModalContent = lazyWebpack(filters.byCode("scrollerRef", "content", "className", "children"));
// export const ModalFooter = lazyWebpack(filters.byCode("HORIZONTAL_REVERSE", "START", "STRETCH", "footerSeparator"));
// export const ModalCloseButton = lazyWebpack(filters.byCode("closeWithCircleBackground", "hideOnFullscreen"));

type RenderFunction = (props: ModalProps) => React.ReactNode;
type OpenModalLazy = (render: () => Promise<RenderFunction>, options?: ModalOptions & { contextKey?: string; }) => Promise<string>;
type OpenModal = (render: RenderFunction, options?: ModalOptions, contextKey?: string) => string;
type CloseModal = (modalKey: string, contextKey?: string) => void;

interface Modals {
    openModalLazy: OpenModalLazy;
    openModal: OpenModal;
    closeModal: CloseModal;
}

export const Modals = mapMangledModuleLazy(".onAnimationEnd,", {
    ModalRoot: filters.byCode("headerIdIsManaged:"),
    ModalHeader: filters.byCode("children", "separator", "wrap", "NO_WRAP", "grow", "shrink", "id"),
    ModalContent: filters.byCode("scrollerRef", "content", "className", "children"),
    ModalFooter: filters.byCode("HORIZONTAL_REVERSE", "START", "STRETCH", "footerSeparator"),
    ModalCloseButton: filters.byCode("closeWithCircleBackground", "hideOnFullscreen"),
});

export const ModalRoot = proxyLazy(() => Modals.ModalRoot);
export const ModalHeader = proxyLazy(() => Modals.ModalHeader);
export const ModalContent = proxyLazy(() => Modals.ModalContent);
export const ModalFooter = proxyLazy(() => Modals.ModalFooter);
export const ModalCloseButton = proxyLazy(() => Modals.ModalCloseButton);

const ModalAPI: Modals = mapMangledModuleLazy("onCloseRequest:null!=", {
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
