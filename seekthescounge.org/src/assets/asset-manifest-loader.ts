import Phaser from "phaser";
import yaml from "js-yaml";

export type AssetManifestSource = {
    key: string;
    url: string;
};

type AssetManifestType = "image" | "atlas" | "tilemapTiledJSON" | "json";

type BaseAssetManifestEntry = {
    type: AssetManifestType;
    key: string;
};

type ImageAssetManifestEntry = BaseAssetManifestEntry & {
    type: "image";
    url: string;
};

type AtlasAssetManifestEntry = BaseAssetManifestEntry & {
    type: "atlas";
    texture: string;
    atlas: string;
};

type TilemapAssetManifestEntry = BaseAssetManifestEntry & {
    type: "tilemapTiledJSON";
    url: string;
};

type JsonAssetManifestEntry = BaseAssetManifestEntry & {
    type: "json";
    url: string;
};

type AssetManifestEntry =
    | ImageAssetManifestEntry
    | AtlasAssetManifestEntry
    | TilemapAssetManifestEntry
    | JsonAssetManifestEntry;

type AssetManifest = {
    assets: AssetManifestEntry[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const requireString = (value: unknown, label: string, source: string, index: number): string => {
    if (typeof value === "string" && value.trim().length > 0) {
        return value;
    }

    throw new Error(
        `Asset manifest '${source}' entry ${index} is missing a valid '${label}' string.`,
    );
};

const parseAssetManifestEntry = (
    value: unknown,
    source: string,
    index: number,
): AssetManifestEntry => {
    if (!isRecord(value)) {
        throw new Error(`Asset manifest '${source}' entry ${index} must be an object.`);
    }

    const type = requireString(value.type, "type", source, index) as AssetManifestType;
    const key = requireString(value.key, "key", source, index);

    switch (type) {
        case "image":
            return { type, key, url: requireString(value.url, "url", source, index) };
        case "atlas":
            return {
                type,
                key,
                texture: requireString(value.texture, "texture", source, index),
                atlas: requireString(value.atlas, "atlas", source, index),
            };
        case "tilemapTiledJSON":
            return { type, key, url: requireString(value.url, "url", source, index) };
        case "json":
            return { type, key, url: requireString(value.url, "url", source, index) };
        default:
            throw new Error(
                `Asset manifest '${source}' entry ${index} has unsupported type '${type}'.`,
            );
    }
};

const parseAssetManifestAssets = (assets: unknown, source: string): AssetManifestEntry[] => {
    if (Array.isArray(assets)) {
        return assets.map((asset, index) => parseAssetManifestEntry(asset, source, index));
    }

    if (isRecord(assets)) {
        const entries: AssetManifestEntry[] = [];
        Object.values(assets).forEach((group, groupIndex) => {
            if (!Array.isArray(group)) {
                throw new Error(`Asset manifest '${source}' group ${groupIndex} must be an array.`);
            }
            group.forEach((asset, assetIndex) => {
                entries.push(parseAssetManifestEntry(asset, source, assetIndex));
            });
        });
        return entries;
    }

    throw new Error(`Asset manifest '${source}' must include an 'assets' array or map.`);
};

const parseAssetManifest = (text: string, source: string): AssetManifest => {
    const parsed = yaml.load(text);
    if (!isRecord(parsed)) {
        throw new Error(`Asset manifest '${source}' must be a YAML object.`);
    }

    return {
        assets: parseAssetManifestAssets(parsed.assets, source),
    };
};

const manifestKeyFromUrl = (url: string): string => {
    const normalized = url.replace(/[^a-zA-Z0-9_-]/g, "-");
    return `asset-manifest-${normalized}`;
};

const parseAssetManifestIndex = (text: string, source: string): AssetManifestSource[] => {
    const parsed = yaml.load(text);
    if (!isRecord(parsed)) {
        throw new Error(`Asset manifest index '${source}' must be a YAML object.`);
    }

    const manifests = parsed.manifests;
    if (!Array.isArray(manifests)) {
        throw new Error(`Asset manifest index '${source}' must include a 'manifests' array.`);
    }

    return manifests.map((entry, index) => {
        if (typeof entry === "string") {
            return { key: manifestKeyFromUrl(entry), url: entry };
        }
        if (!isRecord(entry)) {
            throw new Error(
                `Asset manifest index '${source}' entry ${index} must be a string or map.`,
            );
        }
        const url = requireString(entry.url, "url", source, index);
        const key = typeof entry.key === "string" && entry.key.length > 0 ? entry.key : undefined;
        return { key: key ?? manifestKeyFromUrl(url), url };
    });
};

const queueAsset = (scene: Phaser.Scene, asset: AssetManifestEntry): void => {
    switch (asset.type) {
        case "image":
            scene.load.image(asset.key, asset.url);
            return;
        case "atlas":
            scene.load.atlas(asset.key, asset.texture, asset.atlas);
            return;
        case "tilemapTiledJSON":
            scene.load.tilemapTiledJSON(asset.key, asset.url);
            return;
        case "json":
            scene.load.json(asset.key, asset.url);
            return;
    }
};

export const queueAssetManifests = (
    scene: Phaser.Scene,
    manifests: AssetManifestSource[],
): void => {
    manifests.forEach((manifest) => {
        if (scene.cache.text.exists(manifest.key)) {
            return;
        }
        scene.load.text(manifest.key, manifest.url);
    });
};

export const queueAssetManifestIndex = (
    scene: Phaser.Scene,
    indexSource: AssetManifestSource,
): void => {
    if (scene.cache.text.exists(indexSource.key)) {
        return;
    }
    scene.load.text(indexSource.key, indexSource.url);
};

export const getAssetManifestSourcesFromIndexCache = (
    scene: Phaser.Scene,
    indexSource: AssetManifestSource,
): AssetManifestSource[] => {
    const text = scene.cache.text.get(indexSource.key);
    if (typeof text !== "string") {
        throw new Error(
            `Asset manifest index '${indexSource.url}' (key '${indexSource.key}') was not loaded.`,
        );
    }

    return parseAssetManifestIndex(text, indexSource.url);
};

export const queueAssetsFromManifestCache = (
    scene: Phaser.Scene,
    manifests: AssetManifestSource[],
): void => {
    const seenKeys = new Set<string>();

    manifests.forEach((manifest) => {
        const text = scene.cache.text.get(manifest.key);
        if (typeof text !== "string") {
            throw new Error(
                `Asset manifest '${manifest.url}' (key '${manifest.key}') was not loaded.`,
            );
        }

        const parsed = parseAssetManifest(text, manifest.url);
        parsed.assets.forEach((asset) => {
            if (seenKeys.has(asset.key)) {
                console.warn(
                    `Duplicate asset key '${asset.key}' in manifest '${manifest.url}'. Skipping.`,
                );
                return;
            }
            seenKeys.add(asset.key);
            queueAsset(scene, asset);
        });
    });
};
