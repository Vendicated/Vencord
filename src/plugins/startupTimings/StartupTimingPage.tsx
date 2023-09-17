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

import "./StartupTimingPage.css";

import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { findByPropsLazy } from "@webpack";
import { Forms, React } from "@webpack/common";


export const cl = classNameFactory("vc-startuptimings-");

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
                    <div className={cl("server-trace")} style={{ marginBottom: 5 }}>
                        Trace ended at: {(new Date(traceEnd)).toTimeString()}
                    </div>
                )}
                <div className={classes(cl("grid"), cl("4-cols"))}>
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
                <Flex flexDirection="column" className={cl("server-trace")} style={{ gap: 5 }}>
                    {lines.map(line => (
                        <span>{line}</span>
                    ))}
                </Flex>
            </code>
        </Forms.FormSection >
    );
}

function TTIAnalytics() {
    const analytics = TTITracker.serializeTTITracker();
    const filteredAnalytics = Object.entries(analytics).filter(([key, value]) => value != null && !/_start$|_end$/.test(key));

    return (
        <ErrorBoundary>
            <Forms.FormSection title="TTI Analytics" tag="h2">
                <code>
                    <div className={classes(cl("grid"), cl("2-cols"))}>
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

interface TTITimingsProps {
    records: [string, ITTITrackerEvent][];
    title: string;
    type: "registered" | "unregistered";
}

function TTITimings({ records, title, type }: TTITimingsProps) {
    const isRegistered = type === "registered";

    return (
        <ErrorBoundary>
            <Forms.FormSection title={title} tag="h2">
                <code>
                    <div className={classes(cl("grid"), cl(isRegistered ? "3-cols" : "2-cols"))}>
                        {isRegistered && <span>Duration</span>}
                        <span>Key</span>
                        <span style={{ marginBottom: 5 }}>Event</span>
                        {records.map(([key, event]) => (
                            <React.Fragment key={key}>
                                {isRegistered && <span><pre>{event.end - event.start}ms</pre></span>}
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

    const registeredTTITimings: [string, ITTITrackerEvent][] = (Object.entries(TTITracker))
        .filter(([, value]) => value?.hasData?.());

    const unregisteredTTITimings: [string, ITTITrackerEvent][] = (Object.entries(TTITracker))
        .filter(([, value]) => value?.hasData && !value.hasData());

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

            <TTITimings
                title="Registered TTI Timings"
                records={registeredTTITimings}
                type="registered"
            />
            <Forms.FormDivider className={classes(Margins.top16, Margins.bottom16)} />

            <TTITimings
                title="Unregistered TTI Timings"
                records={unregisteredTTITimings}
                type="unregistered"
            />
        </React.Fragment>
    );
}

export default ErrorBoundary.wrap(StartupTimingPage);
