import type { ComponentType } from "react";
import { ToastPosition } from "../enums";

export type ToastType = "message" | "success" | "failure" | "custom" | "clip" | "link" | "forward" | "bookmark" | "clock";

export type NewToastVariant = "default" | "success" | "critical";
export type NewToastPosition = "top" | "bottom";

export interface ToastOptions {
    position?: ToastPosition;
    duration?: number;
}

/* Can be created via createToast */
export interface ToastData {
    text: string;
    variant: NewToastVariant;
    position?: NewToastPosition;
    duration?: number;

    icon?: ComponentType;
    iconColor?: any;
}

export type showToast = (data: ToastData) => void;
export type popToast = (context?: string) => void;
export type createToast = (message: string, type?: ToastType, options?: ToastOptions) => ToastData;

export interface Toasts {
    show: showToast;
    pop: popToast;
}
