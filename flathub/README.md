# Flathub-Vorbereitung (Weg B)

Dieser Ordner enthält alles für eine spätere **Flathub**-Einreichung. **Noch nicht
einreichen** – erst nach den anstehenden Bugfixes finalisieren. Flathub baut den
eigenen Manifest (NICHT das electron-builder-`.flatpak` aus Weg A).

## Dateien
| Datei | Zweck |
|-------|-------|
| `io.github.dizzle_hd.doodlecraft_launcher.yml` | flatpak-builder-Manifest |
| `io.github.dizzle_hd.doodlecraft_launcher.metainfo.xml` | AppStream-Metadaten (Pflicht) |
| `io.github.dizzle_hd.doodlecraft_launcher.desktop` | Desktop-Eintrag |
| `launcher.sh` | Start-Wrapper (zypak) |
| `generated-sources.json` | **wird erzeugt** – npm-Deps offline (s. u.) |

## App-ID
`io.github.dizzle_hd.doodlecraft_launcher` (GitHub-Schema, da keine eigene Domain).
Mappt auf `github.com/dizzle-hd/doodlecraft-launcher` (Bindestriche → Unterstriche).
Flathub verlangt zur Verifikation Login mit dem GitHub-Konto **dizzle-hd**.
Wenn du später eine eigene Domain hast, kann die ID auf `com.<domain>.…` wechseln
(dann überall konsistent ändern: Manifest, `.desktop`, `metainfo.xml`).

## Einmalige Tools
```bash
sudo apt install -y flatpak-builder
flatpak install -y flathub org.freedesktop.Sdk//25.08 \
  org.freedesktop.Platform//25.08 org.electronjs.Electron2.BaseApp//25.08 \
  org.freedesktop.Sdk.Extension.node20//25.08
# flatpak-node-generator (aus flatpak-builder-tools):
pipx install "git+https://github.com/flatpak/flatpak-builder-tools.git#subdirectory=node"
# (alternativ: das Skript node/flatpak-node-generator.py direkt aus dem Repo nutzen)
```

## Status: lokaler Offline-Build verifiziert ✅
Das Manifest wurde mit `flatpak-builder` **offline gebaut und gestartet** (App läuft,
Wayland-Fenster). `generated-sources.json` ist bereits erzeugt. Bewährtes Setup, das
nicht angefasst werden muss:
- App im Standard-Electron-Layout unter `/app/main/resources/app` (Electron lädt sie
  automatisch – **kein** App-Verzeichnis als Argument, sonst beendet zypak sofort).
- Start via `zypak-wrapper /app/main/electron --ozone-platform-hint=auto`
  (nutzt Wayland; ohne den Hint scheitert Electron unter Wayland am fehlenden `$DISPLAY`).

## Vor dem Einreichen – offene Punkte
1. **Release taggen** und im Manifest eintragen
   (`sources` → `tag:` und idealerweise `commit:`). Flathub baut nur stabile Stände,
   keine moving branches.
2. **Offline-npm-Quellen neu erzeugen, falls sich Abhängigkeiten geändert haben**:
   ```bash
   flatpak-node-generator npm package-lock.json -o flathub/generated-sources.json
   ```
3. **Electron-Version prüfen**: URL/`sha256` der Electron-Binary im Manifest muss zur
   `electron`-Version in `package.json` passen (aktuell **33.4.11**). Bei Upgrade neue
   Zip-URL + `sha256` (aus `SHASUMS256.txt` des Electron-Releases) eintragen.
4. **metainfo.xml**: echte, öffentlich erreichbare **Screenshots** ergänzen + prüfen:
   ```bash
   flatpak run org.freedesktop.appstream.cli validate \
     flathub/io.github.dizzle_hd.doodlecraft_launcher.metainfo.xml
   ```

### Lokal bauen & testen (vom Repo-Root)
Flathub baut aus dem `git`-Tag; lokal testet man am einfachsten gegen den Arbeitsstand,
indem die `git`-Quelle temporär durch `{ type: dir, path: . }` ersetzt wird:
```bash
flatpak-builder --user --install --force-clean build-dir \
  flathub/io.github.dizzle_hd.doodlecraft_launcher.yml
flatpak run io.github.dizzle_hd.doodlecraft_launcher
```

## Einreichen
1. Fork von `github.com/flathub/flathub`.
2. Branch von **`new-pr`** abzweigen, Manifest + Begleitdateien (oder dieses Verzeichnis)
   hinzufügen.
3. PR gegen `new-pr`. Der Flathub-Bot baut testweise; Maintainer reviewen
   (Fokus: minimale `finish-args`, gültige Metadaten, reproduzierbarer Offline-Build).
4. Nach Merge: eigenes Repo `github.com/flathub/io.github.dizzle_hd.doodlecraft_launcher`.
   **Updates** = dort committen (Tag/commit + neu erzeugte `generated-sources.json`),
   Flathub baut & verteilt automatisch.

## Wichtige Hinweise
- **Updates** kommen im Flatpak über `flatpak update`. Der eingebaute
  **electron-updater** ist im Sandbox wirkungslos und erkennt das selbst
  (er läuft nur bei `app.isPackaged` und meldet „not an AppImage“). Kein Konflikt –
  nichts zu tun.
- **Native Node-Module**: Falls künftig welche dazukommen, müssen sie im Build für
  Electrons ABI neu gebaut werden (Schritt mit `electron-rebuild` im Manifest
  ergänzen). Aktuell reines JS – kein Sonderfall.
- **Daten** liegen sandbox-konform unter `~/.var/app/io.github.dizzle_hd.doodlecraft_launcher/`.
  `app.getPath('userData')` zeigt automatisch dorthin (Java/MC-Downloads inklusive).
- Die Icon-Größen unter `resources/icons/` werden mitinstalliert – bei Icon-Änderung
  neu erzeugen.
