#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const API_BASE = "https://api.replicate.com/v1";
const DEFAULT_MODEL_OWNER = "stackadoc";
const DEFAULT_MODEL_NAME = "stable-audio-open-1.0";
const DEFAULT_DURATION_SECONDS = 24;
const MAX_MODEL_DURATION_SECONDS = 47;
const DEFAULT_POLL_INTERVAL_MS = 2500;
const DEFAULT_CREATE_RETRY_ATTEMPTS = 8;
const DEFAULT_CREATE_RETRY_DELAY_MS = 11000;
const DEFAULT_NETWORK_RETRY_ATTEMPTS = 5;
const DEFAULT_NETWORK_RETRY_DELAY_MS = 3000;
const GLOBAL_PROMPT_CONSTRAINTS = "Instrumental only. Primary instruments must be felt piano, acoustic guitar, and upright bass. Keep clear melody, harmony, and groove. No cinematic impacts, no synthetic sound design, no vocals. Seamless loop with no intro or outro tail.";
const DEFAULT_MODEL_INPUT = {
    steps: 130,
    cfg_scale: 7,
    sampler_type: "dpmpp-3m-sde",
    sigma_min: 0.03,
    sigma_max: 500,
    init_noise_level: 1,
    batch_size: 1,
};

const ERA_SPECS = [
    {
        era: "Primitive",
        fileName: "primitive-loop.wav",
        prompt: "Primitive era soundtrack loop, sparse and ancient mood, modal harmony, gentle pulse, mostly pizzicato upright bass with light felt piano motifs and plucked acoustic guitar harmonics, minimal hand percussion, exploratory and calm.",
    },
    {
        era: "Hearth",
        fileName: "hearth-loop.wav",
        prompt: "Hearth era soundtrack loop, warm pastoral folk style, lyrical felt piano melody with fingerstyle acoustic guitar and soft upright bass, cozy village atmosphere, hopeful and steady tempo.",
    },
    {
        era: "Banner",
        fileName: "banner-loop.wav",
        prompt: "Banner era soundtrack loop, confident frontier march feel, rhythmic piano ostinato, strummed acoustic guitar, upright bass driving pulse, noble and adventurous tone, medium tempo, no aggression.",
    },
    {
        era: "Engine",
        fileName: "engine-loop.wav",
        prompt: "Engine era soundtrack loop, early industrial jazz-folk hybrid, punchy piano chords, muted acoustic guitar comping, walking upright bass, focused momentum for strategy gameplay, medium-fast tempo.",
    },
    {
        era: "Aether",
        fileName: "aether-loop.wav",
        prompt: "Aether era soundtrack loop, futuristic neoclassical acoustic trio, shimmering felt piano arpeggios, airy guitar textures, bowed and pizzicato upright bass, elegant and mysterious, restrained dynamics.",
    },
];

