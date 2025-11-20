#!/bin/sh
set -e

# Ensure data directory and subdirectories exist with correct permissions
echo "Setting up data directories..."
mkdir -p /data/uploads /data/mockups /data/thumbnails /data/output /data/temp

# Fix ownership for the aurelia user (UID 1001)
chown -R 1001:1001 /data

echo "Data directories ready with correct permissions"

# Switch to aurelia user and start the application
exec su-exec aurelia:nodejs "$@"
