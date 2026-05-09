import { ComponentType, ReactNode, Ref, RefObject } from "react";
import { LiteralUnion } from "type-fest";

export type ModalActionVariant = LiteralUnion<"primary" | "secondary" | "critical-primary", string>;
export type ModalSize = LiteralUnion<"sm" | "md" | "lg" | "xl" | "xxl", string>;

export interface ModalAction {
    text: string;
    variant: ModalActionVariant;
    onClick(): void;
    loading?: boolean;
    disabled?: boolean;
}

/**
 * Modal with all options: https://files.catbox.moe/c8qxt0.png
 */
export interface ModalProps extends OpenModalProps {
    size?: ModalSize;
    role?: "alertdialog" | "dialog";

    title: ReactNode;
    /** Optional subtitle, will render below title (duh) */
    subtitle?: ReactNode;

    /** Optional Modal content */
    children?: ReactNode;
    input?: ReactNode;
    preview?: ReactNode;

    listProps?: any;
    onScroll?(): void;
    scrollerRef?: Ref<HTMLDivElement>;

    /** Action buttons at the bottom of the Modal */
    actions?: ModalAction[];
    /** Custom component to show before actions, useful for e.g. "Don't show again" checkbox */
    actionBarInput?: ReactNode;
    actionBarInputLayout?: "default" | "chat-input";

    /** Shows a Notice (card) between (sub-)title and content (children) */
    notice?: {
        message: string;
        type: LiteralUnion<"critical", string>;
    };
}

export interface OpenModalProps {
    transitionState: number;
    onClose(): void;
}

/** Wrapper around Modal */
export interface ConfirmModalProps extends ModalProps {
    /** Variant for the confirm button, defaults to critical */
    variant?: ModalActionVariant;
    confirmText: ModalAction["text"];
    /** Defaults to "Cancel" */
    cancelText?: ModalAction["text"];
    /**
     * If onConfirm runs without error, the modal will close.
     * To indicate an error, throw an Error. This will show the user a notice inside the Modal and keep it open.
     * This notice will either be a generic message if you just throw. If you call setError, it will show that message.
     * Even if you call setError, you still have to throw to keep the Modal open
     */
    onConfirm?(setError: (error: string) => void): void;
    /** Optional callback that runs when the user cancels the action. Whether provided or not, the Modal will close when user clicks Cancel. */
    onCancel?(): void;
    onCloseCallback?(): void;
    /** Checkbox that shows before the action buttons */
    checkboxProps?: {
        /** Defaults to "Don't show again" */
        label?: string;
        checked: boolean;
        onChange(checked: boolean): void;
    };

    /** Custom Modal content */
    children?: ReactNode;
}


export type Modal = ComponentType<ModalProps>;
export type ConfirmModal = ComponentType<ConfirmModalProps>;
export type openModal = (render: (props: OpenModalProps) => ReactNode) => string;
