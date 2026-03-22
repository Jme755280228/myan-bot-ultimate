#!/bin/bash
# Node.js က Constants တွေကို JSON အဖြစ် Go Module ထဲ ပို့ပေးမယ့် Script

NODE_CONSTANTS="../utils/constants.js"
OUTPUT_JSON="../modules-go/shared_specs.json"

cd "$(dirname "$0")" # Script ရှိတဲ့နေရာကို အရင်သွားမယ်

node -e "const constants = require('$NODE_CONSTANTS'); console.log(JSON.stringify(constants, null, 2));" > $OUTPUT_JSON

echo "💎 Shared Specs synced to Go Module!"

