import { Settings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";

const defaultSettings = {
    presetFormat: "{ago} - {full}",
    timeFormat: "12h-ms",
    customDateFormat: "{ddde}, {MMMM} {dd}, {yyyy}",
    customTimeFormat: "{hh}:{mm}:{ss}.{SSS} {P}"
};


const presetFormats = {
    Default: "{ago} - {full}",
    Preset1: "{ago} at {time} ({agoFull} at {timeFull})",
    Preset2: "{ago} - {dateFull} at {timeFull} ({agoFull} - {dateAgo} at {timeAgo})",
    Preset3: "{ago} - {dateShort} at {timeShort} ({agoFull} - {dateAgoShort} at {timeAgoShort})"
};

const timeFormats = {
    "12h-ms": "{hh}:{mm}:{ss}.{SSS} {P}",
    "24h-ms": "{HH}:{mm}:{ss}.{SSS}",
    "12h-sec": "{hh}:{mm}:{ss} {P}",
    "24h-sec": "{HH}:{mm}:{ss}",
    "12h": "{hh}:{mm} {P}",
    "24h": "{HH}:{mm}"
};

function parseFormat(date: Date, format: string, tz: string = ""): string {
    let d = new Date(date);
    if (tz === "@{}") d = new Date(d.toUTCString());

    return format
        // Weekdays
        .replace(/\{ddde\}/g, d.toLocaleDateString(undefined, { weekday: "long" }))    // Tuesday
        .replace(/\{ddd\}/g, d.toLocaleDateString(undefined, { weekday: "short" }))    // Tue
        // Months
        .replace(/\{MMMM\}/g, d.toLocaleDateString(undefined, { month: "long" }))      // July
        .replace(/\{MMM\}/g, d.toLocaleDateString(undefined, { month: "short" }))      // Jul
        .replace(/\{MM\}/g, String(d.getMonth() + 1).padStart(2, "0"))                 // 07
        .replace(/\{M\}/g, String(d.getMonth() + 1))                                   // 7
        // Year
        .replace(/\{yyyy\}/g, String(d.getFullYear()))                                 // 2025
        .replace(/\{yy\}/g, String(d.getFullYear()).slice(-2))                         // 25
        // Day
        .replace(/\{dd\}/g, String(d.getDate()).padStart(2, "0"))                      // 22
        .replace(/\{d\}/g, String(d.getDate()))                                        // 22
        // Time - 24h
        .replace(/\{HH\}/g, String(d.getHours()).padStart(2, "0"))                     // 09
        .replace(/\{H\}/g, String(d.getHours()))                                       // 9
        // Time - 12h
        .replace(/\{hh\}/g, String((d.getHours() % 12) || 12).padStart(2, "0"))         // 09
        .replace(/\{h\}/g, String((d.getHours() % 12) || 12))                          // 9
        // Minutes
        .replace(/\{mm\}/g, String(d.getMinutes()).padStart(2, "0"))                   // 05
        .replace(/\{m\}/g, String(d.getMinutes()))                                     // 5
        // Seconds
        .replace(/\{ss\}/g, String(d.getSeconds()).padStart(2, "0"))                   // 08
        .replace(/\{s\}/g, String(d.getSeconds()))                                     // 8
        // Milliseconds
        .replace(/\{SSS\}/g, String(d.getMilliseconds()).padStart(3, "0"))             // 123
        // AM/PM
        .replace(/\{P\}/g, d.getHours() >= 12 ? "PM" : "AM")                           // AM
        .replace(/\{p\}/g, d.getHours() >= 12 ? "P" : "A")                             // A
        // TODO: Add timezone support for @{tz}, @{.}, @{}, <...>, >...
}


function formatTimestamp(plugin: any, iso: string): string {
    const preset = presetFormats[Settings.plugins.CompleteTimestamps.presetFormat] || presetFormats.Default;
    const timeFmt = timeFormats[Settings.plugins.CompleteTimestamps.timeFormat] || defaultSettings.customTimeFormat;
    const dateFmt = Settings.plugins.CompleteTimestamps.customDateFormat || defaultSettings.customDateFormat;

    const date = new Date(iso);
    const now = new Date();

    const agoMs = now.getTime() - date.getTime();
    const totalDays = Math.floor(agoMs / 86400000);
    const ago = totalDays === 0 ? "Today"
              : totalDays === 1 ? "Yesterday"
              : `${totalDays} Days Ago`;

    const fullDate = parseFormat(date, dateFmt);
    const fullTime = parseFormat(date, timeFmt);

    return preset.replace(/{ago}/g, ago)
                 .replace(/{full}/g, `${fullDate} at ${fullTime}`);
}

function processTimeElement(plugin: any, timeEl: HTMLTimeElement) {
    const iso = timeEl.getAttribute("datetime");
    if (!iso) return;

    const formatted = formatTimestamp(plugin, iso);
    const separator = timeEl.querySelector("i.separator_c19a55");

    if (separator?.nextSibling) {
        separator.nextSibling.textContent = " " + formatted;
    }

    timeEl.setAttribute("aria-label", formatted);
}

export default definePlugin({
    name: "CompleteTimestamps",
    description: "Expands Discord timestamps with configurable formats and timezone support.",
    authors: [{ name: "Tammy 💜", id: 637078631943897103n }],
    options: {
        presetFormat: {
            type: OptionType.SELECT,
            description: "Choose a preset format or custom format.",
            options: [
                { label: "Default (Today - Tuesday, July 22, 2025 at 3:47:44.684 PM)", value: "Default", default: true },
                { label: "Today at 3:47:44.684 PM (3 Days Ago at 12:01:37.792 AM)", value: "Preset1" },
                { label: "Today - Tuesday, 22 July 2025 at 3:47:44.684 PM (3 Days Ago ...)", value: "Preset2" },
                { label: "Today - 22 July 2025 at 3:47:44.684 PM (3 Days Ago ...)", value: "Preset3" },
                { label: "Custom (uses fields below)", value: "Custom" }
            ]
        },
        timeFormat: {
            type: OptionType.SELECT,
            description: "Choose the time format.",
            options: [
                { label: "12h with ms (3:47:44.684 PM)", value: "12h-ms", default: true },
                { label: "24h with ms (15:47:44.684)", value: "24h-ms" },
                { label: "12h with seconds (3:47:44 PM)", value: "12h-sec" },
                { label: "24h with seconds (15:47:44)", value: "24h-sec" },
                { label: "12h (3:47 PM)", value: "12h" },
                { label: "24h (15:47)", value: "24h" }
            ]
        },
        customDateFormat: {
            type: OptionType.STRING,
            description: "Custom date format string (if preset = Custom)",
            default: defaultSettings.customDateFormat
        },
        customTimeFormat: {
            type: OptionType.STRING,
            description: "Custom time format string (if preset = Custom)",
            default: defaultSettings.customTimeFormat
        }
    },
    start() {
        const sweep = () => {
            document.querySelectorAll<HTMLTimeElement>(
                "span.timestamp_c19a55.timestampInline_c19a55 time, div[class*=tooltip] time"
            ).forEach(el => processTimeElement(this, el));
        };

        sweep();

        this.observer = new MutationObserver(mutations => {
            mutations.forEach(m => {
                m.addedNodes.forEach(node => {
                    if (!(node instanceof HTMLElement)) return;
                    node.querySelectorAll<HTMLTimeElement>(
                        "span.timestamp_c19a55.timestampInline_c19a55 time, div[class*=tooltip] time"
                    ).forEach(el => processTimeElement(this, el));
                });
            });
        });
        this.observer.observe(document.body, { childList: true, subtree: true });
    },
    stop() {
        if (this.observer) this.observer.disconnect();
    }
});
