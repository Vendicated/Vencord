/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { filters, mapMangledModuleLazy } from "@webpack";
import type { ComponentType, PropsWithChildren, ReactNode, Ref } from "react";

import { LazyComponent } from "./misc";

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

type RenderFunction = (props: ModalProps) => ReactNode;

export const Modals = mapMangledModuleLazy(".closeWithCircleBackground", {
    ModalRoot: filters.byCode(".root"),
    ModalHeader: filters.byCode(".header"),
    ModalContent: filters.byCode(".content"),
    ModalFooter: filters.byCode(".footerSeparator"),
    ModalCloseButton: filters.byCode(".closeWithCircleBackground"),
}) as {
    ModalRoot: ComponentType<PropsWithChildren<{
        transitionState: ModalTransitionState;
        size?: ModalSize;
        role?: "alertdialog" | "dialog";
        className?: string;
        fullscreenOnMobile?: boolean;
        "aria-label"?: string;
        "aria-labelledby"?: string;
        onAnimationEnd?(): string;
    }>>;
    ModalHeader: ComponentType<PropsWithChildren<{
        /** Flex.Justify.START */
        justify?: string;
        /** Flex.Direction.HORIZONTAL */
        direction?: string;
        /** Flex.Align.CENTER */
        align?: string;
        /** Flex.Wrap.NO_WRAP */
        wrap?: string;
        separator?: boolean;

        className?: string;
    }>>;
    /** This also accepts Scroller props but good luck with that */
    ModalContent: ComponentType<PropsWithChildren<{
        className?: string;
        scrollerRef?: Ref<HTMLElement>;
        [prop: string]: any;
    }>>;
    ModalFooter: ComponentType<PropsWithChildren<{
        /** Flex.Justify.START */
        justify?: string;
        /** Flex.Direction.HORIZONTAL_REVERSE */
        direction?: string;
        /** Flex.Align.STRETCH */
        align?: string;
        /** Flex.Wrap.NO_WRAP */
        wrap?: string;
        separator?: boolean;

        className?: string;
    }>>;
    ModalCloseButton: ComponentType<{
        focusProps?: any;
        onClick(): void;
        withCircleBackground?: boolean;
        hideOnFullscreen?: boolean;
        className?: string;
    }>;
};

export const ModalRoot = LazyComponent(() => Modals.ModalRoot);
export const ModalHeader = LazyComponent(() => Modals.ModalHeader);
export const ModalContent = LazyComponent(() => Modals.ModalContent);
export const ModalFooter = LazyComponent(() => Modals.ModalFooter);
export const ModalCloseButton = LazyComponent(() => Modals.ModalCloseButton);

const ModalAPI = mapMangledModuleLazy("onCloseRequest:null!=", {
    openModal: filters.byCode("onCloseRequest:null!="),
    closeModal: filters.byCode("onCloseCallback&&"),
    openModalLazy: m => m?.length === 1 && filters.byCode(".apply(this,arguments)")(m),
    closeAllModals: filters.byCode(".value.key,")
});

/**
 * Wait for the render promise to resolve, then open a modal with it.
 * This is equivalent to render().then(openModal)
 * You should use the Modal components exported by this file
 */
export function openModalLazy(render: () => Promise<RenderFunction>, options?: ModalOptions & { contextKey?: string; }): Promise<string> {
    return ModalAPI.openModalLazy(render, options);
}

/**
 * Open a Modal with the given render function.
 * You should use the Modal components exported by this file
 */
export function openModal(render: RenderFunction, options?: ModalOptions, contextKey?: string): string {
    return ModalAPI.openModal(render, options, contextKey);
}

/**
 * Close a modal by its key
 */
export function closeModal(modalKey: string, contextKey?: string): void {
    return ModalAPI.closeModal(modalKey, contextKey);
}

/**
 * Close all open modals
 */
export function closeAllModals(): void {
    return ModalAPI.closeAllModals();
}
