#!/usr/bin/env bash
# scripts/package-function.sh
# Packages analyze-cv Appwrite Function by vendoring cvmatch_core and required local components.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FUNCTION_DIR="$REPO_ROOT/appwrite/functions/analyze-cv"
VENDOR_DIR="$FUNCTION_DIR/vendor"

echo "=== Packaging analyze-cv Appwrite Function ==="
echo "Repository root: $REPO_ROOT"
echo "Target vendor directory: $VENDOR_DIR"

# Clean previous vendor build
rm -rf "$VENDOR_DIR"
mkdir -p "$VENDOR_DIR"

# Copy or install cvmatch_core into vendor directory
echo "Vendoring cvmatch_core package..."
cp -r "$REPO_ROOT/packages/python_core/cvmatch_core" "$VENDOR_DIR/"

# Create vendor __init__.py
touch "$VENDOR_DIR/__init__.py"

# Clean any pycache or pyc files from vendor
find "$VENDOR_DIR" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find "$VENDOR_DIR" -type f -name "*.pyc" -delete 2>/dev/null || true

echo "=== Packaging Complete ==="
echo "Vendored contents in $VENDOR_DIR:"
ls -la "$VENDOR_DIR"
