# HANDOFF — DoodleCraft Launcher

> Übergabe-Dokument für die nächste Claude-/Entwickler-Instanz. Hier steht
> **genau, was fertig ist, wie alles funktioniert und wo weiterzumachen ist.**

## Was wird gebaut?

Ein **Minecraft-Launcher im Drawing-Style** (handgezeichnete Optik) mit
**Login ohne eigene Azure-App**. Stack: **Electron + React + TypeScript**
(electron-vite). Voller Funktionsumfang: Microsoft-Login (Multi-Account),
Vanilla + Mod-Loader (Fabric/Forge/Quilt), Modpacks, Instanzen.
Offline-Accounts werden bewusst NICHT unterstützt.

Der vollständige Original-Plan liegt unter
`C:\Users\Julian\.claude\plans\tranquil-weaving-rossum.md` (Meilensteine M1–M8).

## Meilenstein-Status

| ML | Inhalt | Status |
|----|--------|--------|
| **M1** | Scaffold, sichere Electron-Defaults, IPC-Gerüst | ✅ fertig & verifiziert |
| **M2** | Drawing-Style Design-System (wired-elements, RoughJS, Fonts) | ✅ fertig & verifiziert |
| **M3** | Auth: MS Device-Code (öffentl. Client-ID) + Multi-Account (kein Offline) | ✅ fertig & verifiziert |
| **M4** | Versionen & Instanzen (Download, Instanz-Verwaltung, Java) | ✅ fertig (build/typecheck grün; Download-Verifikation nur außerhalb dieser Sandbox möglich) |
| **M5** | Spielstart (@xmcl/core) | ✅ fertig (build/typecheck grün; echter Start nur außerhalb dieser Sandbox prüfbar) |
| **M6** | Mod-Loader (Fabric/Forge/Quilt) | ✅ fertig (build/typecheck grün; echter Loader-Install nur außerhalb dieser Sandbox prüfbar) |
| **M7** | Mods & Modpacks (Modrinth) | ✅ fertig (build/typecheck grün; Modrinth-Netz in dieser Sandbox geblockt) |
| **M8** | Politur & Windows-Build | ✅ Code fertig (Settings, Rename, Ordner öffnen); reales Packaging nur auf Windows |

Task-Liste (im Claude-Task-System) spiegelt das ebenfalls: M1–M8 completed.

## So läuft das Projekt

```bash
npm install            # einmalig (siehe WICHTIG unten zu electron-Binary)
npm run dev            # Dev mit Hot-Reload
npm run typecheck      # Main + Renderer Typprüfung (muss grün sein)
npm run build          # Production-Build nach out/
npm run package        # Windows-Installer/Portable nach release/
```

### ⚠️ WICHTIG: Sandbox-Policy blockiert postinstall-Scripts

Diese Umgebung hat eine `allowScripts`-Policy (`package.json` -> `"allowScripts": {}`),
die `postinstall` von `electron` und `esbuild` blockiert. `esbuild` funktioniert
trotzdem (eigenes Binary-Paket). **`electron` lädt sein Binary aber NICHT herunter**
→ `node_modules/electron/dist/electron.exe` fehlt nach `npm install`.

**Fix** (nach jedem frischen `npm install`): die gecachte ZIP entpacken:
```powershell
$zip = (Get-ChildItem "$env:LOCALAPPDATA\electron\Cache\*\electron-*-win32-x64.zip").FullName
$dist = "node_modules\electron\dist"
if (Test-Path $dist) { Remove-Item -Recurse -Force $dist }
Expand-Archive -Path $zip -DestinationPath $dist -Force
Set-Content "node_modules\electron\path.txt" -Value "electron.exe" -NoNewline -Encoding ascii
```
Ist die ZIP nicht im Cache, einmal `node node_modules/electron/install.js` laufen
lassen (lädt sie), dann obiges Entpacken.

### App-Smoke-Test ohne `npm run dev`

`npm run build` erzeugt `out/`. Dann starten:
`node_modules\electron\dist\electron.exe .`
(Hauptfenster sollte erscheinen, kein Crash.)

