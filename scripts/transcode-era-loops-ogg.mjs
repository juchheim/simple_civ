#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";

const ERA_FILES = [
    { era: "Primitive", baseName: "primitive-loop" },
    { era: "Hearth", baseName: "hearth-loop" },
    { era: "Banner", baseName: "banner-loop" },
    { era: "Engine", baseName: "engine-loop" },
    { era: "Aether", baseName: "aether-loop" },
];

function parseCliValue(prefix) {
    const arg = process.argv.find(entry => entry.startsWith(prefix));
    return arg ? arg.slice(prefix.length) : "";
}

function selectEraFiles(eraFilter) {
    if (!eraFilter) return ERA_FILES;
    const filtered = ERA_FILES.filter(entry => entry.era.toLowerCase() === eraFilter.toLowerCase());
    if (filtered.length === 0) {
        throw new Error(`Unknown era "${eraFilter}". Expected one of: ${ERA_FILES.map(entry => entry.era).join(", ")}`);
    }
    return filtered;
}

async function run() {
    if (!ffmpegPath) {
        throw new Error("ffmpeg-static binary is unavailable.");
    }

    const eraFilter = parseCliValue("--era=");
    const inputDir = path.resolve(process.cwd(), process.env.ERA_MUSIC_OUTPUT_DIR || "client/public/audio/eras");
    const bitrateKbps = Number(process.env.ERA_MUSIC_OGG_BITRATE_KBPS || "112");
    const selected = selectEraFiles(eraFilter);
    await mkdir(inputDir, { recursive: true });

    let convertedCount = 0;
    for (const item of selected) {
        const wavPath = path.join(inputDir, `${item.baseName}.wav`);
        const oggPath = path.join(inputDir, `${item.baseName}.ogg`);
        if (!existsSync(wavPath)) {
            console.warn(`[music:transcode] ${item.era}: skipped (missing ${wavPath})`);
            continue;
        }

        const args = [
            "-y",
            "-i", wavPath,
            "-vn",
            "-map_metadata", "-1",
            "-c:a", "libopus",
            "-b:a", `${bitrateKbps}k`,
            "-vbr", "on",
            "-compression_level", "10",
            "-frame_duration", "20",
            "-application", "audio",
            oggPath,
        ];

        const proc = spawnSync(ffmpegPath, args, { stdio: "pipe", encoding: "utf8" });
        if (proc.status !== 0) {
            throw new Error(`[music:transcode] ${item.era}: ffmpeg failed\n${proc.stderr || proc.stdout}`);
        }

        convertedCount += 1;
        console.log(`[music:transcode] ${item.era}: wrote ${oggPath}`);
    }

    console.log(`[music:transcode] complete. Converted ${convertedCount} file(s).`);
}

run().catch(error => {
    console.error("[music:transcode] fatal error:", error);
    process.exitCode = 1;
});

