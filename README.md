# Personal Website

Simple personal website, built with the vanilla-ts vite starter. Design is heavily inspired by [paco.me](https://paco.me/).

<img width="1367" alt="image" src="https://github.com/user-attachments/assets/1f446395-3413-4c54-829a-43982f69ecfa">

## Gallery Sync

The gallery export script syncs the `Gallery` folder from the Krea web app and writes the result to [src/assets/gallery.json](src/assets/gallery.json).

The script keeps the frontend contract unchanged and combines three Krea endpoints:

1. `/api/assets/folders` for the ordered asset IDs in the `Gallery` folder.
2. `/api/assets` for image URLs and dimensions.
3. `/api/assets/metadata` for prompts and provider metadata.

If Krea does not return a title for an asset, the script generates one with `gpt-5-mini` using metadata text only. The prompt is primed with real titles that already exist in the gallery, and generated titles are cached so reruns do not spend tokens again unless the metadata changes.

Auth uses your browser cookie, not a Krea API token.

Set these values in `.env` when you need them:

```sh
OPENAI_API_KEY=your_openai_key
KREA_WEB_COOKIE="cookie=value; ..."
```

The easiest flow on macOS is:

1. Open `https://www.krea.ai/assets`.
2. In DevTools, copy any `/api/assets`, `/api/assets/metadata`, or `/api/assets/folders` request as cURL.
3. Run `bun run gallery`.
4. If `KREA_WEB_COOKIE` is not already set, the script will try to extract the cookie from your clipboard and offer to save it to `.env`.

You can also pass auth explicitly:

```sh
bun run gallery --curl "$(pbpaste)"
KREA_WEB_COOKIE="cookie=value; ..." bun run gallery
```

Use `--refresh` to ignore the cached Krea page responses and refetch the data needed for the current Gallery folder.

```sh
bun run gallery --refresh
```

To keep a custom gallery order without hand-maintaining a separate config, edit [src/assets/gallery.json](src/assets/gallery.json) directly while previewing the site, then persist that order for future syncs:

```sh
bun run gallery --persist-order
```

That command snapshots the current item order from [src/assets/gallery.json](src/assets/gallery.json) into [src/assets/gallery-order.json](src/assets/gallery-order.json). Future `bun run gallery` executions apply that saved order first and then append any brand new Krea assets after it.

The script caches raw Krea responses and normalized indexes under `.cache/krea-gallery/`, stores AI titles per workspace in `.cache/krea-gallery/<workspace>/ai-titles.json`, and keeps the thumbhash cache in `.cache/thumbhash-cache.json` so reruns only generate missing work.