## Architektur / Dateikarte

```
src/
  shared/ipc.ts            # ZENTRAL: alle IPC-Contracts (invoke + events) als getypte Maps
  main/
    index.ts               # App-Lifecycle, Single-Instance
    window.ts              # BrowserWindow, sichere Defaults, window-open -> shell.openExternal
    paths.ts               # userData-Verzeichnisse: authCache/minecraft/instances/java
    store.ts               # electron-store v8: accounts, activeAccountId, settings
    ipc/
      registry.ts          # handle()/emit() typsichere Wrapper; handle gibt ctx={sender}
      index.ts             # registerIpcHandlers() — hier neue Handler-Module einhängen
      auth.ts              # Auth-IPC-Handler
      instances.ts         # IPC für settings/versions/instances (M4)
      mods.ts              # IPC für mods:* und modpacks:* (M7)
    services/
      encryptedCache.ts    # prismarine-auth Cache-Factory, verschlüsselt via safeStorage
      auth.ts              # AccountManager + Login-Flows + getLaunchAuth() (für M5!)
      versions.ts          # Mojang-Versionsliste (getVersionList) + In-Memory-Cache (M4)
      instances.ts         # Instanz-CRUD: list/create/delete/duplicate + patchInstance (M4)
      install.ts           # Vanilla-Install (installTask) + Java-Runtime + Fortschritts-Events (M4)
      launch.ts            # Spielstart via @xmcl/core launch() + Process-Watcher + launch:status (M5);
                           #   erfasst stdout/stderr (launch:log) + Log-Ringpuffer (getLogs/clearLogs)
      loaders.ts           # Loader-Versionslisten + Default-Auswahl (Fabric/Forge/Quilt) (M6)
      modrinth.ts          # Modrinth-API-Helfer (fetch + Suche + Antwort-Typen) (M7)
      mods.ts              # Mod-Suche/Install/List/Toggle/Remove je Instanz (M7)
      modpacks.ts          # .mrpack-Install als neue Instanz (unzip + Downloads) (M7)
  preload/
    index.ts               # contextBridge -> window.api.invoke()/on() (generisch, getypt)
    index.d.ts             # Window.api Typ
  renderer/
    index.html             # CSP gesetzt (img https erlaubt für Skins)
    src/
      main.tsx, App.tsx    # Shell + Routing (einfacher useState-Switch, KEIN Router)
      components/
        AppShell.tsx       # Sidebar-Layout + SvgDefs
        SvgDefs.tsx        # globaler #doodle-wobble SVG-Filter
        wired.tsx          # React-Wrapper für wired-elements (WiredButton/Input/Combo/...)
        RoughProgressBar.tsx
        DoodleCard.tsx
        SkinHead.tsx       # mc-heads.net Avatar
        DeviceCodeDialog.tsx
      pages/
        Gallery.tsx        # Design-System-Demo (Nav „Design-System")
        Accounts.tsx       # M3 Account-Verwaltung
        Instances.tsx      # M4 Instanz-Liste + Anlegen + Install-Fortschritt; M7 Modpack-Browser
        Play.tsx           # M5 Start-Seite (Spielen-Button + Status)
        Mods.tsx           # M7 Mod-Suche/Verwaltung je Instanz (Modrinth)
        Settings.tsx       # M8 Einstellungen (RAM, Java-Pfad, Snapshots)
        Logs.tsx           # Logs-Ansicht: Live-stdout/stderr je Instanz (launch:log)
      store/accounts.ts    # zustand-Store, spiegelt Main-Auth
      store/instances.ts   # zustand-Store: Instanzen/Versionen/Settings + Install-Progress
      styles/
        theme.css          # Tokens + @fontsource imports
        global.css
        components.css     # alle Komponenten-Styles
      types/wired-elements.d.ts  # JSX-Typen der <wired-*> Custom Elements
```

### Muster, die du beibehalten sollst

