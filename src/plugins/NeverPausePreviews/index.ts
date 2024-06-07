import definePlugin from "@utils/types";

export default definePlugin({
    name: "NeverPausePreviews",
    description: "Prevents in-call/PiP previews (screenshare, streams, etc) from pausing even if the client loses focus",
    authors: [
        {
            id: 747192967311261748n,
            name: "vappster",
        },
    ],
    patches: [
        {   //picture-in-picture player patch
            find: "streamerPaused()",
            replacement: {
                match: /return (.{0,120})&&!.{1,2}}/,
                replace: "return $1&&false}"
            }
        },
        {   //in-call player patch #1 (keep stream playing)
            find: /videoComponent:.{1,2},className:/,
            replacement: {
                match: /paused:.{1,2}}\)/,
                replace: "paused:false})"
            }
        },
        {   //in-call player patch #2 (disable "your stream is still running" text overlay)
            find: /let{mainText:.{1,2},supportingText:.{1,2}/,
            replacement: {
                match: /let{.{0,120};/,
                replace: "return;"
            }
        }
    ],
});
