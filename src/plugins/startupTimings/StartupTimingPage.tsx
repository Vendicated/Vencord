/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { findByPropsLazy } from "@webpack";
import { Forms, React } from "@webpack/common";

interface ITTITrackerEvent {
    emoji: string;
    name: string;
    start: number;
    end: number;
    hasData(): boolean;
}

interface ITTITracker {
    serializeTTITracker(): Record<string, string | number | boolean | null | undefined>;
    [event: string]: ITTITrackerEvent | string | boolean | null | any;
}

/** Time-To-Interactive Tracker */
const TTITracker: ITTITracker = findByPropsLazy("serializeTTITracker");

interface AppStartPerformance {
    prefix: string;
    logs: Log[];
    logGroups: LogGroup[];
    endTime_: number;
    isTracing_: boolean;
}

interface LogGroup {
    index: number;
    timestamp: number;
    logs: Log[];
    nativeLogs: any[];
    serverTrace: string;
}

interface Log {
    emoji: string;
    prefix: string;
    log: string;
    timestamp?: number;
    delta?: number;
}

const AppStartPerformance = findByPropsLazy("markWithDelta", "markAndLog", "markAt") as AppStartPerformance;

interface TimerItemProps extends Log {
    instance: {
        sinceStart: number;
        sinceLast: number;
    };
}

function TimerItem({ emoji, prefix, log, delta, instance }: TimerItemProps) {
    return (
        <React.Fragment>
            <span>{instance.sinceStart.toFixed(3)}s</span>
            <span>{instance.sinceLast.toFixed(3)}s</span>
            <span>{delta?.toFixed(0) ?? ""}</span>
            <span><pre>{emoji} {prefix ?? " "}{log}</pre></span>
        </React.Fragment>
    );
}

interface TimingSectionProps {
    title: string;
    logs: Log[];
    traceEnd?: number;
}

function TimingSection({ title, logs, traceEnd }: TimingSectionProps) {
    const startTime = logs.find(l => l.timestamp)?.timestamp ?? 0;

    let lastTimestamp = startTime;
    const timings = logs.map(log => {
        // Get last log entry with valid timestamp
        const timestamp = log.timestamp ?? lastTimestamp;

        const sinceStart = (timestamp - startTime) / 1000;
        const sinceLast = (timestamp - lastTimestamp) / 1000;

        lastTimestamp = timestamp;

        return { sinceStart, sinceLast };
    });

    return (
        <Forms.FormSection title={title} tag="h1">
            <code>
                {traceEnd && (
                    <div style={{ color: "var(--header-primary)", marginBottom: 5, userSelect: "text" }}>
                        Trace ended at: {(new Date(traceEnd)).toTimeString()}
                    </div>
                )}
                <div style={{ color: "var(--header-primary)", display: "grid", gridTemplateColumns: "repeat(3, auto) 1fr", gap: "2px 10px", userSelect: "text" }}>
                    <span>Start</span>
                    <span>Interval</span>
                    <span>Delta</span>
                    <span style={{ marginBottom: 5 }}>Event</span>
                    {AppStartPerformance.logs.map((log, i) => (
                        <TimerItem key={i} {...log} instance={timings[i]} />
                    ))}
                </div>
            </code>
        </Forms.FormSection>
    );
}

interface ServerTraceProps {
    trace: string;
}

function ServerTrace({ trace }: ServerTraceProps) {
    const lines = trace.split("\n");

    return (
        <Forms.FormSection title="Server Trace" tag="h2">
            <code>
                <Flex flexDirection="column" style={{ color: "var(--header-primary)", gap: 5, userSelect: "text" }}>
                    {lines.map(line => (
                        <span>{line}</span>
                    ))}
                </Flex>
            </code>
        </Forms.FormSection>
    );
}

function TTIAnalytics() {
    const analytics = TTITracker.serializeTTITracker();
    const filteredAnalytics = Object.entries(analytics).filter(([key, value]) => !/_start|_end$/.test(key) && value !== null && value !== undefined);

    return (
        <ErrorBoundary>
            <Forms.FormSection title="TTI Analytics" tag="h2">
                <code>
                    <div style={{ color: "var(--header-primary)", display: "grid", gridTemplateColumns: "auto 1fr", gap: "2px 10px", userSelect: "text" }}>
                        {filteredAnalytics.map(([key, value]) => (
                            <React.Fragment>
                                <span><pre>{key}</pre></span>
                                <span><pre>{`${value}`}</pre></span>
                            </React.Fragment>
                        ))}
                    </div>
                </code>
            </Forms.FormSection>
        </ErrorBoundary>
    );
}

function TTITimings() {
    const records: [string, ITTITrackerEvent][] = (Object.entries(TTITracker) as [string, ITTITrackerEvent][])
        .filter(([, value]) => value instanceof Object && value.hasData?.()) as any;

    return (
        <ErrorBoundary>
            <Forms.FormSection title="Registered TTI Timings" tag="h2">
                <code>
                    <div style={{ color: "var(--header-primary)", display: "grid", gridTemplateColumns: "repeat(2, auto) 1fr", gap: "2px 10px", userSelect: "text" }}>
                        <span>Duration</span>
                        <span>Key</span>
                        <span style={{ marginBottom: 5 }}>Event</span>
                        {records.map(([key, event]) => (
                            <React.Fragment>
                                <span><pre>{event.end - event.start}ms</pre></span>
                                <span><pre>{key}</pre></span>
                                <span><pre>{event.emoji} {event.name}</pre></span>
                            </React.Fragment>
                        ))}
                    </div>
                </code>
            </Forms.FormSection>
        </ErrorBoundary>
    );
}

function UnregisteredTimings() {
    const records: [string, ITTITrackerEvent][] = (Object.entries(TTITracker) as [string, ITTITrackerEvent][])
        .filter(([, value]) => value instanceof Object && value.hasData && !value.hasData()) as any;

    return (
        <ErrorBoundary>
            <Forms.FormSection title="Unregistered TTI Timings" tag="h2">
                <code>
                    <div style={{ color: "var(--header-primary)", display: "grid", gridTemplateColumns: "auto 1fr", gap: "2px 10px", userSelect: "text" }}>
                        <span>Key</span>
                        <span>Name</span>
                        {records.map(([key, event]) => (
                            <React.Fragment>
                                <span><pre>{key}</pre></span>
                                <span><pre>{event.emoji} {event.name}</pre></span>
                            </React.Fragment>
                        ))}
                    </div>
                </code>
            </Forms.FormSection>
        </ErrorBoundary>
    );
}

function StartupTimingPage() {
    if (!AppStartPerformance?.logs) return <div>Loading...</div>;

    const serverTrace = AppStartPerformance.logGroups.find(g => g.serverTrace)?.serverTrace;

    return (
        <React.Fragment>
            <TimingSection
                title="Startup Timings"
                logs={AppStartPerformance.logs}
                traceEnd={AppStartPerformance.endTime_}
            />
            <Forms.FormDivider className={classes(Margins.top16, Margins.bottom16)} />

            {serverTrace && <ServerTrace trace={serverTrace} />}
            <Forms.FormDivider className={classes(Margins.top16, Margins.bottom16)} />

            <TTIAnalytics />
            <Forms.FormDivider className={classes(Margins.top16, Margins.bottom16)} />

            <TTITimings />
            <Forms.FormDivider className={classes(Margins.top16, Margins.bottom16)} />

            <UnregisteredTimings />
        </React.Fragment>
    );
}

export default ErrorBoundary.wrap(StartupTimingPage);
