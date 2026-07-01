#!/bin/sh
# Startet Electron im Flatpak über zypak (Sandbox-Wrapper der Electron2.BaseApp).
# Die Electron-Binary unter /app/main lädt die App automatisch aus
# /app/main/resources/app (Standard-Electron-Layout) – KEIN App-Verzeichnis als
# Argument, sonst beendet sich die App unter zypak sofort.
#
# --ozone-platform-hint=auto: nutzt Wayland, wenn vorhanden (finish-args geben
# nur Wayland + fallback-x11 frei), sonst X11. Ohne den Hint würde Electron auf
# X11 bestehen und unter Wayland mangels $DISPLAY abbrechen.
export TMPDIR="$XDG_RUNTIME_DIR/app/$FLATPAK_ID"
exec zypak-wrapper /app/main/electron --ozone-platform-hint=auto "$@"
