# Personal Website

Simple personal website, built with the vanilla-ts vite starter. Design is heavily inspired by [paco.me](https://paco.me/).

<img width="1367" alt="image" src="https://github.com/user-attachments/assets/1f446395-3413-4c54-829a-43982f69ecfa">

## Gallery Sync

The gallery export script uses the official Krea assets API and writes the result to [src/assets/gallery.json](src/assets/gallery.json).

Before running it:

1. Create a Krea API token in your workspace settings.
2. Export it as `KREA_API_TOKEN`.
3. Update the curated asset list in [helpers/scripts/gallery-curated-assets.ts](helpers/scripts/gallery-curated-assets.ts).

To update the curated asset list, open `https://www.krea.ai/assets`, open browser DevTools, inspect the `/api/assets/folders` network request, and copy the `asset_ids` from the `Gallery` folder response into [helpers/scripts/gallery-curated-assets.ts](helpers/scripts/gallery-curated-assets.ts).

Run the sync with:

```sh
KREA_API_TOKEN=your_token bun run gallery
```

The script asks you to confirm that the curated asset list is up to date before it makes API requests. If you want to skip that prompt, run:

```sh
KREA_API_TOKEN=your_token bun run gallery --yes
```

The script keeps the existing thumbhash cache in `.cache/thumbhash-cache.json` so reruns only generate thumbhashes for new assets.
