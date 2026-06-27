# DoodleCraft Launcher

Ein Minecraft-Launcher im **Drawing-Style** (handgezeichnete Optik) mit Login
**ohne eigene Azure-App** — über den Microsoft Device-Code-Flow mit einer
öffentlich bekannten Client-ID (`prismarine-auth`). Zusätzlich Offline-Modus,
Multi-Account, Mod-Loader (Fabric/Forge/Quilt), Modpacks und Instanz-Verwaltung.

## Stack

- **Electron + React + TypeScript** (electron-vite)
- **@xmcl/\*** für Version-Download, Loader-Install und Spielstart
- **prismarine-auth** für Microsoft-Login ohne eigene Azure-App
- **wired-elements** + **roughjs** für den Drawing-Style

## Entwicklung

```bash
npm install
npm run dev          # Startet die App mit Hot-Reload
npm run typecheck    # Typprüfung Main + Renderer
npm run build        # Production-Build (out/)
npm run package      # Windows-Installer/Portable (release/)
```

## Architektur

- `src/main` — Electron Main-Prozess (Backend: Downloads, Auth, Spielstart)
- `src/preload` — sichere, typsichere IPC-Bridge (`contextIsolation`)
- `src/renderer` — React-UI im Drawing-Style
- `src/shared` — gemeinsame Typen / IPC-Contracts

## Status

Siehe Meilensteine M1–M8. Aktuell fertig: **M1–M6** (Scaffold, Design-System,
Auth, Versionen & Instanzen, Spielstart, Mod-Loader Fabric/Forge/Quilt). Als
Nächstes: **M7 — Mods & Modpacks (Modrinth/CurseForge)**.

## Hinweis zum Login

Die öffentliche Client-ID erspart dem Entwickler die Azure-App-Registrierung.
Spieler benötigen für Online-Server weiterhin einen echten Microsoft/Minecraft-
Account. Der Offline-Modus ist nur für Singleplayer/Offline-Server gedacht und
setzt legalen Spielbesitz voraus.
