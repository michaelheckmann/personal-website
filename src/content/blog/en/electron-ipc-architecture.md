---
title: "Type-safe IPC in Electron"
description: "I show how to build a type-safe IPC layer in Electron using typed IPC wrappers. You'll see how types flow from handlers to the renderer, how I register handlers safely, and what trade-offs this structure introduces."
pubDate: "Dec 04 2025"
cover: "../assets/electron-ipc-architecture/hero.webp"
coverAlt: "Aerial view of terraced hills at dawn with sunlight beams breaking through clouds and casting dramatic light and shadow across the stepped fields."
colors: ["#768176", "#3C729C"]
tags: ["Orbit", "Development", "Electron"]
reference: "electron-ipc-architecture"
---

# Type-safe IPC in Electron

I'm a big fan of TypeScript and the safety it provides. It's used throughout [Orbit](https://reachorbit.app/). The problem is that Electron's IPC channel names and arguments aren't typed by default. I needed that same safety across the process boundary as well. I don't trust myself to keep stringly-typed channel names and untyped arguments in sync between the main and renderer processes as the app grows.

I've already previewed this solution in a previous [post](/en/blog/pragmatic-electron-architecture/). This is the full implementation.

## Typed IPC classes

I found [alex8088's typed-ipc](https://github.com/alex8088/electron-toolkit/tree/master/packages/typed-ipc) in the electron-toolkit repository. It provides typed wrappers around Electron's raw IPC methods. Since it's only a few hundred lines of TypeScript, I vendored the code into my repository and adapted it slightly to fit my needs.

The core idea is pretty straightforward: instead of `ipcMain.handle("channel", handler)` with an untyped string, you get a generic class that constrains channels to keys of a type map you define.

Here's the main process listener class:

```ts
// ipc-main-types.ts

import { ipcMain } from "electron";

export type IpcListenEventMap = {
  [key: string]: [...args: any[]];
};

export type IpcHandleEventMap = {
  [key: string]: (...args: any[]) => any;
};

export type IpcEventMap = IpcListenEventMap | IpcHandleEventMap;

export type ExtractArgs<T> = T extends IpcListenEventMap ? T : never;
export type ExtractHandler<T> = T extends IpcHandleEventMap ? T : never;

export class IpcListener<T extends IpcEventMap> {
  private listeners: string[] = [];
  private handlers: string[] = [];

  on<E extends keyof ExtractArgs<T>>(
    channel: Extract<E, string>,
    listener: (
      e: Electron.IpcMainEvent,
      ...args: ExtractArgs<T>[E]
    ) => void | Promise<void>,
  ): void {
    this.listeners.push(channel);
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
  ): void {
    this.handlers.push(channel);
    ipcMain.handle(channel, listener as any);
  }

  dispose(): void {
    this.listeners.forEach((c) => ipcMain.removeAllListeners(c));
    this.listeners = [];
    this.handlers.forEach((c) => ipcMain.removeHandler(c));
    this.handlers = [];
  }
}

export class IpcEmitter<T extends IpcListenEventMap> {
  send<E extends keyof T>(
    sender: Electron.WebContents,
    channel: Extract<E, string>,
    ...args: T[E]
  ): void {
    sender.send(channel, ...args);
  }
}
```

And the renderer-side counterpart:

```ts
// ipc-renderer-types.ts

import { ipcRenderer } from "electron";

import type {
  ExtractArgs,
  ExtractHandler,
  IpcEventMap,
  IpcListenEventMap,
} from "./ipc-main-types";

export class IpcEmitter<T extends IpcEventMap> {
  send<E extends keyof ExtractArgs<T>>(
    channel: Extract<E, string>,
    ...args: ExtractArgs<T>[E]
  ): void {
    ipcRenderer.send(channel, ...args);
  }

  invoke<E extends keyof ExtractHandler<T>>(
    channel: Extract<E, string>,
    ...args: Parameters<ExtractHandler<T>[E]>
  ): Promise<ReturnType<ExtractHandler<T>[E]>> {
    return ipcRenderer.invoke(channel, ...args);
  }
}

export class IpcListener<T extends IpcListenEventMap> {
  on<E extends keyof T>(
    channel: Extract<E, string>,
    listener: (e: Electron.IpcRendererEvent, ...args: T[E]) => void,
  ): () => void {
    ipcRenderer.on(channel, listener as any);
    return () => ipcRenderer.removeListener(channel, listener as any);
  }

  once<E extends keyof T>(
    channel: Extract<E, string>,
    listener: (
      e: Electron.IpcRendererEvent,
      ...args: T[E]
    ) => void | Promise<void>,
  ): () => void {
    ipcRenderer.once(channel, listener as any);
    return () => ipcRenderer.removeListener(channel, listener as any);
  }
}
```

These classes are the typed foundation. I know, the code is a bit verbose and not super easy to follow, but it provides a lot of ergonomics when building an Electron app with many IPC channels.

Now that we have these foundational classes, let's look at how they are instantiated and used.

```ts
// ipc/index.ts

import type { BrowserWindow } from "electron";

import * as main from "./ipc-main-types";
import * as renderer from "./ipc-renderer-types";

// ... type imports from domains ...

type IpcHandlers = AuthIpcHandlers &
  DatabaseIpcHandlers &
  SystemIpcHandlers &
  UiIpcHandlers;

type IpcListeners = AuthIpcListeners &
  DatabaseIpcListeners &
  SystemIpcListeners &
  UiIpcListeners;

export type IpcEvents =
  | {
      [K in keyof IpcHandlers]: ResolvedAsyncFunction<IpcHandlers[K]>;
    }
  | {
      [K in keyof IpcListeners]: Parameters<IpcListeners[K]>;
    };

type MainToRendererEvents = AuthMainToRendererEvents &
  DatabaseMainToRendererEvents &
  SystemMainToRendererEvents &
  UiMainToRendererEvents;

export type IpcRendererEvent = {
  [K in keyof MainToRendererEvents]: [MainToRendererEvents[K]];
};

// Instantiate the typed classes
const ipcMain = new main.IpcListener<IpcEvents>();
const emitterMain = new main.IpcEmitter<IpcRendererEvent>();
const ipcRenderer = new renderer.IpcListener<IpcRendererEvent>();
const emitterRenderer = new renderer.IpcEmitter<IpcEvents>();
```

The `IpcEvents` type combines all IPC handlers and listeners from different domains into a single type map. This map is then used to instantiate the typed IPC classes.

I also built a layer of helpers on top of these classes to make the intent of each IPC call clearer.

## Helper functions

I created wrapper functions that make the direction of communication obvious:

```ts
// ipc/index.ts

/**
 * Register a handler on main that responds to renderer requests
 */
export const handleRendererRequest =
  <E extends keyof ExtractHandler<IpcEvents>>(
    channel: Extract<E, string>,
    listener: (
      ...args: Parameters<ExtractHandler<IpcEvents>[E]>
    ) =>
      | ReturnType<ExtractHandler<IpcEvents>[E]>
      | Promise<ReturnType<ExtractHandler<IpcEvents>[E]>>,
  ) =>
  () => {
    ipcMain.handle(channel, (_, ...args) => listener(...args));
  };

/**
 * Create a function that sends a request from renderer to main
 */
export const requestMain = <E extends keyof ExtractHandler<IpcEvents>>(
  channel: Extract<E, string>,
) => {
  return (...args: Parameters<ExtractHandler<IpcEvents>[E]>) => {
    return emitterRenderer.invoke(channel, ...args);
  };
};

/**
 * Register a listener on renderer for one-way events from main
 */
export const onMainEvent =
  <E extends keyof IpcRendererEvent>(channel: Extract<E, string>) =>
  (listener: (...args: IpcRendererEvent[E]) => void) => {
    return ipcRenderer.on(channel, (_, ...args) => listener(...args));
  };

/**
 * Send a one-way event from main to renderer
 */
export const sendToRenderer = <E extends keyof IpcRendererEvent>(
  window: BrowserWindow | undefined | null,
  channel: Extract<E, string>,
  ...args: IpcRendererEvent[E]
) => {
  if (window) {
    emitterMain.send(window.webContents, channel, ...args);
  }
};

/**
 * Register a listener on main for one-way events from renderer
 */
export const onRendererEvent =
  <E extends keyof ExtractArgs<IpcEvents>>(
    channel: Extract<E, string>,
    listener: (...args: ExtractArgs<IpcEvents>[E]) => void | Promise<void>,
  ) =>
  () => {
    ipcMain.on(channel, (_, ...args) => listener(...args));
  };

/**
 * Create a function that sends a one-way event from renderer to main
 */
export const sendToMain =
  <E extends keyof ExtractArgs<IpcEvents>>(channel: Extract<E, string>) =>
  (...args: ExtractArgs<IpcEvents>[E]) => {
    return emitterRenderer.send(channel, ...args);
  };

export const disposeMain = () => {
  ipcMain.dispose();
};
```

The naming makes the data flow more explicit:

| Helper                                  | Direction                  | Pattern                            |
| --------------------------------------- | -------------------------- | ---------------------------------- |
| `handleRendererRequest` / `requestMain` | Renderer → Main → Renderer | Request-response, like an RPC call |
| `sendToMain` / `onRendererEvent`        | Renderer → Main            | Fire-and-forget                    |
| `sendToRenderer` / `onMainEvent`        | Main → Renderer            | Push notifications                 |

I also strip the `event` parameter in these helpers. I haven't needed it yet and removing it simplifies handler signatures.

## Domain organization

I group IPC by domain: `auth`, `database`, `system` and `ui`. The boundaries aren't rigid and will likely change.

Each domain exports three things:

1. **Type maps** for handlers, listeners, and main-to-renderer events
2. **An API object** consumed by the preload script
3. **Registration functions** that wire up handlers at app startup

Here's an excerpt from the `ui` domain:

```ts
// ipc/ui/index.ts

import { onMainEvent, requestMain, sendToMain } from "..";
import type { ListenCloseWindow } from "./close-window";
import type { HandleCreateWindow } from "./create-window";
import type { WindowChangedOptions } from "./on-window-changed";
import type { ListenOpenUrl } from "./open-url";

export const registerUiHandlers = async () => {
  const registerCalls = await Promise.all([import("./create-window")]);
  registerCalls.forEach((mod) => mod.default());
};

export const registerUiListeners = async () => {
  const registerCalls = await Promise.all([
    import("./close-window"),
    import("./open-url"),
  ]);
  registerCalls.forEach((mod) => mod.default());
};

export const uiApi = {
  createWindow: requestMain("createWindow"),
  closeWindow: sendToMain("closeWindow"),
  openUrl: sendToMain("openUrl"),
  onWindowChanged: onMainEvent("windowChanged"),
};

export type UiIpcHandlers = {
  createWindow: HandleCreateWindow;
};

export type UiIpcListeners = {
  closeWindow: ListenCloseWindow;
  openUrl: ListenOpenUrl;
};

export type UiMainToRendererEvents = {
  windowChanged: WindowChangedOptions;
};
```

Each handler file exports a type derived from its implementation function. The domain's `index.ts` imports these types and combines them into maps. Those maps feed into the central `IpcEvents` type. This creates a chain of types from the handler implementation to IPC registration to renderer API.

## A complete round trip: `openUrl`

Let's trace a call from renderer to main.

**The handler in main:**

```ts
// ipc/ui/open-url.ts

import { execSync } from "node:child_process";

import { onRendererEvent } from "..";
import { ctx } from "../../context";

type OpenUrlParams = { url: string };

const listenOpenUrl = (options: OpenUrlParams) => {
  execSync(`open "${options.url}"`, { stdio: "ignore" });
};

export type ListenOpenUrl = typeof listenOpenUrl;
export default onRendererEvent("openUrl", listenOpenUrl);
```

The type `ListenOpenUrl` is derived directly from the function. When I change the function signature, the type changes automatically.

**The preload wiring:**

```ts
// preload.ts

import { contextBridge } from "electron";

import { authApi } from "./auth";
import { databaseApi } from "./database";
import { systemApi } from "./system";
import { uiApi } from "./ui";

export type ElectronApi = typeof electronApi;
const electronApi = {
  ...authApi,
  ...databaseApi,
  ...systemApi,
  ...uiApi,
};

contextBridge.exposeInMainWorld("electronApi", electronApi);
```

**The global type declaration:**

```ts
// global.d.ts

declare global {
  interface Window {
    electronApi: ElectronApi;
  }
}
```

**The React component:**

```tsx
// OpenUrl.tsx

export const OpenUrl = () => {
  const openUrl = () => {
    window.electronApi.openUrl({ url: "https://example.com" });
  };

  return (
    <button type="button" onClick={openUrl}>
      Open URL
    </button>
  );
};
```

When I type `window.electronApi.openUrl(`, my editor shows me exactly what arguments it expects: `{ url: string; }`. The type simply flows from the handler's parameter type through the entire chain.

## Subscribing to main events

For events pushed from main to renderer, the pattern uses a cleanup function:

```tsx
useEffect(() => {
  const unsub = window.electronApi.onSignInDeepLink(async ({ isSuccess }) => {
    if (isSuccess) {
      return onSuccess();
    }
    showError("Failed to confirm sign in");
  });
  return unsub;
}, [onSuccess, showError]);
```

The `onMainEvent` helper returns an unsubscribe function which is then called by React's `useEffect` cleanup. The types for the callback payload come from the `MainToRendererEvents` map.

## Registering the handlers

Early on, I just registered the handlers directly:

```ts
export const registerAuthHandlers = () => {
  getUser();
  signIn();
  signOut();
};
```

However, this did not work. I got this error in the renderer's dev console `Error: module not found: stream`.

It seemed like my build tool (Vite with [vite-plugin-electron](https://github.com/electron-vite/vite-plugin-electron)) was bundling handler modules that imported Node APIs into the preload script. This led to the runtime error I saw in the renderer.

To fix this, I switched to dynamic imports. Registration functions now import handler modules at runtime, after the main process is running:

```ts
export const registerAuthHandlers = async () => {
  const registerCalls = await Promise.all([
    import("./get-user"),
    import("./sign-in"),
    import("./sign-out"),
  ]);
  registerCalls.forEach((mod) => mod.default());
};
```

Each handler module exports a default function (the result of calling `handleRendererRequest` or `onRendererEvent`).

## App lifecycle

Registration happens once, during app startup:

```ts
// app.ts

import { disposeMain } from "./core/ipc";
import { registerIpcHandlers, registerIpcListeners } from "./core/ipc/register";

app.whenReady().then(async () => {
  await registerIpcHandlers();
  await registerIpcListeners();
  // ... rest of app initialization
});

app.on("before-quit", async (event) => {
  // ... cleanup
  disposeMain();
  // ...
});
```

The registration module is simple:

```ts
// ipc/register.ts

import { registerAuthHandlers, registerAuthListeners } from "./auth";
import {
  registerDatabaseHandlers,
  registerDatabaseListeners,
} from "./database";
import { registerSystemHandlers, registerSystemListeners } from "./system";
import { registerUiHandlers, registerUiListeners } from "./ui";

export const registerIpcHandlers = () =>
  Promise.all([
    registerAuthHandlers(),
    registerDatabaseHandlers(),
    registerSystemHandlers(),
    registerUiHandlers(),
  ]);

export const registerIpcListeners = () =>
  Promise.all([
    registerAuthListeners(),
    registerDatabaseListeners(),
    registerSystemListeners(),
    registerUiListeners(),
  ]);
```

## Benefits and trade-offs

When I rename a handler function or change its parameters, TypeScript flags every call site across both processes. When I add a new IPC channel, autocomplete shows me the available channels based on my type maps.

The boilerplate is real though: a handler file, a type export, an entry in the domain's type maps, an entry in the API object. But each piece is small, and the type system connects them. So I'll take that trade-off over silent failures from mistyped channel strings.

What's your approach to IPC in Electron? I'd love to hear about it! Feel free to reach out on X: [@mt_heckmann](https://x.com/mt_heckmann).
