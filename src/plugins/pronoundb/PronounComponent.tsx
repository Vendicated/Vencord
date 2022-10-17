import { fetchPronouns } from "./utils";
import { classes, lazyWebpack, useAwaiter } from "../../utils/misc";
import { PronounMapping } from "./types";
import { filters } from "../../webpack";
import { Message } from "discord-types/general";

const styles: Record<string, string> = lazyWebpack(filters.byProps(["timestampInline"]));

export default function PronounComponent({ message }: { message: Message; }) {
    // Don't bother fetching bot or system users
    if (message.author.bot && message.author.system) return null;

    const [result, , isPending] = useAwaiter(
        () => fetchPronouns(message.author.id),
        null,
        e => console.error("Fetching pronouns failed: ", e)
    );

    // If the promise completed, the result was not "unspecified", and there is a mapping for the code, then return a span with the pronouns
    if (!isPending && result && result !== "unspecified" && PronounMapping[result]) return (
        <span
            className={classes(styles.timestampInline, styles.timestamp)}
        >• {PronounMapping[result]}</span>
    );
    // Otherwise, return null so nothing else is rendered
    else return null;
}
