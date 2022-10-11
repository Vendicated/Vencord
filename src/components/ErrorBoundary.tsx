import Logger from "../utils/logger";
import { Margins, React } from "../webpack/common";
import { ErrorCard } from "./ErrorCard";

interface Props {
    fallback?: React.ComponentType<React.PropsWithChildren<{ error: any; message: string; stack: string; }>>;
    onError?(error: Error, errorInfo: React.ErrorInfo): void;
}

const color = "#e78284";

const logger = new Logger("React ErrorBoundary", color);

const NO_ERROR = {};

export default class ErrorBoundary extends React.Component<React.PropsWithChildren<Props>> {
    static wrap<T = any>(Component: React.ComponentType<T>): (props: T) => React.ReactElement {
        return props => (
            <ErrorBoundary>
                <Component {...props as any/* I hate react typings ??? */} />
            </ErrorBoundary>
        );
    }

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
        this.props.onError?.(error, errorInfo);
        logger.error("A component threw an Error\n", error);
        logger.error("Component Stack", errorInfo.componentStack);
    }

    render() {
        if (this.state.error === NO_ERROR) return this.props.children;

        if (this.props.fallback)
            return <this.props.fallback
                children={this.props.children}
                {...this.state}
            />;

        return (
            <ErrorCard style={{
                overflow: "hidden",
            }}>
                <h1>Oh no!</h1>
                <p>
                    An error occurred while rendering this Component. More info can be found below
                    and in your console.
                </p>
                <code>
                    {this.state.message}
                    {!!this.state.stack && (
                        <pre className={Margins.marginTop8}>
                            {this.state.stack}
                        </pre>
                    )}
                </code>
            </ErrorCard>
        );
    }
}
