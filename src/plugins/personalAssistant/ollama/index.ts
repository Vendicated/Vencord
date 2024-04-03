/* eslint-disable simple-header/header */

/*
 * ollama/ollama-js
 * Copyright (c) 2024 ollama and contributors
 * SPDX-License-Identifier: MIT
 */

import { createHash } from "crypto";
import fs, { createReadStream, promises } from "fs";
import { homedir } from "os";
import { dirname, join, resolve } from "path";

import { Ollama as OllamaBrowser } from "./browser.js";
import type { CreateRequest, ProgressResponse } from "./interfaces.js";
import * as utils from "./utils.js";

export class Ollama extends OllamaBrowser {
    async encodeImage(image: Uint8Array | Buffer | string): Promise<string> {
        if (typeof image !== "string") {
            // image is Uint8Array or Buffer, convert it to base64
            const result = Buffer.from(image).toString("base64");
            return result;
        }
        try {
            if (fs.existsSync(image)) {
                // this is a filepath, read the file and convert it to base64
                const fileBuffer = await promises.readFile(resolve(image));
                return Buffer.from(fileBuffer).toString("base64");
            }
        } catch {
            // continue
        }
        // the string may be base64 encoded
        return image;
    }

    private async parseModelfile(
        modelfile: string,
        mfDir: string = process.cwd(),
    ): Promise<string> {
        const out: string[] = [];
        const lines = modelfile.split("\n");
        for (const line of lines) {
            const [command, args] = line.split(" ", 2);
            if (["FROM", "ADAPTER"].includes(command.toUpperCase())) {
                const path = this.resolvePath(args.trim(), mfDir);
                if (await this.fileExists(path)) {
                    out.push(`${command} @${await this.createBlob(path)}`);
                } else {
                    out.push(`${command} ${args}`);
                }
            } else {
                out.push(line);
            }
        }
        return out.join("\n");
    }

    private resolvePath(inputPath, mfDir) {
        if (inputPath.startsWith("~")) {
            return join(homedir(), inputPath.slice(1));
        }
        return resolve(mfDir, inputPath);
    }

    private async fileExists(path: string): Promise<boolean> {
        try {
            await promises.access(path);
            return true;
        } catch {
            return false;
        }
    }

    private async createBlob(path: string): Promise<string> {
        if (typeof ReadableStream === "undefined") {
            // Not all fetch implementations support streaming
            // TODO: support non-streaming uploads
            throw new Error("Streaming uploads are not supported in this environment.");
        }

        // Create a stream for reading the file
        const fileStream = createReadStream(path);

        // Compute the SHA256 digest
        const sha256sum = await new Promise<string>((resolve, reject) => {
            const hash = createHash("sha256");
            fileStream.on("data", data => hash.update(data));
            fileStream.on("end", () => resolve(hash.digest("hex")));
            fileStream.on("error", reject);
        });

        const digest = `sha256:${sha256sum}`;

        try {
            await utils.head(this.fetch, `${this.config.host}/api/blobs/${digest}`);
        } catch (e) {
            if (e instanceof Error && e.message.includes("404")) {
                // Create a new readable stream for the fetch request
                const readableStream = new ReadableStream({
                    start(controller) {
                        fileStream.on("data", chunk => {
                            controller.enqueue(chunk); // Enqueue the chunk directly
                        });

                        fileStream.on("end", () => {
                            controller.close(); // Close the stream when the file ends
                        });

                        fileStream.on("error", err => {
                            controller.error(err); // Propagate errors to the stream
                        });
                    },
                });

                await utils.post(
                    this.fetch,
                    `${this.config.host}/api/blobs/${digest}`,
                    readableStream,
                );
            } else {
                throw e;
            }
        }

        return digest;
    }

    create(
        request: CreateRequest & { stream: true; },
    ): Promise<AsyncGenerator<ProgressResponse>>;
    create(request: CreateRequest & { stream?: false; }): Promise<ProgressResponse>;

    async create(
        request: CreateRequest,
    ): Promise<ProgressResponse | AsyncGenerator<ProgressResponse>> {
        let modelfileContent = "";
        if (request.path) {
            modelfileContent = await promises.readFile(request.path, { encoding: "utf8" });
            modelfileContent = await this.parseModelfile(
                modelfileContent,
                dirname(request.path),
            );
        } else if (request.modelfile) {
            modelfileContent = await this.parseModelfile(request.modelfile);
        } else {
            throw new Error("Must provide either path or modelfile to create a model");
        }
        request.modelfile = modelfileContent;

        // check stream here so that typescript knows which overload to use
        if (request.stream) {
            return super.create(request as CreateRequest & { stream: true; });
        } else {
            return super.create(request as CreateRequest & { stream: false; });
        }
    }
}

export default new Ollama();

// export all types from the main entry point so that packages importing types dont need to specify paths
export * from "./interfaces.js";
