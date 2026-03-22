#!/bin/bash

# --- 0. Get Project Root Path ---
# Script ရှိတဲ့ နေရာကနေ Root Folder ကို ရှာပါမယ်
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( dirname "$SCRIPT_DIR" )"

cd "$PROJECT_ROOT" || exit

echo "🏗️  Building Enterprise Structure at: $PROJECT_ROOT"

# --- 1. Create New Directory Structure ---
mkdir -p src/config \
         src/constants \
         src/repositories \
         src/services \
         src/controllers \
         src/modules/OrderModule \
         src/modules/SimModule \
         src/utils

# --- 2. Move Existing Files (Check before move) ---
echo "🚚  Migrating files..."

# database.js -> repositories/BaseRepository.js
if [ -f "database.js" ]; then
    mv database.js src/repositories/BaseRepository.js
    echo "✅ Moved database.js"
fi

# Migrating Handlers
if [ -d "handlers" ]; then
    mv handlers/* src/controllers/ 2>/dev/null
    rmdir handlers
    echo "✅ Migrated Handlers"
fi

# Migrating Services
if [ -d "services" ]; then
    mv services/* src/services/ 2>/dev/null
    rmdir services
    echo "✅ Migrated Services"
fi

# Migrating Utils
if [ -d "utils" ]; then
    mv utils/* src/utils/ 2>/dev/null
    rmdir utils
    echo "✅ Migrated Utils"
fi

# --- 3. Initializing Rule Files ---
touch src/constants/systemConstants.js
touch src/modules/OrderModule/orderConstants.js
touch src/modules/SimModule/simConstants.js

# --- 4. Final Permission Check ---
if [ -f "src/repositories/BaseRepository.js" ]; then
    chmod +x src/repositories/BaseRepository.js
fi

echo "----------------------------------------"
echo "🚀 Structure Engineering Fixed & Complete!"
echo "----------------------------------------"
