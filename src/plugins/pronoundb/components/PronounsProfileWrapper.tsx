import { UserStore } from "../../../webpack/common";
import { Settings } from "../../../Vencord";
import { PronounMapping, UserProfileProps } from "../types";
import { useAwaiter, classes } from "../../../utils";
import { fetchPronouns, formatPronouns } from "../utils";

export default function PronounsProfileWrapper(props: UserProfileProps, pronounsComponent: JSX.Element) {
    // Don't bother fetching bot or system users
    if (props.user.bot || props.user.system) return null;
    // Respect showSelf options
    if (!Settings.plugins["PronounDB"].showSelf && props.user.id === UserStore.getCurrentUser().id) return null;

    const [result, , isPending] = useAwaiter(
        () => fetchPronouns(props.user.id),
        null,
        e => console.error("Fetching pronouns failed: ", e)
    );

    // If the promise completed, the result was not "unspecified", and there is a mapping for the code, then return a span with the pronouns
    if (!isPending && result && result !== "unspecified" && PronounMapping[result]) {
        // First child is the header, second is a div with the actual text
        const [, pronounsBodyComponent] = pronounsComponent.props.children as [JSX.Element, JSX.Element];
        pronounsBodyComponent.props.children = formatPronouns(result);
        return pronounsComponent;
    }
    // Otherwise, return null so nothing else is rendered
    else return null;
}
