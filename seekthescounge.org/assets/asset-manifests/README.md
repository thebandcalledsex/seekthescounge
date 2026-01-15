# Asset Manifests

This folder holds YAML manifests that drive asset loading for the game scene.
The game reads `index.yaml` first, then loads every manifest listed there.

## Add a new asset to an existing manifest

1. Open the relevant YAML file (for example `entities/shuey.yaml`).
2. Add an entry under `assets:`.
   - `assets` can be a flat array or a grouped map of arrays.

Example (flat):

```yaml
assets:
  - type: atlas
    key: "new-anim"
    texture: "../../assets/entities/thing/new-anim.png"
    atlas: "../../assets/entities/thing/new-anim.json"
```

Example (grouped):

```yaml
assets:
  attacking:
    - type: atlas
      key: "new-attack"
      texture: "../../assets/entities/thing/new-attack.png"
      atlas: "../../assets/entities/thing/new-attack.json"
```

## Add a new manifest (new entity or bundle)

1. Create a new YAML file under this folder (or `entities/`).
2. Add its path to `index.yaml`.

```yaml
manifests:
  - "../../assets/asset-manifests/entities/new-entity.yaml"
```

## Supported asset types

- `image`: `key`, `url`
- `atlas`: `key`, `texture`, `atlas`
- `tilemapTiledJSON`: `key`, `url`
- `json`: `key`, `url`

Notes:
- Keys must be unique across all manifests.
- Use the same relative paths you would pass to Phaser loaders.