function parseCliValue(prefix) {
    const arg = process.argv.find(entry => entry.startsWith(prefix));
    return arg ? arg.slice(prefix.length) : "";
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function parseOptionalJson(value, varName) {
    if (!value) return {};
    try {
        return JSON.parse(value);
    } catch {
        throw new Error(`${varName} must be valid JSON.`);
    }
}

function readWavString(buffer, offset, length) {
    return buffer.toString("ascii", offset, offset + length);
}

function findWavChunks(buffer) {
    if (buffer.length < 44) return null;
    if (readWavString(buffer, 0, 4) !== "RIFF") return null;
    if (readWavString(buffer, 8, 4) !== "WAVE") return null;

    const chunks = [];
    let offset = 12;
    while (offset + 8 <= buffer.length) {
        const id = readWavString(buffer, offset, 4);
        const size = buffer.readUInt32LE(offset + 4);
        const dataOffset = offset + 8;
        if (dataOffset + size > buffer.length) break;
        chunks.push({ id, size, dataOffset });
        offset = dataOffset + size + (size % 2);
    }
    return chunks;
}

async function trimPcmWavInPlace(filePath, targetSeconds) {
    const wav = await readFile(filePath);
    const chunks = findWavChunks(wav);
    if (!chunks) return { trimmed: false, reason: "not-wav" };

    const fmt = chunks.find(chunk => chunk.id === "fmt ");
    const data = chunks.find(chunk => chunk.id === "data");
    if (!fmt || !data) return { trimmed: false, reason: "missing-fmt-or-data" };
    if (fmt.size < 16) return { trimmed: false, reason: "invalid-fmt" };

    const audioFormat = wav.readUInt16LE(fmt.dataOffset + 0);
    const channels = wav.readUInt16LE(fmt.dataOffset + 2);
    const sampleRate = wav.readUInt32LE(fmt.dataOffset + 4);
    const byteRate = wav.readUInt32LE(fmt.dataOffset + 8);
    const blockAlign = wav.readUInt16LE(fmt.dataOffset + 12);
    const bitsPerSample = wav.readUInt16LE(fmt.dataOffset + 14);

    if (audioFormat !== 1) return { trimmed: false, reason: "unsupported-format" };
    if (!Number.isFinite(targetSeconds) || targetSeconds <= 0) return { trimmed: false, reason: "invalid-target-seconds" };
    if (!blockAlign || !sampleRate || !channels || !bitsPerSample || !byteRate) return { trimmed: false, reason: "invalid-stream-fields" };

    const targetFrames = Math.floor(targetSeconds * sampleRate);
    const targetDataBytes = Math.floor(targetFrames * blockAlign);
    const alignedTargetBytes = Math.max(0, targetDataBytes - (targetDataBytes % blockAlign));
    const nextDataSize = Math.min(data.size, alignedTargetBytes);
    if (nextDataSize <= 0 || nextDataSize >= data.size) {
        return { trimmed: false, reason: "already-short-enough" };
    }

    const nextData = wav.subarray(data.dataOffset, data.dataOffset + nextDataSize);
    const header = Buffer.alloc(44);
    header.write("RIFF", 0, "ascii");
    header.writeUInt32LE(36 + nextDataSize, 4);
    header.write("WAVE", 8, "ascii");
    header.write("fmt ", 12, "ascii");
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(audioFormat, 20);
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write("data", 36, "ascii");
    header.writeUInt32LE(nextDataSize, 40);

    await writeFile(filePath, Buffer.concat([header, nextData]));

    return {
        trimmed: true,
        beforeSeconds: data.size / byteRate,
        afterSeconds: nextDataSize / byteRate,
    };
}

function normalizeDurationSeconds(value) {
    if (!Number.isFinite(value)) return DEFAULT_DURATION_SECONDS;
    const rounded = Math.floor(value);
    return Math.max(1, Math.min(MAX_MODEL_DURATION_SECONDS, rounded));
}

function isVersionId(value) {
    return typeof value === "string" && /^[0-9a-f]{64}$/i.test(value);
}

function parseModelSlug(slug) {
    const parts = String(slug).trim().split("/");
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
        throw new Error(`Invalid model slug "${slug}". Expected "owner/name".`);
    }
    return { owner: parts[0], name: parts[1] };
}

function parseThrottleDelayMs(errorMessage, retryAfterHeader, fallbackMs) {
    if (retryAfterHeader) {
        const parsed = Number(retryAfterHeader);
        if (Number.isFinite(parsed) && parsed > 0) {
            return Math.ceil(parsed * 1000);
        }
    }

    if (typeof errorMessage === "string") {
        const match = errorMessage.match(/resets in ~?(\d+)s/i);
        if (match) {
            const seconds = Number(match[1]);
            if (Number.isFinite(seconds) && seconds > 0) {
                return (seconds + 1) * 1000;
            }
        }
    }

    return fallbackMs;
}

function getErrorStatus(error) {
    if (!error || typeof error !== "object") return null;
    return Number.isFinite(error.status) ? error.status : null;
}

function getErrorCode(error) {
    if (!error || typeof error !== "object") return "";
    if (typeof error.code === "string") return error.code;
    if (error.cause && typeof error.cause === "object" && typeof error.cause.code === "string") {
        return error.cause.code;
    }
    return "";
}

function getErrorRetryAfterMs(error, fallbackMs) {
    if (!error || typeof error !== "object") return fallbackMs;
    if (Number.isFinite(error.retryAfterMs)) {
        return Math.max(0, error.retryAfterMs);
    }
    return fallbackMs;
}

function isTransientNetworkError(error) {
    if (error && typeof error === "object" && error.transientNetwork === true) {
        return true;
    }
    const code = getErrorCode(error);
    if (["ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED", "EPIPE", "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_SOCKET"].includes(code)) {
        return true;
    }

    const message = error && typeof error === "object" && typeof error.message === "string"
        ? error.message.toLowerCase()
        : "";
    return message.includes("fetch failed") || message.includes("network request failed") || message.includes("econnreset");
}

