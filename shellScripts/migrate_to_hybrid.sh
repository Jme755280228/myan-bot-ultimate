#!/bin/bash

# --- 🛠 Path သတ်မှတ်ချက်များ ---
SOURCE="$HOME/myan-bot-test"
DEST="$HOME/myan-bot-ultimate"

echo "🚀 Migration စတင်နေပါပြီ..."

# ၁။ Target Folder မရှိရင် ဆောက်မယ်
mkdir -p $DEST/data $DEST/handlers $DEST/services $DEST/utils $DEST/modules-go $DEST/shellScripts

# ၂။ Folder အဟောင်းထဲက file တွေကို သပ်သပ်ရပ်ရပ် ကူးမယ်
echo "📂 Files များကို ကူးယူနေသည်..."
cp -R $SOURCE/data/* $DEST/data/ 2>/dev/null
cp -R $SOURCE/handlers/* $DEST/handlers/ 2>/dev/null
cp -R $SOURCE/services/* $DEST/services/ 2>/dev/null
cp -R $SOURCE/utils/* $DEST/utils/ 2>/dev/null

# ၃။ Root files (index, database, firebase key) များကို ကူးမယ်
cp $SOURCE/index.js $SOURCE/database.js $SOURCE/package.json $SOURCE/serviceAccountKey.json $DEST/ 2>/dev/null

echo "✅ Migration ပြီးဆုံးပါပြီ။ $DEST ထဲသို့ ပြောင်းရွှေ့ပြီးပါပြီ။"

