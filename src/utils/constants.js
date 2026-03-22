// utils/constants.js

const OP = Object.freeze({
    MPT: 'mpt',
    ATOM: 'atom',
    MYTEL: 'mytel',
    U9: 'u9',      
    MEC: 'mec',
    OOREDOO: 'u9' // 💎 Fix: Value ကို 'u9' လို့ ပေးခြင်းဖြင့် အကုန်လုံး တစ်သားတည်းဖြစ်သွားပါပြီ
});

const CAT = Object.freeze({
    DATA: 'data',
    VOICE: 'voice',
    MAIN: 'main'
});

const STATUS = Object.freeze({
    ACTIVE: 'active',
    BLOCKED: 'blocked',
    PENDING: 'pending',
    COMPLETED: 'completed',
    REJECTED: 'rejected'
});

const STEP = Object.freeze({
    // --- 👤 User Basic Steps ---
    IDLE: 'IDLE',
    SELECTING_CATEGORY: 'SELECTING_CATEGORY',
    SELECTING_PLAN: 'SELECTING_PLAN',
    AWAITING_MAIN_BILL_AMOUNT: 'AWAITING_MAIN_BILL_AMOUNT',
    AWAITING_PAYMENT_METHOD: 'AWAITING_PAYMENT_METHOD',
    
    // --- 🛣️ Hybrid Selection Step ---
    CHOOSE_PAY_METHOD: 'CHOOSE_PAY_METHOD', 

    // --- 📸 Screenshot Flow ---
    AWAITING_PAYMENT_SS: 'AWAITING_PAYMENT_SS', 

    // --- ✍️ Text Flow (Manual) ---
    AWAITING_PAYMENT_TEXT_METHOD: 'AWAITING_PAYMENT_TEXT_METHOD', 
    AWAITING_ACCOUNT_NAME: 'AWAITING_ACCOUNT_NAME',             
    AWAITING_TRANSACTION_ID: 'AWAITING_TRANSACTION_ID',         

    // --- 🛠 Admin Steps ---
    REPLY_MODE: 'REPLY_MODE',
    WAITING_BROADCAST_DATA: 'WAITING_BROADCAST_DATA',
    
    // --- 📦 Plan Management Steps ---
    ADD_PLAN_OP: 'ADD_PLAN_OP',       
    ADD_PLAN_CAT: 'ADD_PLAN_CAT',     
    ADD_PLAN_NAME: 'ADD_PLAN_NAME',   
    ADD_PLAN_PRICE: 'ADD_PLAN_PRICE', 

    EDIT_PLAN_SELECT: 'EDIT_PLAN_SELECT',
    EDIT_PLAN_NAME: 'EDIT_PLAN_NAME',
    EDIT_PLAN_PRICE: 'EDIT_PLAN_PRICE',
    DELETE_PLAN_SELECT: 'DELETE_PLAN_SELECT',

    // --- 📈 Promotion Manager ---
    SET_GLOBAL_PERCENT: 'SET_GLOBAL_PERCENT',
    WAITING_MPT_DISC: 'WAITING_MPT_DISC',
    WAITING_ATOM_DISC: 'WAITING_ATOM_DISC',
    WAITING_OOREDOO_DISC: 'WAITING_OOREDOO_DISC',
    WAITING_MYTEL_DISC: 'WAITING_MYTEL_DISC'
});

const DB_FIELDS = Object.freeze({
    GLOBAL_DISC: 'globalDisc',
    MPT_DISC: 'mptDisc',
    ATOM_DISC: 'atomDisc',
    OOREDOO_DISC: 'u9', // 💎 DIAMOND BRIDGE: Firebase key is always 'u9'
    MYTEL_DISC: 'mytelDisc'
});

const LABELS = Object.freeze({
    [CAT.DATA]: '📦 Data Plan',
    [CAT.VOICE]: '📞 Voice Plan',
    [CAT.MAIN]: '💰 Main Bill',
    [OP.U9]: 'Ooredoo/U9',
    'u9': 'Ooredoo/U9',
    'ooredoo': 'Ooredoo/U9'
});

const ACTION = Object.freeze({
    MANAGE_PLANS: 'manage_plans',
    ADD_PLAN_START: 'add_plan_start',
    EDIT_PLAN_START: 'edit_plan_start',
    DELETE_PLAN_START: 'delete_plan_start',
    BACK_TO_ADMIN: 'back_to_admin'
});

module.exports = { OP, CAT, STEP, STATUS, LABELS, DB_FIELDS, ACTION };
