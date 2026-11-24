import type { ComponentType } from "react";

export type ToastVariant = "default" | "success" | "critical";
export type ToastPosition = "top" | "bottom";

export interface ToastData {
    text: string;
    variant?: ToastVariant;
    position?: ToastPosition;
    duration?: number;

    icon?: ComponentType;
    iconColor?: any;
}

export type showToast = (data: ToastData) => void;
