declare module "@components/ErrorBoundary" {
    const ErrorBoundary: import("react").ComponentType<any> & {
        wrap?<T extends object = any>(Component: import("react").ComponentType<T>, errorBoundaryProps?: any): import("react").FunctionComponent<T>;
    };
    export default ErrorBoundary;
}

declare module "@components/index" {
    export { default as ErrorBoundary } from "@components/ErrorBoundary";
}
