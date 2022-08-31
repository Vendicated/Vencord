import { startAll } from "../plugins";
import { waitFor, filters } from './webpack';

export let FluxDispatcher: any;
export let React: typeof import("react");
export let UserStore: any;
export let Forms: any;
export let Button: any;
export let ButtonProps: any;
export let Switch: any;
export let Flex: any;
export let Card: any;

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