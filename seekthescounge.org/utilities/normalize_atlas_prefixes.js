#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const srcDir = path.join(repoRoot, "src");
const args = process.argv.slice(2);
const checkOnly = args.includes("--check");

function collectFiles(dir, predicate, acc = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            collectFiles(fullPath, predicate, acc);
        } else if (predicate(fullPath)) {
            acc.push(fullPath);
        }
    }
    return acc;
}

function stripQuery(filePath) {
    const index = filePath.indexOf("?");
    return index === -1 ? filePath : filePath.slice(0, index);
}

function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function loadAtlasMap(tsFilePath, atlasMap) {
    const content = fs.readFileSync(tsFilePath, "utf8");
    const loadRegex = /load\.atlas\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']/gms;
    let match;
    while ((match = loadRegex.exec(content)) !== null) {
        const [, key, , jsonRelative] = match;
        const normalizedRelative = stripQuery(jsonRelative);
        const jsonAbsolute = path.resolve(path.dirname(tsFilePath), normalizedRelative);
        const relativeFromRoot = path.relative(repoRoot, jsonAbsolute);
        atlasMap.set(key, {
            key,
            jsonAbsolute,
            jsonRelative: relativeFromRoot,
            sourceFile: tsFilePath,
        });
    }
}

function normalizeAtlasJson(atlasInfo) {
    if (!fs.existsSync(atlasInfo.jsonAbsolute)) {
        console.warn(`Warning: JSON file not found for atlas "${atlasInfo.key}" at ${atlasInfo.jsonRelative}`);
        return { changed: false, skipped: true };
    }

    const raw = fs.readFileSync(atlasInfo.jsonAbsolute, "utf8");
    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch (error) {
        console.warn(`Warning: Could not parse JSON for atlas "${atlasInfo.key}" (${atlasInfo.jsonRelative}): ${error}`);
        return { changed: false, skipped: true };
    }

    const frames = parsed.frames;
    if (!Array.isArray(frames)) {
        console.warn(
            `Warning: Expected frames array in ${atlasInfo.jsonRelative} for atlas "${atlasInfo.key}"; skipping.`,
        );
        return { changed: false, skipped: true };
    }

    const desiredImageName = `${atlasInfo.key}.png`;
    let jsonChanged = false;

    frames.forEach((frame, index) => {
        if (!frame || typeof frame !== "object") {
            return;
        }
        const desiredFilename = `${atlasInfo.key}-${index}.aseprite`;
        if (frame.filename !== desiredFilename) {
            if (!checkOnly) {
                frame.filename = desiredFilename;
            }
            jsonChanged = true;
        }
    });

    if (!parsed.meta || typeof parsed.meta !== "object") {
        parsed.meta = {};
    }

    if (parsed.meta.image !== desiredImageName) {
        if (!checkOnly) {
            parsed.meta.image = desiredImageName;
        }
        jsonChanged = true;
    }

    if (jsonChanged && !checkOnly) {
        const formatted = JSON.stringify(parsed, null, 2) + "\n";
        fs.writeFileSync(atlasInfo.jsonAbsolute, formatted, "utf8");
    }

    return { changed: jsonChanged, skipped: false };
}

function normalizePrefixes(tsFilePath, atlasMap) {
    const content = fs.readFileSync(tsFilePath, "utf8");
    const regex = /generateFrameNames\(\s*["']([^"']+)["']\s*,\s*\{[^}]*?prefix:\s*(["'])([^"']*?)\2/gs;
    let updated = content;
    let match;
    let fileChanged = false;

    while ((match = regex.exec(content)) !== null) {
        const [fullMatch, key, quote, currentPrefix] = match;
        const atlasInfo = atlasMap.get(key);
        if (!atlasInfo) {
            continue;
        }
        const desiredPrefix = `${key}-`;
        if (currentPrefix === desiredPrefix) {
            continue;
        }
        const prefixPattern = new RegExp(`(prefix:\\s*)${quote}${escapeRegExp(currentPrefix)}${quote}`);
        const replacement = `$1${quote}${desiredPrefix}${quote}`;
        const newSegment = fullMatch.replace(prefixPattern, replacement);
        if (newSegment !== fullMatch) {
            updated = updated.replace(fullMatch, newSegment);
            fileChanged = true;
        }
    }

    if (fileChanged && !checkOnly) {
        fs.writeFileSync(tsFilePath, updated, "utf8");
    }

    return fileChanged;
}

function main() {
    if (!fs.existsSync(srcDir)) {
        console.error(`Could not locate src directory at ${srcDir}`);
        process.exit(1);
    }

    const atlasMap = new Map();
    const tsFiles = collectFiles(srcDir, (file) => file.endsWith(".ts"));
    tsFiles.forEach((file) => loadAtlasMap(file, atlasMap));

    if (atlasMap.size === 0) {
        console.log("No atlases found; nothing to do.");
        return;
    }

    const jsonChanges = [];
    const tsChanges = [];

    atlasMap.forEach((info) => {
        const { changed, skipped } = normalizeAtlasJson(info);
        if (changed) {
            jsonChanges.push(info.jsonRelative);
        } else if (!skipped && checkOnly) {
            // Check mode: even unchanged files should be noted if they were examined
        }
    });

    tsFiles.forEach((file) => {
        const changed = normalizePrefixes(file, atlasMap);
        if (changed) {
            tsChanges.push(path.relative(repoRoot, file));
        }
    });

    if (checkOnly) {
        if (jsonChanges.length === 0 && tsChanges.length === 0) {
            console.log("All atlas prefixes already normalized.");
            return;
        }
        console.error("Atlas normalization required in the following files:");
        jsonChanges.forEach((file) => console.error(`  - JSON: ${file}`));
        tsChanges.forEach((file) => console.error(`  - TS: ${file}`));
        process.exit(1);
    }

    if (jsonChanges.length === 0 && tsChanges.length === 0) {
        console.log("Atlas prefixes already normalized.");
        return;
    }

    if (jsonChanges.length > 0) {
        console.log("Updated JSON atlases:");
        jsonChanges.forEach((file) => console.log(`  - ${file}`));
    }

    if (tsChanges.length > 0) {
        console.log("Updated TypeScript files:");
        tsChanges.forEach((file) => console.log(`  - ${file}`));
    }
}

main();

