/* eslint-disable simple-header/header */

/*
 * ollama/ollama-js
 * Copyright (c) 2024 ollama and contributors
 * SPDX-License-Identifier: MIT
 */

export type Fetch = typeof fetch;

export interface Config {
    host: string;
    fetch?: Fetch;
    proxy?: boolean;
}

// request types

export interface Options {
    numa: boolean;
    num_ctx: number;
    num_batch: number;
    main_gpu: number;
    low_vram: boolean;
    f16_kv: boolean;
    logits_all: boolean;
    vocab_only: boolean;
    use_mmap: boolean;
    use_mlock: boolean;
    embedding_only: boolean;
    num_thread: number;

    // Runtime options
    num_keep: number;
    seed: number;
    num_predict: number;
    top_k: number;
    top_p: number;
    tfs_z: number;
    typical_p: number;
    repeat_last_n: number;
    temperature: number;
    repeat_penalty: number;
    presence_penalty: number;
    frequency_penalty: number;
    mirostat: number;
    mirostat_tau: number;
    mirostat_eta: number;
    penalize_newline: boolean;
    stop: string[];
}

export interface GenerateRequest {
    model: string;
    prompt: string;
    system?: string;
    template?: string;
    context?: number[];
    stream?: boolean;
    raw?: boolean;
    format?: string;
    images?: Uint8Array[] | string[];
    keep_alive?: string | number;

    options?: Partial<Options>;
}

export interface Message {
    role: "system" | "user" | "assistant";
    content: string;
    images?: Uint8Array[] | string[];
}

export interface ChatRequest {
    model: string;
    messages?: Message[];
    stream?: boolean;
    format?: string;
    keep_alive?: string | number;

    options?: Partial<Options>;
}

export interface PullRequest {
    model: string;
    insecure?: boolean;
    stream?: boolean;
}

export interface PushRequest {
    model: string;
    insecure?: boolean;
    stream?: boolean;
}

export interface CreateRequest {
    model: string;
    path?: string;
    modelfile?: string;
    stream?: boolean;
}

export interface DeleteRequest {
    model: string;
}

export interface CopyRequest {
    source: string;
    destination: string;
}

export interface ShowRequest {
    model: string;
    system?: string;
    template?: string;
    options?: Partial<Options>;
}

export interface EmbeddingsRequest {
    model: string;
    prompt: string;
    keep_alive?: string | number;

    options?: Partial<Options>;
}

// response types

export interface GenerateResponse {
    model: string;
    created_at: Date;
    response: string;
    done: boolean;
    context: number[];
    total_duration: number;
    load_duration: number;
    prompt_eval_count: number;
    prompt_eval_duration: number;
    eval_count: number;
    eval_duration: number;
}

export interface ChatResponse {
    model: string;
    created_at: Date;
    message: Message;
    done: boolean;
    total_duration: number;
    load_duration: number;
    prompt_eval_count: number;
    prompt_eval_duration: number;
    eval_count: number;
    eval_duration: number;
}

export interface EmbeddingsResponse {
    embedding: number[];
}

export interface ProgressResponse {
    status: string;
    digest: string;
    total: number;
    completed: number;
}

export interface ModelResponse {
    name: string;
    modified_at: Date;
    size: number;
    digest: string;
    details: ModelDetails;
}

export interface ModelDetails {
    parent_model: string;
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
}

export interface ShowResponse {
    license: string;
    modelfile: string;
    parameters: string;
    template: string;
    system: string;
    parent_model: string;
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
    messages: Message[];
}

export interface ListResponse {
    models: ModelResponse[];
}

export interface ErrorResponse {
    error: string;
}

export interface StatusResponse {
    status: string;
}
