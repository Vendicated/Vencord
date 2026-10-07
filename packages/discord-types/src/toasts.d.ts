import type { ComponentType } from "react";
import { ToastPosition } from "../enums";

export type ToastType = "message" | "success" | "failure" | "custom" | "clip" | "link" | "forward" | "bookmark" | "clock";

export type NewToastVariant = "default" | "success" | "critical";
export type NewToastPosition = "top" | "bottom";

export interface ToastData {
    message: string;
    type?: ToastType;
    options?: {
        position?: ToastPosition;
        duration?: number;
    };
}

export interface NewToastData {
    text: string;
    variant: NewToastVariant;
    position?: NewToastPosition;
    duration?: number;

    icon?: ComponentType;
    iconColor?: any;
}

export type showToast = (data: NewToastData) => void;
export type popToast = (context?: string) => void;
export type createToast = (data: ToastData) => NewToastData;

export interface Toasts {
    show: showToast;
    pop: popToast;
}
