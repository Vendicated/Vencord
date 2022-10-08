#!/usr/bin/node
import { createWriteStream } from "fs";
import yazl from "yazl";
import esbuild from "esbuild";
import { gitHashPlugin, globPlugins } from "./buildCommon.mjs";
import { sassPlugin } from "esbuild-sass-plugin";

await esbuild.build({
    logLevel: "info",
    entryPoints: ["browser/Vencord.ts"],
    outfile: "dist/browser.js",
    format: "iife",
    bundle: true,
    globalName: "Vencord",
    target: ["esnext"],
    footer: { js: "//# sourceURL=VencordWeb" },
    external: ["plugins", "git-hash"],
    plugins: [
        globPlugins,
        gitHashPlugin,
        sassPlugin({ type: "css-text" })
    ],
    sourcemap: false,
    minify: true
});

const zip = new yazl.ZipFile();
zip.outputStream.pipe(createWriteStream("dist/extension.zip")).on("close", () => {
    console.info("Extension written to dist/extension.zip");
});

zip.addFile("dist/browser.js", "dist/Vencord.js");
["background.js", "content.js", "manifest.json"].forEach(f => {
    zip.addFile(`browser/${f}`, `${f}`);
});
zip.end();
