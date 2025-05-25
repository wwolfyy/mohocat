#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e
# Treat unset variables as an error when substituting.
set -u
# Pipes return the exit status of the last command to exit with a non-zero status,
# or zero if all commands in the pipe exit successfully.
set -o pipefail

# --- Configuration ---
# Source directory (your current project folder)
SOURCE_DIR="/mnt/c/Users/jp/Desktop/Github/mtcat_next"

# Target directory (in your home directory's github folder)
TARGET_DIR="$HOME/github/mtcat_next"

# --- Script Logic ---
echo "Starting project copy process..."

# Check if the source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
  echo "Error: Source directory '$SOURCE_DIR' not found."
  exit 1
fi

echo "Ensuring target directory '$TARGET_DIR' exists..."
mkdir -p "$TARGET_DIR"

echo "Copying files from '$SOURCE_DIR' to '$TARGET_DIR'..."
# The '/.' after $SOURCE_DIR ensures that the *contents* of SOURCE_DIR are copied,
# not the SOURCE_DIR folder itself as a subdirectory within TARGET_DIR.
cp -a "$SOURCE_DIR/." "$TARGET_DIR/"

echo "Project content successfully copied from '$SOURCE_DIR' to '$TARGET_DIR'."