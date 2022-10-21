/**
 * Creating a local alias for wildcard imports seems to be
 * the only way to add JsDoc to them t_t
 */
import * as $MessageEventsAPI from "./MessageEvents";
import * as $Notices from "./Notices";
import * as $Commands from "./Commands";
import * as $DataStore from "./DataStore";
import * as $MessageAccessories from "./MessageAccessories";

/**
 * An API allowing you to listen to Message Clicks or run your own logic
 * before a message is sent
 *
 * If your plugin uses this, you must add MessageEventsAPI to its dependencies
 */
const MessageEvents = $MessageEventsAPI;
/**
 * An API allowing you to create custom notices
 * (snackbars on the top, like the Update prompt)
 */
const Notices = $Notices;
/**
 * An API allowing you to register custom commands
 */
const Commands = $Commands;
/**
 * A wrapper around IndexedDB. This can store arbitrarily
 * large data and supports a lot of datatypes (Blob, Map, ...).
 * For a full list, see the mdn link below
 *
 * This should always be preferred over the Settings API if possible, as
 * localstorage has very strict size restrictions and blocks the event loop
 *
 * Make sure your keys are unique (tip: prefix them with ur plugin name)
 * and please clean up no longer needed entries.
 *
 * This is actually just idb-keyval, so if you're familiar with that, you're golden!
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm#supported_types}
 */
const DataStore = $DataStore;
/**
 * An API allowing you to add custom components as message accessories
 */
const MessageAccessories = $MessageAccessories;

export { DataStore, MessageAccessories, MessageEvents, Notices, Commands };
