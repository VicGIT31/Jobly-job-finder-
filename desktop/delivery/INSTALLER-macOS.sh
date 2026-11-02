#!/bin/bash
# Installe uniquement le DMG inclus dans cette livraison, après contrôle SHA-256.
set -euo pipefail
JOBLY_ROOT="$(cd "$(dirname "$0")" && pwd)"
JOBLY_VERSION="$(tr -d '\r\n' < "$JOBLY_ROOT/VERSION.txt")"
[[ "$JOBLY_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "Version de livraison invalide." >&2; exit 1; }
JOBLY_ARCH=x64
if [ "$(/usr/sbin/sysctl -n hw.optional.arm64 2>/dev/null || true)" = "1" ]; then JOBLY_ARCH=arm64; fi
JOBLY_FILE="Jobly-$JOBLY_VERSION-mac-$JOBLY_ARCH.dmg"
JOBLY_SUM="$(awk -v name="installateurs/$JOBLY_FILE" '$2 == name { print $1 }' "$JOBLY_ROOT/SHA256SUMS.txt")"
[[ "$JOBLY_SUM" =~ ^[a-fA-F0-9]{64}$ ]] || { echo "Empreinte de l’installateur absente ou invalide." >&2; exit 1; }
JOBLY_ACTUAL="$(/usr/bin/shasum -a 256 "$JOBLY_ROOT/installateurs/$JOBLY_FILE" | awk '{print $1}')"
[ "$JOBLY_ACTUAL" = "$JOBLY_SUM" ] || { echo "Intégrité incorrecte : installation annulée. Téléchargez à nouveau le ZIP." >&2; exit 1; }
JOBLY_DEST="${JOBLY_INSTALL_DIR:-/Applications}"
if [ -z "${JOBLY_INSTALL_DIR:-}" ] && [ ! -w "$JOBLY_DEST" ]; then JOBLY_DEST="$HOME/Applications"; fi
mkdir -p "$JOBLY_DEST"
JOBLY_TARGET="$JOBLY_DEST/Jobly.app"
if [ -d "$JOBLY_TARGET" ]; then
  /usr/bin/osascript -e 'if application "Jobly" is running then tell application "Jobly" to quit' || true
  for ((JOBLY_TRY=0; JOBLY_TRY<75; JOBLY_TRY++)); do
    /usr/bin/pgrep -x Jobly >/dev/null || break
    sleep 0.2
  done
  if /usr/bin/pgrep -x Jobly >/dev/null; then echo "Fermez Jobly puis relancez cette commande. Vos données restent conservées." >&2; exit 1; fi
fi
JOBLY_TEMP="$(mktemp -d)"
JOBLY_MOUNT="$JOBLY_TEMP/disque"
JOBLY_STAGE="$JOBLY_DEST/.Jobly-install-$$.app"
mkdir "$JOBLY_MOUNT"
cleanup() { /usr/bin/hdiutil detach "$JOBLY_MOUNT" -quiet 2>/dev/null || true; rm -rf "$JOBLY_TEMP" "$JOBLY_STAGE"; }
trap cleanup EXIT
/usr/bin/hdiutil attach "$JOBLY_ROOT/installateurs/$JOBLY_FILE" -mountpoint "$JOBLY_MOUNT" -nobrowse -readonly -quiet
JOBLY_BUNDLE_VERSION="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$JOBLY_MOUNT/Jobly.app/Contents/Info.plist")"
[ "$JOBLY_BUNDLE_VERSION" = "$JOBLY_VERSION" ] || { echo "La version du programme ne correspond pas à la livraison." >&2; exit 1; }
/usr/bin/ditto "$JOBLY_MOUNT/Jobly.app" "$JOBLY_STAGE"
JOBLY_PREVIOUS=""
if [ -d "$JOBLY_TARGET" ]; then
  JOBLY_BACKUPS="$HOME/Library/Application Support/Jobly/installation-backups"
  mkdir -p "$JOBLY_BACKUPS"
  JOBLY_PREVIOUS="$JOBLY_BACKUPS/Jobly-$(date +%Y%m%d-%H%M%S)-$$.app"
  mv "$JOBLY_TARGET" "$JOBLY_PREVIOUS"
fi
if ! mv "$JOBLY_STAGE" "$JOBLY_TARGET"; then
  if [ -n "$JOBLY_PREVIOUS" ]; then mv "$JOBLY_PREVIOUS" "$JOBLY_TARGET"; fi
  echo "Installation interrompue ; le programme précédent est conservé." >&2
  exit 1
fi
/usr/bin/hdiutil detach "$JOBLY_MOUNT" -quiet
if [ "${JOBLY_NO_LAUNCH:-0}" != "1" ]; then /usr/bin/open "$JOBLY_TARGET"; fi
printf 'Jobly %s installée : %s\n' "$JOBLY_VERSION" "$JOBLY_TARGET"
echo "Les données personnelles sont conservées. Les protections de macOS restent actives."