function readConfig() {
    const dryRun = process.argv.includes("--dry-run");
    const eraFilter = parseCliValue("--era=");
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token && !dryRun) {
        throw new Error("Missing REPLICATE_API_TOKEN.");
    }

    const modelOwner = process.env.REPLICATE_MODEL_OWNER || DEFAULT_MODEL_OWNER;
    const modelName = process.env.REPLICATE_MODEL_NAME || DEFAULT_MODEL_NAME;
    const versionOverride = process.env.REPLICATE_VERSION || "";
    const durationSeconds = normalizeDurationSeconds(Number(process.env.ERA_MUSIC_DURATION_SECONDS || DEFAULT_DURATION_SECONDS));
    const pollIntervalMs = Number(process.env.REPLICATE_POLL_INTERVAL_MS || DEFAULT_POLL_INTERVAL_MS);
    const createRetryAttempts = Number(process.env.REPLICATE_CREATE_RETRY_ATTEMPTS || DEFAULT_CREATE_RETRY_ATTEMPTS);
    const createRetryDelayMs = Number(process.env.REPLICATE_CREATE_RETRY_DELAY_MS || DEFAULT_CREATE_RETRY_DELAY_MS);
    const networkRetryAttempts = Number(process.env.REPLICATE_NETWORK_RETRY_ATTEMPTS || DEFAULT_NETWORK_RETRY_ATTEMPTS);
    const networkRetryDelayMs = Number(process.env.REPLICATE_NETWORK_RETRY_DELAY_MS || DEFAULT_NETWORK_RETRY_DELAY_MS);
    const outputDir = process.env.ERA_MUSIC_OUTPUT_DIR || "client/public/audio/eras";
    const negativePrompt = process.env.STABLE_AUDIO_NEGATIVE_PROMPT || "lyrics, vocals, spoken word, atonal noise, distortion, glitch, harsh dissonance, sound effects, trailer hit, abrupt ending, hard stop";
    const inputPatch = parseOptionalJson(process.env.STABLE_AUDIO_INPUT_PATCH, "STABLE_AUDIO_INPUT_PATCH");

    return {
        token: token || "",
        modelOwner,
        modelName,
        versionOverride,
        durationSeconds,
        pollIntervalMs,
        createRetryAttempts,
        createRetryDelayMs,
        networkRetryAttempts,
        networkRetryDelayMs,
        outputDir,
        negativePrompt,
        inputPatch,
        dryRun,
        eraFilter,
    };
}

async function requestJson(url, options) {
    let response;
    try {
        response = await fetch(url, options);
    } catch (fetchError) {
        const message = fetchError && typeof fetchError === "object" && typeof fetchError.message === "string"
            ? fetchError.message
            : "fetch failed";
        const error = new Error(`Network request failed: ${message}`, { cause: fetchError });
        Object.assign(error, {
            status: null,
            retryAfterMs: DEFAULT_NETWORK_RETRY_DELAY_MS,
            code: getErrorCode(fetchError),
            transientNetwork: true,
        });
        throw error;
    }

    const text = await response.text();

    let data = null;
    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            data = { raw: text };
        }
    }

    if (!response.ok) {
        const detail = data?.detail || data?.error || data?.raw || `HTTP ${response.status}`;
        const message = typeof detail === "string" ? detail : JSON.stringify(detail);
        const error = new Error(message);
        const retryAfterHeader = response.headers.get("retry-after");
        const retryAfterMs = parseThrottleDelayMs(message, retryAfterHeader, DEFAULT_CREATE_RETRY_DELAY_MS);
        Object.assign(error, {
            status: response.status,
            retryAfterMs,
        });
        throw error;
    }

    return data;
}

async function requestJsonWithRetry(config, url, options, label) {
    let lastError = null;
    const maxAttempts = Math.max(1, Number(config.networkRetryAttempts) || DEFAULT_NETWORK_RETRY_ATTEMPTS);
    const baseDelayMs = Math.max(250, Number(config.networkRetryDelayMs) || DEFAULT_NETWORK_RETRY_DELAY_MS);

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            return await requestJson(url, options);
        } catch (error) {
            lastError = error;
            const status = getErrorStatus(error);
            const retryableStatus = status === 429 || (Number.isFinite(status) && status >= 500);
            const canRetry = (retryableStatus || isTransientNetworkError(error)) && attempt < maxAttempts;
            if (!canRetry) {
                throw error;
            }

            const waitMs = status === 429
                ? Math.max(baseDelayMs, getErrorRetryAfterMs(error, baseDelayMs))
                : baseDelayMs;
            console.warn(
                `[era-music] ${label}: transient request failure; retrying in ${Math.ceil(waitMs / 1000)}s (attempt ${attempt}/${maxAttempts})`,
            );
            await sleep(waitMs);
        }
    }

    throw lastError ?? new Error(`Failed request: ${label}`);
}

