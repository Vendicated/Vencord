/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button, ErrorBoundary, LocalErrorBoundary, Paragraph, SimpleErrorBoundary, useState } from "..";
import { SectionWrapper } from "../SectionWrapper";

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
            <Button onClick={resetErrorBoundary}>
                Reset
            </Button>
        </div>
    );
}

export default function ErrorBoundaryTab() {
    const [key1, setKey1] = useState(0);
    const [key2, setKey2] = useState(0);
    const [key3, setKey3] = useState(0);

    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="ErrorBoundary">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Full-featured error boundary with fallbackRender, FallbackComponent, onError, onReset, and resetKeys props.
                </Paragraph>
                <div key={key1}>
                    <ErrorBoundary
                        fallbackRender={({ error, resetErrorBoundary }) => (
                            <CustomFallback error={error} resetErrorBoundary={resetErrorBoundary} />
                        )}
                        onError={(error, info) => console.log("ErrorBoundary caught:", error, info)}
                        onReset={() => setKey1(k => k + 1)}
                    >
                        <ErrorTrigger label="Trigger Error (with fallbackRender)" />
                    </ErrorBoundary>
                </div>
            </SectionWrapper>

            <SectionWrapper title="SimpleErrorBoundary">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Simple error boundary with just a fallback prop. Shows fallback content when error occurs.
                </Paragraph>
                <div key={key2}>
                    <SimpleErrorBoundary
                        fallback={
                            <div style={{ padding: 16, background: "var(--background-secondary)", borderRadius: 8 }}>
                                <Paragraph color="text-danger">Something went wrong!</Paragraph>
                                <Button onClick={() => setKey2(k => k + 1)} style={{ marginTop: 8 }}>
                                    Reset
                                </Button>
                            </div>
                        }
                    >
                        <ErrorTrigger label="Trigger Error (SimpleErrorBoundary)" />
                    </SimpleErrorBoundary>
                </div>
            </SectionWrapper>

            <SectionWrapper title="LocalErrorBoundary">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Displays an inline error message. Used for non-critical component errors.
                </Paragraph>
                <div key={key3}>
                    <LocalErrorBoundary>
                        <ErrorTrigger label="Trigger Error (LocalErrorBoundary)" />
                    </LocalErrorBoundary>
                    <Button variant="secondary" onClick={() => setKey3(k => k + 1)} style={{ marginTop: 8 }}>
                        Reset LocalErrorBoundary
                    </Button>
                </div>
            </SectionWrapper>

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">
                    <strong>ErrorBoundary</strong>
                </Paragraph>
                <Paragraph color="text-muted">
                    <code>fallback</code> - Static ReactNode to show on error.
                </Paragraph>
                <Paragraph color="text-muted">
                    <code>fallbackRender</code> - Function receiving error and resetErrorBoundary.
                </Paragraph>
                <Paragraph color="text-muted">
                    <code>FallbackComponent</code> - Component receiving error and resetErrorBoundary props.
                </Paragraph>
                <Paragraph color="text-muted">
                    <code>onError</code> - Callback when error is caught (error, errorInfo).
                </Paragraph>
                <Paragraph color="text-muted">
                    <code>onReset</code> - Callback when boundary is reset.
                </Paragraph>
                <Paragraph color="text-muted">
                    <code>resetKeys</code> - Array of values that trigger reset when changed.
                </Paragraph>
            </SectionWrapper>

            <SectionWrapper title="Usage">
                <Paragraph color="text-muted">
                    Wrap components that may throw errors. Use ErrorBoundary for full control,
                    SimpleErrorBoundary for basic fallback, or LocalErrorBoundary for inline error display.
                </Paragraph>
            </SectionWrapper>
        </div>
    );
}
