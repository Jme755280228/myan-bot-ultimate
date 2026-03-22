require('dotenv').config();

module.exports = {
    // .env ထဲက ADMIN_ID (ဥပမာ- 12345,67890) ကို Array ပြောင်းတာပါ
    adminIds: process.env.ADMIN_ID ? process.env.ADMIN_ID.split(',').map(id => id.trim()) : [],

    operators: {
        u9: { 
            name: 'U9',
            payment: "KPay: 09955280228 (U Zaw Win Htay)",
            activePlans: [
                { id: 'u9_1gb_30d', name: 'U9 1GB (30 Days)', price: 1000 },
                { id: 'u9_wifi_10gb', name: 'U9 Wifi 10GB', price: 5000 }
            ]
        },
        atom: { 
            name: 'Atom', 
            payment: "Wave: 09959648649 (U Zaw Win Htay)",
            activePlans: [{ id: 'atom_1gb', name: 'Atom 1GB (30 Days)', price: 1000 }] 
        },
        mytel: { 
            name: 'Mytel', 
            payment: "KPay: 09755887430 (Daw Pyae Phyo Wai Aung)",
            activePlans: [{ id: 'mytel_1gb', name: 'Mytel 1GB (30 Days)', price: 1000 }] 
        },
        mpt: { 
            name: 'MPT', 
            payment: "Wave: 09959344471 (Daw Pyae Phyo Wai Aung)",
            activePlans: [{ id: 'mpt_1gb', name: 'MPT 1GB (30 Days)', price: 1000 }] 
        },
        mec: { 
            name: 'MEC', 
            payment: "KPay: 09955280228 (U Zaw Win Htay)",
            activePlans: [{ id: 'mec_main', name: 'MEC Main Bill 1000', price: 1050 }] 
        }
    }
};

console.log("Checking Admins:", module.exports.adminIds);

