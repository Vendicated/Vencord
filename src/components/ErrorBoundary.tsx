import Logger from "../utils/logger";
import { Card, React } from "../webpack/common";

interface Props {
    fallback?: React.ComponentType<React.PropsWithChildren<{ error: any; }>>;
    onError?(error: Error, errorInfo: React.ErrorInfo): void;
}

const color = "#e78284";

const logger = new Logger("React ErrorBoundary", color);

const NO_ERROR = {};

export default class ErrorBoundary extends React.Component<React.PropsWithChildren<Props>> {
    static wrap<T = any>(Component: React.ComponentType<T>): (props: T) => React.ReactElement {
        return (props) => (
            <ErrorBoundary>
                <Component {...props as any/* I hate react typings ??? */} />
            </ErrorBoundary>
        );
    }

    state = {
        error: NO_ERROR as any,
        message: ""
    };

    static getDerivedStateFromError(error: any) {

        return {
            error: error?.stack?.replace(/https:\/\/\S+\/assets\//g, "") || error?.message || String(error)
        };
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
                error={this.state.error}
            />;

        return (
            <Card style={{
                overflow: "hidden",
                padding: "2em",
                backgroundColor: color + "30",
                borderColor: color,
                color: "var(--text-normal)"
            }}>
                <h1>Oh no!</h1>
                <p>
                    An error occurred while rendering this Component. More info can be found below
                    and in your console.
                </p>
                <code>
                    <pre>{this.state.error}
                    </pre>
                </code>
            </Card>
        );
    }
}