- **Neuen IPC-Call hinzufügen:** Typ in `src/shared/ipc.ts` (`IpcInvokeMap`/`IpcEventMap`)
  ergänzen → Handler in einem `src/main/ipc/*.ts` per `handle('channel', (ctx, ...args) => ...)`
  → im Renderer `window.api.invoke('channel', ...)` bzw. `window.api.on('event', cb)`.
  Alles ist über die Maps end-to-end typsicher.
- **Handler-Modul registrieren:** in `src/main/ipc/index.ts` aufrufen (wie `registerAuthHandlers()`).
- **Progress/Logs an UI:** `emit(ctx.sender, 'event', payload)`.
- **Drawing-Style:** neue UI mit `DoodleCard`, `wired.tsx`-Komponenten, `RoughProgressBar`;
  Ränder mit Klasse `.wobble`; Farben/Fonts nur über CSS-Variablen aus `theme.css`.

## Kern-Entscheidungen (nicht umwerfen)

1. **Login ohne Azure-App** = `prismarine-auth` mit `Titles.MinecraftNintendoSwitch`
   (öffentliche Client-ID `00000000441cc96b`), `flow: 'live'` (Device-Code).
   **WICHTIG:** `deviceType` MUSS zum Title passen — Nintendo-Switch-Title ⇒
   `deviceType: 'Nintendo'`. Eine falsche Kombination (z. B. `'Win32'`) führt zu
   `403 Forbidden` bei der Xbox-Title-/Device-Auth. Siehe `services/auth.ts`.
   Tokens werden über `encryptedCache.ts` mit `safeStorage` verschlüsselt abgelegt
   (Fallback Klartext, falls Verschlüsselung nicht verfügbar).
   **Nur Microsoft-Accounts** — Offline-Accounts wurden entfernt; `listAccounts()`
   prunt evtl. aus Altständen verbliebene Offline-Accounts beim Laden.
2. **Fallback eigene Client-ID:** bewusst vorgesehen — bei Bedarf `PUBLIC_TITLE` in
   `services/auth.ts` durch eine eigene Azure-Client-ID + `flow: 'msal'` ersetzbar.
3. **electron-store auf v8 gepinnt** (v9+ ist ESM-only → bricht das CJS-Main-Bundle).
4. **@xmcl-Versionen:** `@xmcl/core@^2.15.1`, `@xmcl/installer@^6.1.2`,
   `@xmcl/user@^3.0.3`. (Achtung: höhere Majors existieren nicht — `^2.18` schlug fehl.)
5. **Kein React-Router** — simpler `active`-State in `App.tsx`. Bei Bedarf ausbauen.

## ✅ M4 erledigt — so funktioniert es

Versionen, Instanzen, Vanilla-Download und Java-Provisioning sind implementiert.

- **`services/versions.ts`** — `getVersionList()` aus `@xmcl/installer`, 30-min
  In-Memory-Cache. `listVersions()` filtert Snapshots gemäß Setting `showSnapshots`
  und liefert zusätzlich `latestRelease`/`latestSnapshot`. `getVersionMeta(id)`
  zieht `{ id, url }` für den Download.
- **`services/instances.ts`** — Instanz = Ordner `paths.instances/<slug>/` mit
  `instance.json`. `id` == Slug == Ordnername (aus Name abgeleitet, eindeutig).
  CRUD: `listInstances/createInstance/deleteInstance/duplicateInstance` plus
  `patchInstance` (für `installed`, `lastPlayed`, `javaComponent`). Path-Traversal
  ist über eine Slug-Regex abgesichert.
- **`services/install.ts`** — `installTask()` nach `paths.minecraft` (shared,
  `side: 'client'`). Fortschritt des **Root-Tasks** (`task.progress/task.total`)
  wird gedrosselt als `emit(sender, 'install:progress', { instanceId, phase,
  progress, label })` gepusht (Phasen `minecraft` → `java` → `done`/`error`).
  Java: aus `resolved.javaVersion.component` die passende Mojang-Runtime per
  `fetchJavaRuntimeManifest` + `installJavaRuntimeTask` nach `paths.java/<component>`
  (raw, `lzma: false` → kein Entpacker nötig). Java-Fehler sind **nicht fatal**.
