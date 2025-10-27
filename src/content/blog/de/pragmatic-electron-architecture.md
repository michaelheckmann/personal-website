---
title: "Eine pragmatische Electron-Architektur für macOS"
description: "Wie Orbit für macOS gebaut ist: Electron + Swift-CLI, schmale getypte IPC, verschlüsseltes SQLite, Vite/electron-builder. Was funktioniert hat und was nicht."
pubDate: "Oct 26 2025"
cover: "../assets/pragmatic-electron-architecture/hero.webp"
coverAlt: "Luftaufnahme terrassierter Hügel bei Sonnenaufgang; Sonnenstrahlen durchbrechen Wolken und werfen dramatisches Licht und Schatten über die gestuften Felder."
colors: ["#555F4C", "#543F18"]
tags: ["Orbit", "Entwicklung", "Electron"]
translated: true
reference: "pragmatic-electron-architecture"
---

# Eine pragmatische Electron-Architektur für macOS

Dies ist der erste Beitrag einer Reihe von Deep Dives in den Quellcode von Orbit. [Orbit](https://reachorbit.app/) ist eine App, die deine Mac-Bildschirmaktivitäten im Hintergrund aufzeichnet, sodass du jederzeit nach dem Geschehenen suchen und es erneut ansehen kannst. Unter der Haube ist Orbit eine Electron-App mit einem nativen Swift-Helper, der kontinuierlich den Bildschirm aufzeichnet und die Daten in eine verschlüsselte lokale Datenbank schreibt.

In diesem ersten Beitrag werde ich die High-Level-Architektur erläutern, einige Implementierungsentscheidungen hervorheben und dir einen praktischen Blueprint vorstellen, den du anpassen kannst, wenn du eine Electron-App mit tiefgreifenden macOS-Integrationen entwickelst.

## Repository-Struktur

Eine klare Repository-Struktur macht den Wechsel zwischen Web- und nativer Codebasis ohne großen mentalen Kontextwechsel leicht. Orbit nutzt Yarn fürs Package Management und platziert den nativen Swift-Helper direkt neben der Electron-App.

```
orbit/
├── app/ # The Electron app
├── docs/ # Markdown-Dokumentation
├── native/ # Swift CLI app
├── patches/ # npm package patches
└── performance/ # Performance-Tests
```

Die Platzierung des Swift-Codes direkt neben dem App-Code erzwingt eine klare Trennung der Verantwortlichkeiten: native Aufgaben (Bildschirmaufnahme, System-APIs) versus App-Aufgaben (UI, Orchestrierung, Speicherung und Suche).

In meinem Fall enthält dieses Setup auch eine Top-Level `⁠package.json` mit konfigurierten Workspaces. Wenn ich also neue Pakete hinzufügen möchte (z.B. für shared Types), kann ich das problemlos tun.

## Electron-Prozesse und eine type-safe IPC-Schnittstelle

Das IPC-Design von Orbit ist bewusst schlank gehalten. Anstatt APIs wie `ipcRenderer.on` offenzulegen (wovon auch die [Electron-Dokumentation](https://www.electronjs.org/docs/latest/tutorial/security#20-do-not-expose-electron-apis-to-untrusted-web-content) abrät), stellt die App über das Preload-Skript eine kleine Menge gut abgegrenzter Funktionen bereit. Dies führt zu sichereren Grenzen und einer sichereren Anwendung.

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

Ich verwende ein paar Type-Helper für `ipcMain` und `ipcRenderer`, die das Registrieren von Handlern und Emittern ergonomisch und sicher machen. Diese Helper sind inspiriert von [@electron-toolkit/typed-ipc](https://github.com/alex8088/electron-toolkit/tree/master/packages/typed-ipc). Wenn du Electron mit TypeScript nutzt und eine sicherere IPC-Boundary willst, kann ich dir nur empfehlen, etwas Ähnliches zu übernehmen.

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

Mit diesen Helpers kann ich alle Types zentral definieren und als Generics in die Custom Listener- und Emitter-Klassen geben.

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

## Native macOS-Integration über eine Swift-CLI

Orbit nutzt eine separate Swift-CLI, um mit dem Betriebssystem zu interagieren. Die Electron-App startet diesen Helper und verwaltet dessen Lifecycle.

Die Binaries werden mit der App gebündelt und zur Laufzeit über eine Utility-Funktion gefunden.

```ts
// app/src/main/utils/paths.ts
import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

export const getBinPath = (binName: "orbit") => {
  if (!app.isPackaged) {
    const binPath = path.join(process.env.APP_ROOT, "bin", binName);
    if (!fs.existsSync(binPath)) throw new Error(`${binName} binary not found`);
    return binPath;
  }
  const appPath = app.getAppPath(); // .../Orbit.app/Contents/Resources/app.asar
  const contentsPath = path.join(appPath, "..", "..");
  const binPath = path.join(contentsPath, "bin", binName);
  if (!fs.existsSync(binPath)) throw new Error(`${binName} binary not found`);
  return binPath;
};
```

Ich mag diese Trennung, weil sie eine saubere Abgrenzung schafft und den Helfer unabhängig testbar macht.

## App-Pfade, User Data und warum der Storage getrennt ist

Ein kleines, aber wichtiges Detail: Orbit trennt Konfiguration (`userData`) vom Storage (Datenbanken und Aufnahmen). Das vereinfacht Backups und macht es Nutzer:innen leichter, die Rohdateien zu finden, wenn sie sie inspizieren möchten. Außerdem halte ich die Build-Modi explizit, damit `dev`/`test`/`unsigned`/`prod` sich nie gegenseitig Daten überschreiben.

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

## Storage: verschlüsseltes SQLite mit SQLCipher

Orbit ist offline-first. Alle Daten liegen lokal in SQLite und sind mit SQLCipher verschlüsselt. Der Schlüssel wird beim ersten Start zufällig erzeugt und im Keychain gespeichert. Zur Laufzeit ruft die App den Schlüssel zuerst ab und entschlüsselt danach die Datenbank.
Hier ist der Kern der DB-Initialisierung auf der Electron-Seite. Sie nutzt `better-sqlite3-multiple-ciphers` für SQLCipher-Support und `kysely` als typen-sicherer Query-Layer inklusive Migrations.

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

Der Datenbank-Schlüssel wird beim ersten Start erzeugt und sicher über Electrons `safeStorage` API gespeichert.

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

Die native CLI und die Electron-Seite auf dieselbe Datenbank zugreifen zu lassen, brauchte etwas Sorgfalt. Am Ende bin ich bei [`better-sqlite3-multiple-ciphers`](https://github.com/m4heshd/better-sqlite3-multiple-ciphers) auf der Electron-Seite und [`swift-sqlcipher`](https://github.com/skiptools/swift-sqlcipher) auf der Swift-Seite gelandet.

## Build, Packaging und Updates

Orbit setzt auf Vite mit [`vite-plugin-electron`](https://github.com/electron-vite/vite-plugin-electron) und `electron-builder` für Build, Packaging und Publishing. Das bringt Hot Module Replacement (HMR) für die UI und startet den Main-Prozess bei Änderungen automatisch neu.

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

Das Plugin funktioniert gut in der Praxis. Es gibt viele öffentliche Repositories, die einen ähnlichen Ansatz verfolgen, was bedeutet, dass es viele Beispiele gibt, aus denen man lernen kann.

## Was gut funktioniert hat und worauf man achten sollte

Am meisten gelohnt haben sich Entscheidungen, die Kopplung und Unklarheiten reduzieren. Die getypte IPC-Schicht mit einer schmalen Preload-Schnittstelle hat mir viel Zeit gespart – sowohl beim Implementieren als auch beim Reasoning über die Kommunikation zwischen den Prozessen.
Ich genieße es wirklich, mit einem dedizierten Binary zu arbeiten, um mit dem Betriebssystem zu interagieren. Mit dem richtigen Setup ist das Erstellen und Kompilieren dieses Binarys aus einem Swift-Projekt unkompliziert. Ich schätze die Trennung der Verantwortlichkeiten und die Möglichkeit, den nativen Code getrennt von der Electron-App zu iterieren und zu testen.
Der Storage Stack war solide, und eine SQLite-Datenbank zu haben, die ich inspizieren, verschieben und löschen kann, bietet eine angenehme Developer Experience.
Die Wahl von Vite mit dem Electron-Plugin war die richtige Entscheidung. Ich bin bisher auf keine Probleme oder Hindernisse gestoßen.

Die kniffligen Stellen drehten sich um die SQLite-Interoperabilität. Swift und Node bei der Verschlüsselung auf einen Nenner zu bringen, brauchte etwas Trial-and-Error. Außerdem habe ich gemerkt, dass rechenintensive Datenbank-Operationen meine App einfrieren ließen. Also habe ich dedizierte Worker Threads eingeführt, um sie auszulagern. Dazu mache ich vielleicht bald ein Deep Dive zu meiner Node.js `worker-threads` Lösung. Sag Bescheid, wenn dich das interessiert.

Wenn du ähnliche Muster in der Praxis sehen möchtest sind die [Onlook app](https://github.com/onlook-dev/desktop/tree/main/apps/studio), die [Outerbase Studio app](https://github.com/outerbase/studio-desktop) und [Mullvads Desktop-App](https://github.com/mullvad/mullvadvpn-app/tree/main/desktop/packages/mullvad-vpn) großartige Referenzpunkte.

## Ein Blueprint, den du anpassen kannst

Wenn du etwas Ähnliches bauen möchtest, sind hier ein paar Vorschläge, die für mich gut funktioniert haben:

- Repo und Tooling
  - Yarn fürs Package Management der App
  - SwiftPM fürs Package Management des Swift-Projekts
  - Co-located Ordner für den Electron-App-Code und den nativen Swift-Code
  - Vite und `vite-plugin-electron` für den Build
  - `electron-builder` fürs Packaging
- Prozessmodell und IPC
  - Streng getypte IPC-Contracts
  - Einzelne Preload Bridge
  - Kleine und explizite Preload-Allowlist, keine Wildcard-Aufrufe
- Data Layer
  - SQLite für Storage
  - Wenn du Verschlüsselung brauchst: `better-sqlite3-multiple-ciphers` in der Electron-App und `swift-sqlcipher` im nativen Package
  - `kysely` für getypte Queries und Migrations

## Fazit

Das ist die aktuelle Architektur von Orbit. Wenn du ein ähnliches Setup erkundest, hoffe ich, dass dir das einen guten Startpunkt gibt. Ich plane weitere technische Posts, die tiefer in die hier angerissenen Themen eintauchen.

Mich interessiert, wie du ähnliche Setups angegangen bist. Was hat gut funktioniert, und was würdest du beim nächsten Mal anders machen? Teile deinen Ansatz oder deine Fragen mit mir auf X: [mt_heckmann](https://x.com/mt_heckmann).
