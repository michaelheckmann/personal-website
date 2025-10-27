---
title: "A pragmatic Electron architecture for macOS"
description: "How Orbit for macOS is built: Electron + Swift CLI, narrow typed IPC, encrypted SQLite, Vite/electron-builder. What worked and what didn’t."
pubDate: "Oct 26 2025"
cover: "../assets/pragmatic-electron-architecture/hero.webp"
coverAlt: "Aerial view of terraced hills at dawn with sunlight beams breaking through clouds and casting dramatic light and shadow across the stepped fields."
colors: ["#555F4C", "#543F18"]
tags: ["Orbit", "Development", "Electron"]
reference: "pragmatic-electron-architecture"
---

# A pragmatic Electron architecture for macOS

This is the first post in a series of deep dives into Orbit’s source code. [Orbit](https://reachorbit.app/) is an app that records your Mac's screen activity in the background, letting you instantly search and revisit anything you've seen. Under the hood, Orbit is an Electron app with a native Swift helper that performs continuous screen capture and writes the data to an encrypted local database.

In this first post, I’ll walk through the high-level architecture, highlight a few implementation choices, and offer a practical blueprint you can adapt if you’re building an Electron app with deep macOS integrations.

## Repository layout

A clear repository layout makes it easy to move between web and native code without mental overhead. Orbit uses Yarn for package management and co-locates the native Swift helper with the Electron app.

```
orbit/
├── app/ # The Electron app
├── docs/ # Markdown documentation
├── native/ # Swift CLI app
├── patches/ # npm package patches
└── performance/ # Performance testing utilities
```

Keeping the Swift code next to the app code enforces a clean separation of concerns: native responsibilities (screen capture, system APIs) vs. app responsibilities (UI, orchestration, storage, and search).

In my case, this setup also contains a top-level `package.json` with workspaces configured, so if I want to add new packages (e.g., for shared types), I can do so easily.

## Electron processes and a type-safe IPC surface

Orbit’s IPC design is deliberately narrow. Instead of exposing raw APIs like `ipcRenderer.on` (which the [Electron docs](https://www.electronjs.org/docs/latest/tutorial/security#20-do-not-expose-electron-apis-to-untrusted-web-content) also advise against), the app exposes a small set of well-scoped functions via the preload script. This yields safer boundaries and a more secure application.

```ts
// app/src/main/ipc/preload.ts
import { contextBridge } from "electron";

import { SignIn } from "../handlers/sign-in";
import { emitterRenderer } from "./index";

const authAPI = {
  // Renderer <=> Main
  signIn: (...args: Parameters<SignIn>) => {
    return emitterRenderer.invoke("signIn", ...args);
  },
};

const electronAPI = { ...authAPI };

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
```

I am using a few type-helpers for `ipcMain` and `ipcRenderer` that make registering handlers and emitters ergonomic and safe. These helpers are inspired by [@electron-toolkit/typed-ipc](https://github.com/alex8088/electron-toolkit/tree/master/packages/typed-ipc). I recommend adopting something similar if you’re using Electron with TypeScript and want a safer IPC boundary.

```ts
// app/src/main/utils/ipc-main-types.ts
export class IpcListener<T extends IpcEventMap> {
  on<E extends keyof ExtractArgs<T>>(
    channel: Extract<E, string>,
    listener: (e: Electron.IpcMainEvent, ...args: ExtractArgs<T>[E]) => void,
  ) {
    ipcMain.on(channel, listener as any);
  }

  handle<E extends keyof ExtractHandler<T>>(
    channel: Extract<E, string>,
    listener: (
      e: Electron.IpcMainInvokeEvent,
      ...args: Parameters<ExtractHandler<T>[E]>
    ) =>
      | ReturnType<ExtractHandler<T>[E]>
      | Promise<ReturnType<ExtractHandler<T>[E]>>,
  ) {
    ipcMain.handle(channel, listener as any);
  }
}
```

With these helpers, I can define all my types in one place and pass them as generics into the custom listener and emitter classes.

```ts
// app/src/main/ipc/index.ts
export type IpcEvents =
  // Renderer => Main
  | {
      openUrl: [OpenUrlParams];
      closeWindow: [CloseWindowParams];
    }
  // Renderer <=> Main
  | {
      signIn: ResolvedAsyncFunction<SignIn>;
      getFrames: ResolvedAsyncFunction<GetFrames>;
      searchFramesByContent: ResolvedAsyncFunction<SearchFramesByContent>;
      // ...more typed channels
    };

export type IpcRendererEvent = {
  progressChanged: [params: ProgressChangedParams];
  updateAvailable: [];
};

export const ipcMain = new main.IpcListener<IpcEvents>();
export const emitterMain = new main.IpcEmitter<IpcRendererEvent>();
export const ipcRenderer = new renderer.IpcListener<IpcRendererEvent>();
export const emitterRenderer = new renderer.IpcEmitter<IpcEvents>();
```

## Native macOS integration via a Swift CLI

Orbit uses a separate Swift CLI to interact with the operating system. The Electron app spawns this helper and manages its lifecycle.

Binaries are bundled inside the app and resolved at runtime using a single helper:

```ts
// app/src/main/utils/paths.ts
import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

export const getBinPath = (binName: "orbit") => {
  if (!app.isPackaged) {
    const binPath = path.join(process.env.APP_ROOT, "bin", binName);
    if (!fs.existsSync(binPath)) throw new Error(`${binName} bin not found`);
    return binPath;
  }
  const appPath = app.getAppPath(); // Orbit.app/Contents/Resources/app.asar
  const contentsPath = path.join(appPath, "..", "..");
  const binPath = path.join(contentsPath, "bin", binName);
  if (!fs.existsSync(binPath)) throw new Error(`${binName} bin not found`);
  return binPath;
};
```

I like this separation because it provides a clean boundary and makes the helper independently testable.

## App paths, user data, and why storage is split

A small but important detail: Orbit separates configuration (userData) from storage (databases and recordings). That makes backups simpler, and if a user wants to inspect the raw files, it’s easier to locate them. I also keep build modes explicit, so dev/test/unsigned/prod never overwrite one another’s data.

```ts
// app/src/main/utils/paths.ts
import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

export const getUserDataPath = () => {
  const appSupport = app.getPath("appData");
  // buildMode: 'production' | 'unsigned' | 'test' | 'dev'
  switch (buildMode) {
    case "production":
      return path.join(appSupport, "com.heckmann.orbit");
    case "unsigned":
      return path.join(appSupport, "@orbit-unsigned");
    case "test":
      return path.join(appSupport, "@orbit-test");
    default:
      return path.join(appSupport, "@orbit-dev");
  }
};

export const getStoragePath = () => {
  const appSupport = app.getPath("appData");
  switch (buildMode) {
    case "production":
      return path.join(appSupport, "com.heckmann.orbit-storage");
    case "unsigned":
      return path.join(appSupport, "@orbit-unsigned", "storage");
    case "test":
      return path.join(appSupport, "@orbit-test", "storage");
    default:
      return path.join(appSupport, "@orbit-dev", "storage");
  }
};
```

## Storage: encrypted SQLite with SQLCipher

Orbit is offline-first. All data lives locally in SQLite, encrypted with SQLCipher. The key is randomly generated on first run and stored in the Keychain. At runtime, the app first retrieves the key and then decrypts and opens the database.
Here’s the core of the database initialization on the Electron side. It uses `better-sqlite3-multiple-ciphers` for SQLCipher support and `kysely` for a typed query layer and migrations.

```ts
// app/src/main/db/index.ts
import Client from "better-sqlite3-multiple-ciphers";
import { Kysely, sql, SqliteDialect } from "kysely";

export const openDatabase = () => {
  const { dbPath, dbEncryptionKey } = getDatabaseStore();
  const client = new Client(dbPath);
  client.pragma(`cipher='sqlcipher'`);
  client.pragma(`legacy=4`);
  client.pragma(`key='${dbEncryptionKey}'`);

  const dialect = new SqliteDialect({ database: client });
  return new Kysely({ dialect });
};

export const setupDatabase = async () => {
  const db = openDatabase();
  await checkHealth();
  await migrateToLatest();
  return db;
};
```

The database encryption key is generated on first run and stored securely using Electron’s `safeStorage` API.

```ts
// app/src/main/lib/store/database.ts
export const getDefaultDatabaseStore = () => {
  const dbPath = path.join(getStoragePath(), "orbit.db");
  let key = generateRandomPassword(32);
  if (!isProduction) key = "123456"; // friendlier dev experience
  return { dbPath, dbEncryptionKey: encryptString(key) };
};

export const getDatabaseStore = () => {
  const { database } = structuredClone(getStore());
  database.dbEncryptionKey = decryptString(database.dbEncryptionKey);
  return database;
};
```

Running the native CLI and the Electron side against the same database required some care. I ended up with [`better-sqlite3-multiple-ciphers`](https://github.com/m4heshd/better-sqlite3-multiple-ciphers) on the Electron side and [`swift-sqlcipher`](https://github.com/skiptools/swift-sqlcipher) on the Swift side.

## Build, packaging, and updates

Orbit uses Vite with [`vite-plugin-electron`](https://github.com/electron-vite/vite-plugin-electron) and `electron-builder` for building, packaging, and publishing. That gives me Hot Module Replacement (HMR) for the UI and automatically restarts the main process on changes.

```ts
// app/vite.config.ts
import electron from "vite-plugin-electron/simple";

export default defineConfig(({ command }) => {
  const isBuild = command === "build";
  return {
    plugins: [
      // ...tailwind, react, etc.
      electron({
        main: {
          entry: "src/main/app.ts",
          vite: {
            build: {
              minify: isBuild,
              outDir: "dist-electron",
              rollupOptions: {
                external: [
                  "better-sqlite3-multiple-ciphers",
                  "electron-updater",
                ],
              },
            },
          },
        },
        preload: {
          input: "src/main/ipc/preload.ts",
        },
        renderer: process.env.NODE_ENV === "test" ? undefined : {},
      }),
    ],
  };
});
```

The plugin has been nice to work with. There are many public repositories using a similar approach, which means there are a lot of examples to learn from.

## What worked well and what to watch out for

The choices that paid off the most are the ones that reduced coupling and ambiguity. The typed IPC layer with a narrow preload surface saved me a lot of time dealing with and reasoning about the communication between the processes.
I really enjoy working with a dedicated binary to interact with the operating system. With the right setup, creating and compiling this binary from a Swift project is straightforward. I appreciate the separation of concerns and having the ability to iterate on and test the native code separately from the Electron app.
The storage stack has been solid and having an SQLite database that I can inspect, move, and delete provides a nice developer experience.
Choosing Vite with the Electron plugin was the right decision. I haven’t encountered problems or obstacles so far.

The tricky parts centered on SQLite interoperability. Getting Swift and Node to agree on encryption took some trial and error. I also noticed that heavy database operations were freezing my app, so I had to introduce dedicated worker threads to offload them. I might do a deep dive on my Node.js worker-threads solution in the near future. Let me know if you’re interested.

If you want to see similar patterns in the wild, the [Onlook app](https://github.com/onlook-dev/desktop/tree/main/apps/studio), [Outerbase Studio app](https://github.com/outerbase/studio-desktop), and [Mullvad’s desktop app](https://github.com/mullvad/mullvadvpn-app/tree/main/desktop/packages/mullvad-vpn) are great reference points.

## A blueprint you can adapt

If you want to build something similar, here are a few suggestions that worked well for me:

- Repo and tooling
  - Yarn for the app’s package management
  - SwiftPM for the Swift project’s package management
  - Co-located folders for the Electron app code and the native Swift code
  - Vite and `vite-plugin-electron` for building
  - `electron-builder` for packaging
- Process model and IPC
  - Strictly typed IPC contracts
  - Single preload bridge
  - Small and explicit preload allowlist, no wildcard invocations
- Data layer
  - SQLite for storage
  - If you need encryption, go for `better-sqlite3-multiple-ciphers` in the Electron app and `swift-sqlcipher` in the native package
  - `kysely` for typed queries and migrations

## Conclusion

This is Orbit’s current architecture. If you’re exploring a similar build, I hope this provides a clear starting point. I’ll follow up with technical posts that dive deeper into the topics covered here.

I’m curious how you’ve tackled similar setups. What’s worked well, and what would you do differently next time? Share your approach or questions with me on X: [mt_heckmann](https://x.com/mt_heckmann).
