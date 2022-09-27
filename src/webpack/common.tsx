import { startAll } from "../plugins";
import { waitFor, filters, findByProps } from './webpack';
import type Components from "discord-types/components";
import type Stores from "discord-types/stores";
import type Other from "discord-types/other";

export let FluxDispatcher: Other.FluxDispatcher;
export let React: typeof import("react");
export let UserStore: Stores.UserStore;
export let Forms: any = {};
export let Button: any;
export let Switch: any;
export let Tooltip: Components.Tooltip;

waitFor("useState", m => React = m);
waitFor(["dispatch", "subscribe"], m => {
    FluxDispatcher = m;
    const cb = () => {
        m.unsubscribe("CONNECTION_OPEN", cb);
        startAll();
    };
    m.subscribe("CONNECTION_OPEN", cb);
});
waitFor(["getCurrentUser", "initialize"], m => UserStore = m);
waitFor(["Hovers", "Looks", "Sizes"], m => Button = m);
waitFor(filters.byCode("helpdeskArticleId"), m => Switch = m);
waitFor(["Positions", "Colors"], m => Tooltip = m);

waitFor(m => m.Tags && filters.byCode("errorSeparator")(m), m => Forms.FormTitle = m);
waitFor(m => m.Tags && filters.byCode("titleClassName", "sectionTitle")(m), m => Forms.FormSection = m);
waitFor(m => m.Types?.INPUT_PLACEHOLDER, m => Forms.FormText = m);

waitFor(m => {
    if (typeof m !== "function") return false;
    const s = m.toString();
    return s.length < 200 && s.includes("divider");
}, m => Forms.FormDivider = m);
