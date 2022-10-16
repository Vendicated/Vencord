import { fetchPronouns } from "./utils";
import { useAwaiter } from "../../utils/misc";
import { MessageHeaderProps, PronounMapping } from "./types";
import { findByProps } from "../../webpack";
import { proxyLazy } from "../../utils";

const styles: Record<string, string> = proxyLazy(() => findByProps("timestampInline"));

export default function PronounComponent({ message }: MessageHeaderProps) {
    // Don't bother fetching bot or system users
    if (message.author.bot && message.author.system) return null;

    const [result, error, isPending] = useAwaiter(() => fetchPronouns(message.author.id));

    // If the fetching completed successfully and the result was not "unspecified", then return a span with the pronouns
    if (!isPending && result && result !== "unspecified") return (
        <span className={`${styles.timestampInline} ${styles.timestamp}`}>• {PronounMapping[result]}</span>
    );
    // If there was an error, log it
    if (error) console.error("Error fetching pronouns: ", error);
    // Return null so nothing else is rendered
    return null;
}
