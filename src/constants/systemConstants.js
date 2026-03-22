const sharedSpecs = require('../../modules-go/shared_specs.json');

/**
 * 📜 ARCHI LAW: THE GLOBAL FROZEN RULES
 * Shared Specs ထဲက values တွေကိုယူပြီး App တစ်ခုလုံးအတွက် 
 * Immutable Constants အဖြစ် Freeze လုပ်ထားမယ်။
 */

const createFrozenObject = (data) => Object.freeze(data);

const SYSTEM_RULES = {
    OP: createFrozenObject(sharedSpecs.OP),
    CAT: createFrozenObject(sharedSpecs.CAT),
    STATUS: createFrozenObject(sharedSpecs.STATUS),
    STEP: createFrozenObject(sharedSpecs.STEP),
    DB_FIELDS: createFrozenObject(sharedSpecs.DB_FIELDS),
    ACTION: createFrozenObject(sharedSpecs.ACTION),
    LABELS: createFrozenObject(sharedSpecs.LABELS)
};

module.exports = Object.freeze(SYSTEM_RULES);

