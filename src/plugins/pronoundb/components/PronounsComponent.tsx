import { Message } from "discord-types/general";
import { fetchPronouns } from "../utils";
import { classes, lazyWebpack, useAwaiter } from "../../../utils/misc";
import { PronounMapping } from "../types";
import { filters } from "../../../webpack";
import { UserStore } from "../../../webpack/common";
import { Settings } from "../../../Vencord";
import { PronounsFormat } from "..";

const styles: Record<string, string> = lazyWebpack(filters.byProps(["timestampInline"]));

export default function ({ message }: { message: Message; }) {
    // Don't bother fetching bot or system users
    if (message.author.bot || message.author.system) return null;
    // Respect showSelf options
    // TODO Change this after the defaults issue is fixed
    if (!(Settings.plugins["PronounDB"].showSelf ?? true) && message.author.id === UserStore.getCurrentUser().id) return null;

    const [result, , isPending] = useAwaiter(
        () => fetchPronouns(message.author.id),
        null,
        e => console.error("Fetching pronouns failed: ", e)
    );

    // If the promise completed, the result was not "unspecified", and there is a mapping for the code, then return a span with the pronouns
    if (!isPending && result && result !== "unspecified" && PronounMapping[result]) {
        // TODO Change this after the defaults issue is fixed
        const pronounFormat: PronounsFormat = Settings.plugins["PronounDB"].pronounsFormat ?? PronounsFormat.Lowercase;
        return (
            <span
                className={classes(styles.timestampInline, styles.timestamp)}
            >• {PronounMapping[result][pronounFormat]}</span>
        );
    }
    // Otherwise, return null so nothing else is rendered
    else return null;
}
