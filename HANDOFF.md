# HANDOFF — DoodleCraft Launcher

> Übergabe-Dokument für die nächste Claude-/Entwickler-Instanz. Hier steht
> **genau, was fertig ist, wie alles funktioniert und wo weiterzumachen ist.**

## Was wird gebaut?

Ein **Minecraft-Launcher im Drawing-Style** (handgezeichnete Optik) mit
**Login ohne eigene Azure-App**. Stack: **Electron + React + TypeScript**
(electron-vite). Voller Funktionsumfang geplant: Microsoft- & Offline-Login,
Multi-Account, Vanilla + Mod-Loader (Fabric/Forge/Quilt), Modpacks, Instanzen.

Der vollständige Original-Plan liegt unter
`C:\Users\Julian\.claude\plans\tranquil-weaving-rossum.md` (Meilensteine M1–M8).

## Meilenstein-Status

| ML | Inhalt | Status |
|----|--------|--------|
| **M1** | Scaffold, sichere Electron-Defaults, IPC-Gerüst | ✅ fertig & verifiziert |
| **M2** | Drawing-Style Design-System (wired-elements, RoughJS, Fonts) | ✅ fertig & verifiziert |
| **M3** | Auth: MS Device-Code (öffentl. Client-ID) + Offline + Multi-Account | ✅ fertig & verifiziert |
| **M4** | Versionen & Instanzen (Download, Instanz-Verwaltung, Java) | 🚧 **HIER WEITERMACHEN** |
| M5 | Spielstart (@xmcl/core) | ⬜ offen |
| M6 | Mod-Loader (Fabric/Forge/Quilt) | ⬜ offen |
| M7 | Mods & Modpacks (Modrinth/CurseForge) | ⬜ offen |
| M8 | Politur & Windows-Build | ⬜ offen |

Task-Liste (im Claude-Task-System) spiegelt das ebenfalls: M1–M3 completed,
M4 in_progress.

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
    services/
      encryptedCache.ts    # prismarine-auth Cache-Factory, verschlüsselt via safeStorage
      auth.ts              # AccountManager + Login-Flows + getLaunchAuth() (für M5!)
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
      store/accounts.ts    # zustand-Store, spiegelt Main-Auth
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
   Verifiziert: Microsoft liefert echten `user_code` zurück. Siehe `services/auth.ts`.
   Tokens werden über `encryptedCache.ts` mit `safeStorage` verschlüsselt abgelegt
   (Fallback Klartext, falls Verschlüsselung nicht verfügbar).
2. **Fallback eigene Client-ID:** bewusst vorgesehen — bei Bedarf `PUBLIC_TITLE` in
   `services/auth.ts` durch eine eigene Azure-Client-ID + `flow: 'msal'` ersetzbar.
3. **electron-store auf v8 gepinnt** (v9+ ist ESM-only → bricht das CJS-Main-Bundle).
4. **@xmcl-Versionen:** `@xmcl/core@^2.15.1`, `@xmcl/installer@^6.1.2`,
   `@xmcl/user@^3.0.3`. (Achtung: höhere Majors existieren nicht — `^2.18` schlug fehl.)
5. **Kein React-Router** — simpler `active`-State in `App.tsx`. Bei Bedarf ausbauen.

## 👉 Nächster Schritt: M4 implementieren

Ziel: Vanilla-Version herunterladen, Instanzen verwalten, Java bereitstellen.
`@xmcl/core` + `@xmcl/installer` sind **bereits installiert** (aber noch ungenutzt).

Konkrete To-dos:

1. **`src/main/services/versions.ts`**
   - `getVersionList()` aus `@xmcl/installer` → Manifest cachen.
   - Liste nach Release/Snapshot filtern (Setting `showSnapshots` aus `store`).

2. **`src/main/services/instances.ts`**
   - Instanz = Ordner unter `paths.instances/<slug>/` mit `instance.json`
     (`{ id, name, mcVersion, loader?, loaderVersion?, createdAt, lastPlayed? }`).
   - CRUD: list / create / delete / duplicate. Mods/Saves/Configs liegen je Instanz.

3. **`src/main/services/install.ts`**
   - Vanilla installieren mit `@xmcl/installer` `installTask()`/`install()` in
     `paths.minecraft` (shared). Fortschritt über einen Task-Listener als
     `emit(sender, 'install:progress', { instanceId, phase, progress })`.
   - Neues Event `install:progress` in `IpcEventMap` ergänzen.

4. **Java-Provisioning**
   - `@xmcl/installer` `installJreFromMojang`/Java-Runtime-API → passende JRE je
     MC-Version nach `paths.java`. (Kein System-Java vorhanden!) Pfad merken für M5.

5. **IPC** (`src/main/ipc/instances.ts`, in `index.ts` registrieren):
   `versions:list`, `instances:list|create|delete|duplicate`, `instances:install`.

6. **Renderer**
   - `pages/Instances.tsx`: Liste (DoodleCards), „Neue Instanz" (Name + Versions-Combo
     via `WiredCombo`), Install-Fortschritt mit `RoughProgressBar`
     (`window.api.on('install:progress', ...)`).
   - `pages/Play.tsx`: aktive Instanz + großer „Spielen"-Button (Start kommt in M5).
   - `store/instances.ts` (zustand) analog zu `store/accounts.ts`.
   - In `App.tsx` Nav `instances` und `play` verdrahten.

**M4-Verifikation:** Instanz mit aktueller Release anlegen → Download-Fortschritt
sichtbar → Dateien liegen unter `paths.minecraft` (versions/libraries/assets) und
`paths.instances/<slug>/`. Java liegt unter `paths.java`.

**Danach M5 (Start):** `getLaunchAuth(accountId)` aus `services/auth.ts` nutzen
(liefert `accessToken/uuid/name/userType`), Spielstart mit `@xmcl/core` `launch()`.

## Verifikations-Werkzeuge (bewährt)

- **GUI-Screenshot:** App via `electron.exe .` starten, dann mit
  `System.Windows.Forms`/`System.Drawing` Screen capturen (siehe bisherige Smoke-Tests).
- **Auth/Netzwerk headless testen:** Node-Script mit
  `NODE_PATH="$(pwd)/node_modules" node script.cjs` (prismarine-auth/@xmcl direkt).

## Git

- Branch `master`. Remote = GitHub (von dieser Instanz erstellt).
- `node_modules/`, `out/`, `release/` sind in `.gitignore`.
