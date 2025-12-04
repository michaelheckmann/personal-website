---
title: "Type-safe IPC in Electron"
description: "Ich zeige dir, wie du einen typsicheren IPC-Layer in Electron mit typisierten IPC-Wrappern baust. Wir schauen uns an, wie die Typen von den Handlern bis zum Renderer fließen, wie ich Handler sicher registriere und welche Trade-offs diese Struktur mit sich bringt."
pubDate: "Dec 04 2025"
cover: "../assets/electron-ipc-architecture/hero.webp"
coverAlt: "Aerial view of terraced hills at dawn with sunlight beams breaking through clouds and casting dramatic light and shadow across the stepped fields."
colors: ["#768176", "#3C729C"]
tags: ["Orbit", "Development", "Electron"]
translated: true
reference: "electron-ipc-architecture"
---

# Type-safe IPC in Electron

Ich bin ein großer Fan von TypeScript und der Sicherheit, die es bietet. Es wird überall in [Orbit](https://reachorbit.app/) verwendet. Das Problem ist allerdings, dass Electrons IPC-Channel-Namen und Argumente standardmäßig nicht typisiert sind. Ich brauchte dieselbe Sicherheit aber auch über die Prozessgrenzen hinweg. Ich traue mir selbst nicht zu, „stringly-typed“ Channel-Namen und untypisierte Argumente synchron zu halten, während die App und die Codebasis wachsen.

Ich habe diese Lösung bereits in einem früheren [Post](/en/blog/pragmatic-electron-architecture/) angeteasert. Hier ist nun die vollständige Implementierung.

## Typisierte IPC Klassen

Ich habe [alex8088's typed-ipc](https://github.com/alex8088/electron-toolkit/tree/master/packages/typed-ipc) im electron-toolkit Repository gefunden. Es bietet typisierte Wrapper um die „raw“ IPC-Methoden von Electron. Da es sich nur um ein paar hundert Zeilen TypeScript handelt, habe ich den Code direkt in mein Repository übernommen und leicht an meine Bedürfnisse angepasst.

Die Grundidee ist ziemlich simpel: Statt `ipcMain.handle("channel", handler)` mit einem untypisierten String aufzurufen, erhältst du eine generische Klasse, die Channels auf Keys einer von dir definierten Type Map beschränkt.

Hier ist die Listener-Klasse für den Main Process:

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

Und das Gegenstück auf der Renderer-Seite:

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

Diese Klassen bilden das typisierte Fundament. Ich weiß, der Code ist etwas verbos und nicht super einfach zu lesen, aber er bietet eine Menge Ergonomie beim Bauen einer Electron App mit vielen IPC Channels.

Nachdem wir diese Klassen nun definiert haben, schauen wir uns an, wie sie instanziiert und verwendet werden.

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

Der `IpcEvents` Typ kombiniert alle IPC-Handler und Listener aus verschiedenen Domänen zu einer einzigen type map. Sie wird dann verwendet, um die typisierten IPC-Klassen zu instanziieren.

Ich habe außerdem eine Ebene mit Helper-Funktionen über diese Klassen gelegt, um die Absicht jedes IPC-Calls klarer zu machen.

## Helper Funktionen

Ich habe Wrapper-Funktionen erstellt, die die Kommunikationsrichtung offensichtlich machen:

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

Die Benennung macht den Datenfluss expliziter:

| Helper                                  | Richtung                   | Pattern                            |
| :-------------------------------------- | :------------------------- | :--------------------------------- |
| `handleRendererRequest` / `requestMain` | Renderer → Main → Renderer | Request-Response, wie ein RPC Call |
| `sendToMain` / `onRendererEvent`        | Renderer → Main            | Fire-and-forget                    |
| `sendToRenderer` / `onMainEvent`        | Main → Renderer            | Push Notifications                 |

Ich entferne auch den `event`-Parameter in diesen Helpern. Ich habe ihn bisher nicht gebraucht und das Entfernen vereinfacht die Signaturen der Handler.

## Organisation der Domains

Ich gruppiere IPC nach Domain: `auth`, `database`, `system` und `ui`. Die Grenzen sind nicht starr und werden sich wahrscheinlich im Laufe der Zeit ändern.

Jede Domain exportiert drei Dinge:

1. **Type Maps** für Handler, Listener und Main-to-Renderer Events
2. **Ein API-Objekt**, das vom Preload Script genutzt wird
3. **Registrierungs-Funktionen**, die die Handler beim App-Start verknüpfen (wire up)

Hier ist ein Auszug aus der `ui` Domain:

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

Jede Handler-Datei exportiert einen Typ, der von seiner Implementierungsfunktion abgeleitet ist. Die `index.ts` der Domain importiert diese Typen und kombiniert sie zu Maps. Diese Maps fließen in den zentralen `IpcEvents`-Typ ein. Das erzeugt eine Kette von Typen: von der Handler-Implementierung über die IPC-Registrierung bis hin zur Renderer-API.

## Ein kompletter Round-Trip: `openUrl`

Verfolgen wir mal einen Aufruf vom Renderer zum Main Process.

**Der Handler im Main Process:**

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

Der Typ `ListenOpenUrl` wird direkt von der Funktion abgeleitet. Wenn ich die Funktionssignatur ändere, ändert sich der Typ automatisch.

**Das Preload Wiring:**

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

**Die globale Typ-Deklaration:**

```ts
// global.d.ts

declare global {
  interface Window {
    electronApi: ElectronApi;
  }
}
```

**Die React Komponente:**

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

Wenn ich `window.electronApi.openUrl(` tippe, zeigt mir mein Editor genau an, welche Argumente erwartet werden: `{ url: string; }`. Der Typ fließt einfach vom Parameter-Typ des Handlers durch die gesamte Kette.

## Subscribing zu Main Events

Für Events, die vom Main Process zum Renderer gepusht werden, nutzt das Pattern eine Cleanup-Funktion:

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

Der `onMainEvent`-Helper gibt eine Unsubscribe-Funktion zurück, die dann von Reacts `useEffect`-Cleanup aufgerufen wird. Die Typen für die Callback-Payload kommen aus der `MainToRendererEvents`-Map.

## Registrierung der Handler

Anfangs habe ich die Handler einfach direkt registriert:

```ts
export const registerAuthHandlers = () => {
  getUser();
  signIn();
  signOut();
};
```

Das hat allerdings nicht funktioniert. Ich bekam diesen Fehler in der Dev-Console des Renderers: `Error: module not found: stream`.

Es schien so, als würde mein Build-Tool (Vite mit [vite-plugin-electron](https://github.com/electron-vite/vite-plugin-electron)) Handler-Module, die Node-APIs importieren, in das Preload Script bundlen. Das führte zu dem Runtime-Error, den ich im Renderer sah.

Um das zu beheben, bin ich auf Dynamic Imports umgestiegen. Registrierungs-Funktionen importieren Handler-Module jetzt zur Runtime, nachdem der Main Process läuft:

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

Jedes Handler-Modul exportiert eine Default-Funktion (das Ergebnis des Aufrufs von `handleRendererRequest` oder `onRendererEvent`).

## App Lifecycle

Die Registrierung passiert einmalig während des App-Starts:

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

Das Registrierungs-Modul ist simpel:

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

## Vorteile und Trade-offs

Wenn ich eine Handler-Funktion umbenenne oder ihre Parameter ändere, warnt mich TypeScript an jeder Aufrufstelle in beiden Prozessen. Wenn ich einen neuen IPC-Channel hinzufüge, zeigt mir Autocomplete die verfügbaren Channels basierend auf meinen Type Maps an.

Der Boilerplate-Code ist allerdings real: eine Handler-Datei, ein Typ-Export, ein Eintrag in den Type Maps der Domain, ein Eintrag im API-Objekt. Aber jedes Teil ist klein und das Typsystem verbindet sie. Ich nehme diesen Trade-off lieber in Kauf als „Silent Failures“ durch vertippte Channel-Strings zu riskieren.

Was ist dein Ansatz für IPC in Electron? Ich würde gerne davon hören! Schreib mir gerne auf X: [@mt_heckmann](https://x.com/mt_heckmann).
