export * as Plugins from "./plugins";
export * as Webpack from "./webpack";
export * as Api from "./api";
export { Settings } from "./api/settings";

import "./utils/patchWebpack";
import "./utils/quickCss";
import { waitFor } from "./webpack";

export let Components;

waitFor("useState", () => setTimeout(() => import("./components").then(mod => Components = mod), 0));