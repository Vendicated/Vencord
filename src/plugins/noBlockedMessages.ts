import { Devs } from "../utils/constants";
import definePlugin from "../utils/types";

export default definePlugin({
    name: "NoBlockedMessages",
    description: "Hides all blocked messages from chat completely.",
    authors: [Devs.rushii],
    patches: [
        {
            find: "safety_prompt:\"DMSpamExperiment\",response:\"show_redacted_messages\"",
            replacement: [
                {
                    match: /collapsedReason;return (?=\w{1,2}.createElement)/,
                    replace: "collapsedReason; return null;"
                }
            ]
        }
    ]
});