async function createPrediction(config, input) {
    const url = `${API_BASE}/predictions`;
    const versionIdentifier = config.versionId;
    let lastError = null;

    for (let attempt = 1; attempt <= config.createRetryAttempts; attempt += 1) {
        try {
            return await requestJson(url, {
                method: "POST",
                headers: {
                    Authorization: `Token ${config.token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    version: versionIdentifier,
                    input,
                }),
            });
        } catch (error) {
            lastError = error;
            const status = getErrorStatus(error);
            const retryableStatus = status === 429 || (Number.isFinite(status) && status >= 500);
            const canRetry = (retryableStatus || isTransientNetworkError(error)) && attempt < config.createRetryAttempts;
            if (!canRetry) {
                throw error;
            }

            const waitMs = status === 429
                ? Math.max(config.createRetryDelayMs, getErrorRetryAfterMs(error, config.createRetryDelayMs))
                : Math.max(config.networkRetryDelayMs, DEFAULT_NETWORK_RETRY_DELAY_MS);
            const reason = status === 429
                ? "rate-limited creating prediction"
                : isTransientNetworkError(error)
                    ? "network error creating prediction"
                    : `server error ${status} creating prediction`;
            console.warn(`[era-music] ${reason}; retrying in ${Math.ceil(waitMs / 1000)}s (attempt ${attempt}/${config.createRetryAttempts})`);
            await sleep(waitMs);
        }
    }

    throw lastError ?? new Error("Failed to create prediction.");
}

async function resolveVersionId(config) {
    if (isVersionId(config.versionOverride)) {
        return {
            versionId: config.versionOverride,
            modelOwner: config.modelOwner,
            modelName: config.modelName,
        };
    }

    let owner = config.modelOwner;
    let name = config.modelName;
    if (config.versionOverride) {
        const parsed = parseModelSlug(config.versionOverride);
        owner = parsed.owner;
        name = parsed.name;
    }

    const modelInfo = await requestJsonWithRetry(config, `${API_BASE}/models/${owner}/${name}`, {
        headers: {
            Authorization: `Token ${config.token}`,
        },
    }, "resolve model metadata");

    const versionId = modelInfo?.latest_version?.id;
    if (!isVersionId(versionId)) {
        throw new Error(`Could not resolve latest version ID for model ${owner}/${name}.`);
    }

    return { versionId, modelOwner: owner, modelName: name };
}

async function pollPrediction(config, predictionId) {
    const url = `${API_BASE}/predictions/${predictionId}`;
    while (true) {
        const prediction = await requestJsonWithRetry(config, url, {
            headers: {
                Authorization: `Token ${config.token}`,
            },
        }, `poll prediction ${predictionId}`);

        const status = prediction?.status;
        if (status === "succeeded") return prediction;
        if (status === "failed" || status === "canceled") {
            const err = prediction?.error || `Prediction ${predictionId} failed with status "${status}".`;
            throw new Error(err);
        }

        await sleep(config.pollIntervalMs);
    }
}

function extractOutputUrl(output) {
    if (typeof output === "string") return output;
    if (Array.isArray(output)) {
        const firstString = output.find(item => typeof item === "string");
        if (firstString) return firstString;
    }
    if (output && typeof output === "object") {
        if (typeof output.url === "string") return output.url;
        if (typeof output.audio === "string") return output.audio;
    }
    return null;
}

async function downloadToFile(url, absolutePath) {
    let response;
    try {
        response = await fetch(url);
    } catch (fetchError) {
        const message = fetchError && typeof fetchError === "object" && typeof fetchError.message === "string"
            ? fetchError.message
            : "fetch failed";
        const error = new Error(`Network request failed while downloading output: ${message}`, { cause: fetchError });
        Object.assign(error, {
            status: null,
            retryAfterMs: DEFAULT_NETWORK_RETRY_DELAY_MS,
            code: getErrorCode(fetchError),
            transientNetwork: true,
        });
        throw error;
    }

    if (!response.ok) {
        const error = new Error(`Failed to download output file (${response.status}).`);
        Object.assign(error, {
            status: response.status,
            retryAfterMs: parseThrottleDelayMs("", response.headers.get("retry-after"), DEFAULT_NETWORK_RETRY_DELAY_MS),
        });
        throw error;
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    await writeFile(absolutePath, bytes);
}

async function downloadToFileWithRetry(config, url, absolutePath) {
    let lastError = null;
    const maxAttempts = Math.max(1, Number(config.networkRetryAttempts) || DEFAULT_NETWORK_RETRY_ATTEMPTS);
    const baseDelayMs = Math.max(250, Number(config.networkRetryDelayMs) || DEFAULT_NETWORK_RETRY_DELAY_MS);

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            await downloadToFile(url, absolutePath);
            return;
        } catch (error) {
            lastError = error;
            const status = getErrorStatus(error);
            const retryableStatus = status === 429 || (Number.isFinite(status) && status >= 500);
            const canRetry = (retryableStatus || isTransientNetworkError(error)) && attempt < maxAttempts;
            if (!canRetry) {
                throw error;
            }

            const waitMs = status === 429
                ? Math.max(baseDelayMs, getErrorRetryAfterMs(error, baseDelayMs))
                : baseDelayMs;
            console.warn(
                `[era-music] download output: transient failure; retrying in ${Math.ceil(waitMs / 1000)}s (attempt ${attempt}/${maxAttempts})`,
            );
            await sleep(waitMs);
        }
    }

    throw lastError ?? new Error("Failed to download output file.");
}

async function run() {
    const config = readConfig();
    if (!config.dryRun) {
        const resolved = await resolveVersionId(config);
        config.versionId = resolved.versionId;
        config.modelOwner = resolved.modelOwner;
        config.modelName = resolved.modelName;
        console.log(`[era-music] using model ${config.modelOwner}/${config.modelName}@${config.versionId}`);
    }

    const absoluteOutputDir = path.resolve(process.cwd(), config.outputDir);
    await mkdir(absoluteOutputDir, { recursive: true });

    const manifest = [];
    let failures = 0;
    const selectedSpecs = config.eraFilter
        ? ERA_SPECS.filter(spec => spec.era.toLowerCase() === config.eraFilter.toLowerCase())
        : ERA_SPECS;

    if (config.eraFilter && selectedSpecs.length === 0) {
        throw new Error(`Unknown era "${config.eraFilter}". Expected one of: ${ERA_SPECS.map(s => s.era).join(", ")}`);
    }

    for (const [index, spec] of selectedSpecs.entries()) {
        const seedBaseRaw = process.env.STABLE_AUDIO_SEED_BASE;
        const seedBase = seedBaseRaw ? Number(seedBaseRaw) : null;
        const input = {
            ...DEFAULT_MODEL_INPUT,
            prompt: `${spec.prompt} ${GLOBAL_PROMPT_CONSTRAINTS}`,
            negative_prompt: config.negativePrompt,
            seconds_start: 0,
            seconds_total: config.durationSeconds,
            ...(seedBase !== null && Number.isFinite(seedBase) ? { seed: seedBase + index } : {}),
            ...config.inputPatch,
        };

        const filePath = path.join(absoluteOutputDir, spec.fileName);
        console.log(`[era-music] ${spec.era}: ${config.dryRun ? "dry-run" : "generating"} -> ${filePath}`);

        if (config.dryRun) {
            manifest.push({
                era: spec.era,
                fileName: spec.fileName,
                prompt: spec.prompt,
                input,
                outputUrl: null,
            });
            continue;
        }

        try {
            const prediction = await createPrediction(config, input);
            const completed = await pollPrediction(config, prediction.id);
            const outputUrl = extractOutputUrl(completed.output);
            if (!outputUrl) {
                throw new Error(`Prediction completed without output URL for ${spec.era}.`);
            }

            await downloadToFileWithRetry(config, outputUrl, filePath);
            const trimResult = await trimPcmWavInPlace(filePath, config.durationSeconds);
            if (trimResult.trimmed) {
                console.log(
                    `[era-music] ${spec.era}: trimmed ${trimResult.beforeSeconds.toFixed(2)}s -> ${trimResult.afterSeconds.toFixed(2)}s`,
                );
            }
            manifest.push({
                era: spec.era,
                fileName: spec.fileName,
                prompt: spec.prompt,
                input,
                outputUrl,
            });
            console.log(`[era-music] ${spec.era}: saved ${spec.fileName}`);
        } catch (error) {
            failures += 1;
            console.error(`[era-music] ${spec.era}: failed`, error);
            const status = getErrorStatus(error);
            if (status === 402) {
                console.error("[era-music] stopping early: Replicate account has insufficient credit. Add billing credit and retry.");
                break;
            }
        }
    }

    const manifestPath = path.join(absoluteOutputDir, "era-music-manifest.json");
    await writeFile(manifestPath, JSON.stringify(manifest, null, 4), "utf8");
    console.log(`[era-music] manifest written: ${manifestPath}`);

    if (failures > 0) {
        process.exitCode = 1;
        console.error(`[era-music] completed with ${failures} failure(s).`);
    } else {
        console.log("[era-music] completed successfully.");
    }
}

run().catch(error => {
    console.error("[era-music] fatal error:", error);
    process.exitCode = 1;
});
