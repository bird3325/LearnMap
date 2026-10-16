const fs = require('fs');
const path = require('path');

const adminPath = path.join(__dirname, '..', 'admin.js');
let raw = fs.readFileSync(adminPath, 'utf8');
const isCRLF = raw.includes('\r\n');
let code = raw.replace(/\r\n/g, '\n');

const oldLoad = `async function loadStoredRealEstate() {
    try {
        const res = await fetch('/api/realestate/stored');
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
                allStoredRealEstates = data;
            } else {
                allStoredRealEstates = [];
            }
        } else {
            allStoredRealEstates = [];
        }
    } catch (e) {
        console.error('Failed to load /api/realestate/stored', e);
        allStoredRealEstates = [];
    }
    updateRealEstateSigunguDropdown();
    updateRealEstateGuDropdown();
    updateRealEstateDongDropdown();
    renderStoredRealEstateList();
    if (typeof updateAdminKpiMetrics === 'function') updateAdminKpiMetrics(); // sync realestate kpi
}`;

const newLoad = `async function loadStoredRealEstate() {
    try {
        let res = await fetch('/api/realestate/stored');
        if (!res.ok) {
            res = await fetch('./src/data/realestate_seoul.json');
        }
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
                allStoredRealEstates = data;
            } else {
                allStoredRealEstates = [];
            }
        } else {
            allStoredRealEstates = [];
        }
    } catch (e) {
        try {
            const fbRes = await fetch('./src/data/realestate_seoul.json');
            if (fbRes.ok) {
                allStoredRealEstates = await fbRes.json();
            } else {
                allStoredRealEstates = [];
            }
        } catch (err) {
            console.error('Failed to load /api/realestate/stored', err);
            allStoredRealEstates = [];
        }
    }
    updateRealEstateSigunguDropdown();
    updateRealEstateGuDropdown();
    updateRealEstateDongDropdown();
    renderStoredRealEstateList();
    if (typeof updateAdminKpiMetrics === 'function') updateAdminKpiMetrics(); // sync realestate kpi
}`;

if (!code.includes(oldLoad)) {
    console.error('Error: oldLoad not found');
    process.exit(1);
}
code = code.replace(oldLoad, newLoad);

const finalCode = isCRLF ? code.replace(/\n/g, '\r\n') : code;
fs.writeFileSync(adminPath, finalCode, 'utf8');
console.log('Successfully updated loadStoredRealEstate with fallback in admin.js!');
