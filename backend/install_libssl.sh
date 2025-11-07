#!/bin/sh
# install_libssl.sh - find and install libssl1.1 for the current architecture (Ubuntu pools)
set -e

ARCH=$(dpkg --print-architecture)
BASES="http://archive.ubuntu.com/ubuntu/pool/main/o/openssl1.1 http://security.ubuntu.com/ubuntu/pool/main/o/openssl1.1"
FOUND_URL=""

for BASE in $BASES; do
  PKG=$(wget -qO- "$BASE/" 2>/dev/null | grep -Eo "libssl1.1_[^'\"<> ]+_${ARCH}\.deb" | head -n1 || true)
  if [ -n "$PKG" ]; then
    FOUND_URL="$BASE/$PKG"
    echo "Found package: $FOUND_URL"
    break
  fi
done

if [ -z "$FOUND_URL" ]; then
  echo "Could not find libssl1.1 for $ARCH in Ubuntu pools. Exiting."
  exit 1
fi

echo "Downloading $FOUND_URL ..."
wget -c "$FOUND_URL" -O libssl1.1.deb

echo "Installing libssl1.1 ..."
if ! sudo apt install -y ./libssl1.1.deb; then
  echo "apt install failed, trying dpkg..."
  sudo dpkg -i libssl1.1.deb || true
  echo "Fixing dependencies..."
  sudo apt -f install -y
fi

echo "Updating linker cache..."
sudo ldconfig

echo "Verification (should list libcrypto.so.1.1):"
ldconfig -p | grep libcrypto.so.1.1 || echo "libcrypto.so.1.1 not found after install"