- **IPC** (`ipc/instances.ts`, in `index.ts` registriert): `settings:get|update`,
  `versions:list`, `instances:list|create|delete|duplicate|install`. Neues Event
  `install:progress` in `IpcEventMap`.
- **Renderer**: `pages/Instances.tsx` (Anlegen mit `WiredCombo`-Versionsauswahl +
  Snapshot-Toggle, Liste mit `RoughProgressBar`), `pages/Play.tsx` (zuletzt
  gespielte Instanz + Account, „Spielen"-Button noch deaktiviert), `store/instances.ts`
  (zustand). `App.tsx` startet jetzt auf „Spielen".

> ⚠️ **Verifikations-Hinweis:** `npm run typecheck` und `npm run build` sind grün.
> Der **echte Download** ließ sich in der aktuellen Sandbox **nicht** prüfen, weil
> die Netzwerk-Policy die Mojang-Hosts (`launchermeta.mojang.com` etc.) blockiert
> (`getVersionList()` → „Host not in allowlist"). In einer Umgebung mit Mojang-Zugriff
> verifizieren: Instanz mit aktueller Release anlegen → Fortschritt sichtbar →
> Dateien unter `paths.minecraft` (versions/libraries/assets) + `paths.instances/<slug>/`,
> Java unter `paths.java/<component>/`.

## ✅ M5 erledigt — so funktioniert es

- **`services/launch.ts`** — `launchInstance(sender, instanceId)`:
  - Java über `resolveJava()`: erst manueller `settings.javaPath`, sonst
    `resolveJavaBinary(instance.javaComponent)` (aus `services/install.ts`,
    `paths.java/<component>/bin/java[.exe]`, Konsolen-Binary für stdout).
  - Account = aktiver Account (`getActiveAccount()`), Token via `getLaunchAuth()`.
  - `launch()` mit `version: instance.mcVersion`, `gamePath = instanceDir(id)`
    (cwd/saves/mods je Instanz), `resourcePath = paths.minecraft` (shared
    assets/libraries), `gameProfile`, `accessToken`. **userType** wird
    weggelassen (xmcl-Default `msa`; nur Microsoft-Accounts). Heap aus
    `settings.maxMemoryMb`.
  - `createMinecraftProcessWatcher` → Events als `launch:status`
    (`launching`/`running`/`exited`/`error`, inkl. Exit-Code & Crash-Report).
    `running`-Map verhindert Doppelstarts; `instances:running` liefert die IDs.
  - Nach Spawn `patchInstance(id, { lastPlayed: Date.now() })`.
- **IPC**: `instances:launch`, `instances:running`; Event `launch:status`.
- **Renderer**: `pages/Play.tsx` (Instanz-Auswahl, „Spielen"-Button aktiv,
  Status-Anzeige) und ein „▶ Spielen"-Button je installierter Instanz in
  `pages/Instances.tsx`. `store/instances.ts` hält `launchStatus` + `launch()`.

> ⚠️ **Verifikations-Hinweis:** typecheck + build grün, `@xmcl/core`-Runtime-
> Exports (`launch`, `createMinecraftProcessWatcher`) geprüft. Der **echte
> Spielstart** ist hier nicht testbar (kein Mojang-Netz für den Download in
> dieser Sandbox, kein Java/Display). Auf Windows verifizieren: installierte
> Instanz wählen → „Spielen" → MC-Fenster erscheint, Status wechselt auf „läuft".

## ✅ M6 erledigt — so funktioniert es

- **`services/loaders.ts`** — `listLoaderVersions(loader, mc)` (Fabric:
  `getLoaderArtifactListFor`, Quilt: `getQuiltLoaderVersionsByMinecraft`, Forge:
  `getForgeVersionList`) für die UI-Combo; `resolveDefaultLoaderVersion()` wählt
  recommended → stable → erste.
- **`services/install.ts` → `provisionLoader()`** — läuft nach Vanilla + Java:
  - **Forge:** `installForgeTask({ mcversion, version }, paths.minecraft,
    { side: 'client', java })` — braucht die Java-Binary (>=1.13), die aus der
    zuvor beschafften Runtime kommt. Bringt Libraries + Processors selbst mit.
  - **Fabric/Quilt:** `installFabric`/`installQuiltVersion` schreiben **nur** das
    Versions-JSON → danach `Version.parse()` + `installLibrariesTask()` zum
    Nachladen der Loader-Bibliotheken (`ensureLoaderLibraries`).
  - Ergebnis ist die abgeleitete Versions-ID → wird als `instance.launchVersion`
    (plus aufgelöste `loaderVersion`) gespeichert. Neue Install-Phase `loader`.
- **`services/launch.ts`** — startet `instance.launchVersion ?? instance.mcVersion`.
- **IPC**: `loaders:list`. **Renderer**: `pages/Instances.tsx` hat im „Neue
  Instanz"-Formular eine Loader-Auswahl (Vanilla/Fabric/Forge/Quilt) + optionale
  Loader-Versions-Combo (leer = neueste/empfohlen). `CreateInstanceInput` trägt
  `loader`/`loaderVersion`.

> ⚠️ **Verifikations-Hinweis:** typecheck + build grün, alle Loader-Runtime-Exports
> geprüft. Echter Loader-Install/-Start in dieser Sandbox nicht testbar (Mojang/
> Fabric/Forge-Netz geblockt, kein Java/Display). Forge nutzt zudem die HTTP-Maven
> `files.minecraftforge.net` — ggf. Proxy/Allowlist beachten. Auf Windows je Loader
> eine Instanz anlegen → installieren → starten.

## ✅ M7 erledigt — so funktioniert es

Alles über Modrinth (`https://api.modrinth.com/v2`, User-Agent gesetzt). CurseForge
ist bewusst weggelassen (API-Key nötig) — `services/modrinth.ts` ist so gebaut,
dass eine zweite Quelle später danebengelegt werden kann.

- **`services/modrinth.ts`** — `modrinthGet()`, `searchProjects(query, facets)`,
  `mapHit()` + Antwort-Typen (nur genutzte Felder).
- **`services/mods.ts`** — `searchMods(instanceId, query)` (Facetten:
  `project_type:mod`, `versions:<mc>`, bei Loader `categories:<loader>`),
  `installMod()` (lädt die passendste Version per `@xmcl/file-transfer` `download`
  mit sha1-Validator nach `paths.instances/<id>/mods`, **inkl. Pflicht-
  Dependencies** rekursiv), `listMods/removeMod/setModEnabled`
  (Aktiv/Inaktiv = `.disabled`-Suffix). Metadaten in `.doodlecraft-mods.json`
  je mods-Ordner; Dateinamen sind gegen Path-Traversal geschützt.
- **`services/modpacks.ts`** — `searchModpacks()` und `installModpack(sender,
  projectId)`: lädt das `.mrpack`, liest `modrinth.index.json`, leitet
  MC-Version + Loader (`fabric-loader`/`quilt-loader`/`forge`) ab, legt die
  Instanz an, entpackt `overrides/`+`client-overrides/` (Zip-Slip-geschützt),
  lädt alle `files[]` (serverseitig-only übersprungen) und ruft danach
  `installInstance()` (Vanilla+Loader+Java, mit `install:progress`).
- **IPC** (`ipc/mods.ts`): `mods:search|install|list|remove|setEnabled`,
  `modpacks:search|install`.
- **Renderer**: `pages/Mods.tsx` (Instanz wählen → Modrinth-Suche → installieren;
  installierte Mods aktivieren/deaktivieren/entfernen), Nav „🧩 Mods". Modpack-
  Browser als Karte in `pages/Instances.tsx`.

> ⚠️ **Verifikations-Hinweis:** typecheck + build grün, Runtime-Exports
> (`download`, `@xmcl/unzip` `open/readAllEntries/readEntry`, `fetch`) geprüft.
> Die Modrinth-API ist in dieser Sandbox **geblockt** (`403 Host not in allowlist`),
> daher kein Live-Test. Auf einer Umgebung mit Internet: in einer Fabric-Instanz
> z. B. „Sodium" suchen + installieren → liegt unter `instances/<id>/mods/`; ein
> Modpack (z. B. „Fabulously Optimized") anlegen → neue Instanz startet.

## ✅ M8 erledigt — so funktioniert es

- **`pages/Settings.tsx`** — Arbeitsspeicher (`maxMemoryMb` per Stufen-Buttons),
  optionaler `javaPath`, `showSnapshots`-Toggle; nutzt IPC `settings:get/update`.
  Nav „⚙ Einstellungen" ist verdrahtet.
- **Instanz-Verwaltung** in `pages/Instances.tsx`: Inline-**Umbenennen**
  (`instances:rename` → nur Anzeigename, ID/Ordner bleiben stabil) und
  **„Ordner"** (`instances:openFolder` → `shell.openPath`).
- **Windows-Build**: `electron-builder.yml` (NSIS + Portable, `oneClick: false`)
  ist seit M1 vorhanden; `npm run package` baut nach `release/`.

## 🏁 Projekt-Status: M1–M8 umgesetzt

Alle geplanten Meilensteine sind im Code abgeschlossen; `npm run typecheck` und
`npm run build` sind grün. **Wichtig:** Echte Netzwerk-/Laufzeit-Verifikation
(Mojang-, Fabric/Forge-, Modrinth-Downloads und der Spielstart) war in dieser
Sandbox **nicht möglich** — die Netzwerk-Policy blockiert diese Hosts und es
gibt kein electron-Binary/Display. Auf Windows wie in den jeweiligen
„Verifikations-Hinweisen" oben durchspielen.

### Logs-Ansicht (erledigt)

`services/launch.ts` liest stdout/stderr des Spielprozesses zeilenweise und
pusht sie als `launch:log` (`LogChunk`); ein Ringpuffer (max. 3000 Zeilen je
Instanz) erlaubt Backfill über `logs:get`, `logs:clear` leert ihn. Die Seite
`pages/Logs.tsx` (Nav „🪵 Logs") zeigt die Ausgabe live mit Autoscroll.

### CI: automatischer Windows-Build (erledigt)

`.github/workflows/build.yml` baut auf `windows-latest` bei Push (master,
`claude/**`), PRs, Tags `v*` und manuell: `npm ci` → `npm run typecheck` →
`npm run build` → `npx electron-builder --win --publish never` (NSIS-Setup +
Portable laut `electron-builder.yml`). Artefakte werden als
`doodlecraft-launcher-windows` hochgeladen; bei einem Tag `v*` entsteht zusätzlich
ein GitHub-Release (`softprops/action-gh-release`, `permissions: contents: write`).
Hinweis: Das nicht-standardisierte `allowScripts: {}` in `package.json` ist nur
für die Entwicklungs-Sandbox relevant — echtes `npm`/`npm ci` ignoriert es, daher
lädt electron sein Binary auf dem Runner normal herunter.

### Sinnvolle Restpunkte (optional)
- **App-Icon/Branding** unter `resources/` (von `electron-builder.yml`
  `buildResources` erwartet) + `icon`-Felder.
- **Feinschliff**: Fehler-Toasts statt Inline-Text, Instanz-Einstellungen pro
  Instanz (eigener RAM/Java-Override), CurseForge als zweite Mod-Quelle.

## Verifikations-Werkzeuge (bewährt)

- **GUI-Screenshot:** App via `electron.exe .` starten, dann mit
  `System.Windows.Forms`/`System.Drawing` Screen capturen (siehe bisherige Smoke-Tests).
- **Auth/Netzwerk headless testen:** Node-Script mit
  `NODE_PATH="$(pwd)/node_modules" node script.cjs` (prismarine-auth/@xmcl direkt).

## Git

- Branch `master`. Remote = GitHub (von dieser Instanz erstellt).
- `node_modules/`, `out/`, `release/` sind in `.gitignore`.
