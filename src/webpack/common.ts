import { startAll } from "../plugins";
import { waitFor, filters } from './webpack';
import type Components from "discord-types/components";
import type Stores from "discord-types/stores";
import type Other from "discord-types/other";

export let FluxDispatcher: Other.FluxDispatcher;
export let React: typeof import("react");
export let UserStore: Stores.UserStore;
export let Forms: any;
export let Button: any;
export let ButtonProps: any;
export let Switch: any;
export let Flex: Components.Flex;
export let Card: Components.Card;
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
waitFor("FormSection", m => Forms = m);
waitFor(["ButtonLooks", "default"], m => {
    Button = m.default;
    ButtonProps = m;
});
waitFor(filters.byDisplayName("SwitchItem"), m => Switch = m.default);
waitFor(filters.byDisplayName("Flex"), m => Flex = m.default);
waitFor(filters.byDisplayName("Card"), m => Card = m.default);
waitFor(filters.byDisplayName("Tooltip"), m => Tooltip = m.default);
