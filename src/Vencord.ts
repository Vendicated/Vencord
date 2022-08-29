import * as plugins from "./plugins";
import * as WP from "./utils/webpack";

import "./utils/patchWebpack";
import "./utils/quickCss";

export const Webpack = WP;
export const Plugins = plugins;