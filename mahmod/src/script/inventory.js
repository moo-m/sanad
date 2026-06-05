import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

const firebaseConfig = { apiKey: "AIzaSyDEVzj2FOCXJCbgDmdmQWiyDv8kB4IglKE", authDomain: "engineering-87472.firebaseapp.com", projectId: "engineering-87472", storageBucket: "engineering-87472.firebasestorage.app", messagingSenderId: "712205545095", appId: "1:712205545095:web:ebd7e69c1850ca857c5222" };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let currentUser = null, allDays = [], chart = null;

onAuthStateChanged(auth, (user) => {
    if (!user) { window.location.href = 'login.html'; return; }
    currentUser = user;
    loadAllDays();
});

async function loadAllDays() {
    try {
        // ✅ بدون orderBy لتجنب مشكلة الـ Index — الترتيب يتم في JS كما تم في index.html
        const snap = await getDocs(collection(db, 'users', currentUser.uid, 'daily_reports'));
        allDays = [];
        snap.forEach(d => allDays.push({ id: d.id, ...d.data() }));

        // ✅ الترتيب حسب التاريخ تنازلياً في JS
        allDays.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

        const picker = document.getElementById('manual-days-picker');
        picker.innerHTML = '';
        allDays.forEach(day => {
            const btn = document.createElement('button');
            btn.className = 'manual-day-btn';
            btn.textContent = day.date;
            btn.dataset.date = day.date;
            btn.onclick = () => btn.classList.toggle('selected');
            picker.appendChild(btn);
        });
    } catch (error) {
        console.error('خطأ في تحميل البيانات:', error);
        alert('حدث خطأ في تحميل البيانات: ' + error.message);
    }
}

window.toggleMode = () => {
    const mode = document.querySelector('input[name=inv-mode]:checked').value;
    document.getElementById('range-mode').style.display = mode === 'range' ? 'block' : 'none';
    document.getElementById('manual-mode').style.display = mode === 'manual' ? 'block' : 'none';
};

window.generateRange = () => {
    const from = document.getElementById('from-date').value;
    const to = document.getElementById('to-date').value;
    if (!from || !to) return alert('اختر التاريخ');
    const filtered = allDays.filter(d => d.date >= from && d.date <= to);
    computeInventory(filtered);
};

window.generateManual = () => {
    const selected = Array.from(document.querySelectorAll('.manual-day-btn.selected')).map(b => b.dataset.date);
    if (!selected.length) return alert('اختر يوم واحد على الأقل');
    const filtered = allDays.filter(d => selected.includes(d.date));
    computeInventory(filtered);
};

function computeInventory(days) {
    let costDiesel = 0, costMaint = 0, costOil = 0, costGrease = 0, costProc = 0;
    let details = [];
    days.forEach(day => {
        (day.machines || []).forEach(m => {
            costDiesel += parseFloat(m.dieselCost) || 0;
            costMaint += parseFloat(m.maintenanceCost) || 0;
            costOil += parseFloat(m.oilCost) || 0;
            costGrease += parseFloat(m.greaseCost) || 0;
            if (m.dieselCost) details.push({ date: day.date, type: 'ديزل', item: m.machineType, val: m.dieselCost });
            if (m.maintenanceCost) details.push({ date: day.date, type: 'صيانة', item: m.machineType, val: m.maintenanceCost });
            if (m.oilCost) details.push({ date: day.date, type: 'زيت', item: m.machineType, val: m.oilCost });
            if (m.greaseCost) details.push({ date: day.date, type: 'شحمة', item: m.machineType, val: m.greaseCost });
        });
        (day.procurement || []).forEach(p => {
            const total = parseFloat(p.price) || 0;
            costProc += total;
            if (total) details.push({ date: day.date, type: 'مشتريات', item: p.materialType, val: total });
        });
    });
    const totalExp = costDiesel + costMaint + costOil + costGrease + costProc;
    document.getElementById('summary-cards').innerHTML = `
            <div class="inv-card"><div class="label">الأيام</div><div class="val">${days.length}</div></div>
            <div class="inv-card"><div class="label">ديزل</div><div class="val">${costDiesel.toFixed(2)} د.أ</div></div>
            <div class="inv-card"><div class="label">صيانة</div><div class="val">${costMaint.toFixed(2)} د.أ</div></div>
            <div class="inv-card"><div class="label">زيت</div><div class="val">${costOil.toFixed(2)} د.أ</div></div>
            <div class="inv-card"><div class="label">شحمة</div><div class="val">${costGrease.toFixed(2)} د.أ</div></div>
            <div class="inv-card"><div class="label">مشتريات</div><div class="val">${costProc.toFixed(2)} د.أ</div></div>
            <div class="inv-card"><div class="label">الإجمالي</div><div class="val">${totalExp.toFixed(2)} د.أ</div></div>
        `;
    document.getElementById('detail-tbody').innerHTML = details.map(d => `<tr><td>${d.date}</td><td>${d.type}</td><td>${d.item}</td><td>${d.val.toFixed(2)} د.أ</td></tr>`).join('') || '<tr><td colspan="4">لا توجد بيانات</td></tr>';
    document.getElementById('results').style.display = 'block';
    if (chart) chart.destroy();
    const ctx = document.getElementById('expenseChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'bar',
        data: { labels: ['ديزل', 'صيانة', 'زيت', 'شحمة', 'مشتريات'], datasets: [{ label: 'التكلفة (د.أ)', data: [costDiesel, costMaint, costOil, costGrease, costProc], backgroundColor: '#3b82f6' }] },
        options: { responsive: true }
    });
    window.inventoryData = { days, costDiesel, costMaint, costOil, costGrease, costProc, totalExp, details };
}

window.exportInventoryExcel = () => {
    const XLSX = window.XLSX;
    const data = window.inventoryData;
    if (!data) return;
    const wb = XLSX.utils.book_new();
    const summary = [['البيان', 'القيمة (د.أ)'], ['عدد الأيام', data.days.length], ['ديزل', data.costDiesel], ['صيانة', data.costMaint], ['زيت', data.costOil], ['شحمة', data.costGrease], ['مشتريات', data.costProc], ['الإجمالي', data.totalExp]];
    const detail = [['التاريخ', 'النوع', 'البيان', 'القيمة (د.أ)'], ...data.details.map(d => [d.date, d.type, d.item, d.val])];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Financial Summary');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(detail), 'Financial Details');
    XLSX.writeFile(wb, 'الجرد_المالي.xlsx');
};
