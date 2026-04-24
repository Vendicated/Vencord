/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { SimpleErrorBoundary } from "@equicordplugins/components.dev";

import { Button, ErrorBoundary, LocalErrorBoundary, Paragraph, useState } from "..";
import { DocPage, type PropDef, type PropGroup } from "../DocPage";

function ThrowError(): never {
    throw new Error("This is a demo error thrown intentionally!");
}

function ErrorTrigger({ label }: { label: string; }) {
    const [shouldThrow, setShouldThrow] = useState(false);

    if (shouldThrow) {
        return <ThrowError />;
    }

    return (
        <Button variant="dangerPrimary" onClick={() => setShouldThrow(true)}>
            {label}
        </Button>
    );
}

function CustomFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void; }) {
    return (
        <div style={{ padding: 16, background: "var(--background-secondary)", borderRadius: 8 }}>
            <Paragraph color="text-danger" style={{ marginBottom: 8 }}>
                <strong>Custom Fallback UI</strong>
            </Paragraph>
            <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                Error: {error.message}
            </Paragraph>
            <Button onClick={resetErrorBoundary}>Reset</Button>
        </div>
    );
}

const ERROR_BOUNDARY_PROPS: PropDef[] = [
    { name: "children", type: "ReactNode", required: true, description: "Content to wrap with error handling." },
    { name: "fallback", type: "ReactNode", description: "Static fallback content to show on error." },
    { name: "fallbackRender", type: "(props: { error, resetErrorBoundary }) => ReactNode", description: "Render function for dynamic fallback with error details and reset capability." },
    { name: "FallbackComponent", type: "ComponentType<{ error, resetErrorBoundary }>", description: "Component that receives error and reset props as fallback." },
    { name: "onError", type: "(error: Error, info: ErrorInfo) => void", description: "Callback fired when an error is caught." },
    { name: "onReset", type: "(details) => void", description: "Callback fired when the boundary is reset." },
    { name: "resetKeys", type: "any[]", description: "Array of values that trigger an automatic reset when changed." },
];

const SIMPLE_PROPS: PropDef[] = [
    { name: "children", type: "ReactNode", required: true, description: "Content to wrap with error handling." },
    { name: "fallback", type: "ReactNode", required: true, description: "Static content to display when an error occurs." },
];

const LOCAL_PROPS: PropDef[] = [
    { name: "children", type: "ReactNode", required: true, description: "Content to wrap. Shows inline error text on failure." },
];

const PROP_GROUPS: PropGroup[] = [
    { title: "ErrorBoundary", props: ERROR_BOUNDARY_PROPS },
    { title: "SimpleErrorBoundary", props: SIMPLE_PROPS },
    { title: "LocalErrorBoundary", props: LOCAL_PROPS },
];

function ErrorBoundaryDemo() {
    const [key, setKey] = useState(0);

    return (
        <div key={key}>
            <ErrorBoundary
                fallbackRender={({ error, resetErrorBoundary }) => (
                    <CustomFallback error={error} resetErrorBoundary={resetErrorBoundary} />
                )}
                onReset={() => setKey(k => k + 1)}
            >
                <ErrorTrigger label="Trigger Error" />
            </ErrorBoundary>
        </div>
    );
}

function SimpleDemo() {
    const [key, setKey] = useState(0);

    return (
        <div key={key}>
            <SimpleErrorBoundary
                fallback={
                    <div style={{ padding: 16, background: "var(--background-secondary)", borderRadius: 8 }}>
                        <Paragraph color="text-danger">Something went wrong!</Paragraph>
                        <Button onClick={() => setKey(k => k + 1)} style={{ marginTop: 8 }}>Reset</Button>
                    </div>
                }
            >
                <ErrorTrigger label="Trigger Error" />
            </SimpleErrorBoundary>
        </div>
    );
}

function LocalDemo() {
    const [key, setKey] = useState(0);

    return (
        <div key={key}>
            <LocalErrorBoundary>
                <ErrorTrigger label="Trigger Error" />
            </LocalErrorBoundary>
            <Button variant="secondary" onClick={() => setKey(k => k + 1)} style={{ marginTop: 8 }}>
                Reset
            </Button>
        </div>
    );
}

export default function ErrorBoundaryTab() {
    return (
        <DocPage
            componentName="ErrorBoundary"
            overview="Discord provides three error boundary components with different levels of control. ErrorBoundary is feature-rich with fallbackRender, FallbackComponent, onError/onReset callbacks, and resetKeys. SimpleErrorBoundary accepts a static fallback ReactNode. LocalErrorBoundary shows inline error text for non-critical failures."
            notices={[
                { type: "positive", children: "Wrap plugin UI components with ErrorBoundary to prevent crashes from taking down the entire Discord UI. Use LocalErrorBoundary for non-critical elements." },
                { type: "info", children: "ErrorBoundary only catches errors during rendering, lifecycle methods, and constructors. It does not catch errors in event handlers or async code." },
            ]}
            importPath={'import { ErrorBoundary, SimpleErrorBoundary, LocalErrorBoundary } from "../components";'}
            sections={[
                {
                    title: "ErrorBoundary",
                    description: "Full-featured boundary with fallbackRender for dynamic error UI with reset capability.",
                    children: <ErrorBoundaryDemo />,
                    code: `<ErrorBoundary
  fallbackRender={({ error, resetErrorBoundary }) => (
    <div>
      <p>Error: {error.message}</p>
      <button onClick={resetErrorBoundary}>Reset</button>
    </div>
  )}
  onError={(error, info) => console.error(error)}
  onReset={() => refetch()}
>
  <MyComponent />
</ErrorBoundary>`,
                    relevantProps: ["fallbackRender", "onError", "onReset", "resetKeys"],
                },
                {
                    title: "SimpleErrorBoundary",
                    description: "Lightweight boundary that shows static fallback content on error.",
                    children: <SimpleDemo />,
                    code: `<SimpleErrorBoundary fallback={<p>Something went wrong!</p>}>
  <MyComponent />
</SimpleErrorBoundary>`,
                },
                {
                    title: "LocalErrorBoundary",
                    description: "Displays an inline error message for non-critical component failures. No fallback prop needed.",
                    children: <LocalDemo />,
                    code: `<LocalErrorBoundary>
  <MyWidget />
</LocalErrorBoundary>`,
                },
            ]}
            props={PROP_GROUPS}
        />
    );
}
