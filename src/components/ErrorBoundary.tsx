/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { Margins } from "@utils/margins";
import { LazyComponent } from "@utils/react";
import { React } from "@webpack/common";

import { ErrorCard } from "./ErrorCard";

interface Props<T = any> {
    /** Render nothing if an error occurs */
    noop?: boolean;
    /** Fallback component to render if an error occurs */
    fallback?: React.ComponentType<React.PropsWithChildren<{ error: any; message: string; stack: string; }>>;
    /** called when an error occurs. The props property is only available if using .wrap */
    onError?(data: { error: Error, errorInfo: React.ErrorInfo, props: T; }): void;
    /** Custom error message */
    message?: string;

    /** The props passed to the wrapped component. Only used by wrap */
    wrappedProps?: T;
}

const color = "#e78284";

const logger = new Logger("React ErrorBoundary", color);

const NO_ERROR = {};

// We might want to import this in a place where React isn't ready yet.
// Thus, wrap in a LazyComponent
const ErrorBoundary = LazyComponent(() => {
    return class ErrorBoundary extends React.PureComponent<React.PropsWithChildren<Props>> {
        state = {
            error: NO_ERROR as any,
            stack: "",
            message: ""
        };

        static getDerivedStateFromError(error: any) {
            let stack = error?.stack ?? "";
            let message = error?.message || String(error);

            if (error instanceof Error && stack) {
                const eolIdx = stack.indexOf("\n");
                if (eolIdx !== -1) {
                    message = stack.slice(0, eolIdx);
                    stack = stack.slice(eolIdx + 1).replace(/https:\/\/\S+\/assets\//g, "");
                }
            }

            return { error, stack, message };
        }

        componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
            this.props.onError?.({ error, errorInfo, props: this.props.wrappedProps });
            logger.error("A component threw an Error\n", error);
            logger.error("Component Stack", errorInfo.componentStack);
        }

        render() {
            if (this.state.error === NO_ERROR) return this.props.children;

            if (this.props.noop) return null;

            if (this.props.fallback)
                return <this.props.fallback
                    children={this.props.children}
                    {...this.state}
                />;

            const msg = this.props.message || "An error occurred while rendering this Component. More info can be found below and in your console.";

            return (
                <ErrorCard style={{ overflow: "hidden" }}>
                    <h1>Oh no!</h1>
                    <p>{msg}</p>
                    <code>
                        {this.state.message}
                        {!!this.state.stack && (
                            <pre className={Margins.top8}>
                                {this.state.stack}
                            </pre>
                        )}
                    </code>
                </ErrorCard>
            );
        }
    };
}) as
    React.ComponentType<React.PropsWithChildren<Props>> & {
        wrap<T extends object = any>(Component: React.ComponentType<T>, errorBoundaryProps?: Omit<Props<T>, "wrappedProps">): React.FunctionComponent<T>;
    };

ErrorBoundary.wrap = (Component, errorBoundaryProps) => props => (
    <ErrorBoundary {...errorBoundaryProps} wrappedProps={props}>
        <Component {...props} />
    </ErrorBoundary>
);

export default ErrorBoundary;
