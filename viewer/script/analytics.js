import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyDEVzj2FOCXJCbgDmdmQWiyDv8kB4IglKE",
  authDomain: "engineering-87472.firebaseapp.com",
  projectId: "engineering-87472",
  storageBucket: "engineering-87472.firebasestorage.app",
  messagingSenderId: "712205545095",
  appId: "1:712205545095:web:2aef2b144c1bdcb07c5222"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentReport = null;
let machinesChart = null, workersChart = null, procurementChart = null;

onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = 'viewer_login.html'; return; }
    const urlParams = new URLSearchParams(window.location.search);
    const ownerId = urlParams.get('owner');
    const reportId = urlParams.get('report');
    if (!ownerId || !reportId) { window.location.href = 'shared_dashboard.html'; return; }
    try {
        const docRef = doc(db, 'users', ownerId, 'daily_reports', reportId);
        const snap = await getDoc(docRef);
        if (!snap.exists()) { alert('التقرير غير متاح'); window.location.href = 'shared_dashboard.html'; return; }
        currentReport = snap.data();
        document.getElementById('projectName').innerText = currentReport.projectName || '—';
        document.getElementById('location').innerText = currentReport.location || '—';
        document.getElementById('reportDate').innerText = currentReport.date || '—';
        renderMachinesAnalytics();
        renderWorkersAnalytics();
        renderProcurementAnalytics();
    } catch (error) {
        console.error(error);
        alert('حدث خطأ في تحميل التقرير: ' + error.message);
    }
});

function renderMachinesAnalytics() {
    const machines = currentReport.machines || [];
    let totalDiesel = 0, totalMaint = 0, totalOil = 0, totalGrease = 0, totalHours = 0;
    const machineStats = machines.map(m => {
        const diesel = parseFloat(m.dieselCost) || 0;
        const maint = parseFloat(m.maintenanceCost) || 0;
        const oil = parseFloat(m.oilCost) || 0;
        const grease = parseFloat(m.greaseCost) || 0;
        totalDiesel += diesel; totalMaint += maint; totalOil += oil; totalGrease += grease;
        let hours = 0;
        if (m.totalHours) {
            const match = m.totalHours.match(/(\d+)/);
            if (match) hours = parseInt(match[1]);
        }
        totalHours += hours;
        return { ...m, diesel, maint, oil, grease, totalCost: diesel + maint + oil + grease, hours };
    });
    document.getElementById('machinesCards').innerHTML = `
            <div class="stat-card"><div class="label">عدد الآليات</div><div class="value">${machines.length}</div></div>
            <div class="stat-card"><div class="label">إجمالي ساعات التشغيل</div><div class="value">${totalHours}</div></div>
            <div class="stat-card"><div class="label">إجمالي تكلفة الديزل</div><div class="value">${totalDiesel.toFixed(2)} د.أ</div></div>
            <div class="stat-card"><div class="label">إجمالي تكلفة الصيانة</div><div class="value">${totalMaint.toFixed(2)} د.أ</div></div>
            <div class="stat-card"><div class="label">إجمالي تكلفة الزيت</div><div class="value">${totalOil.toFixed(2)} د.أ</div></div>
            <div class="stat-card"><div class="label">إجمالي تكلفة الشحمة</div><div class="value">${totalGrease.toFixed(2)} د.أ</div></div>
        `;
    document.getElementById('machinesTbody').innerHTML = machineStats.map(m => `
            <tr>
                <td>${m.machineType || ''}</td>
                <td>${m.machineNumber || ''}</td>
                <td>${m.driverName || ''}</td>
                <td>${m.hours || 0}</td>
                <td>${m.diesel.toFixed(2)}</td>
                <td>${m.maint.toFixed(2)}</td>
                <td>${m.oil.toFixed(2)}</td>
                <td>${m.grease.toFixed(2)}</td>
                <td>${m.totalCost.toFixed(2)}</td>
            </tr>
        `).join('');
    if (machinesChart) machinesChart.destroy();
    const ctx = document.getElementById('machinesChart').getContext('2d');
    machinesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: machineStats.map(m => m.machineType || 'بدون اسم'),
            datasets: [
                { label: 'ديزل', data: machineStats.map(m => m.diesel), backgroundColor: '#3b82f6' },
                { label: 'صيانة', data: machineStats.map(m => m.maint), backgroundColor: '#f59e0b' },
                { label: 'زيت', data: machineStats.map(m => m.oil), backgroundColor: '#10b981' },
                { label: 'شحمة', data: machineStats.map(m => m.grease), backgroundColor: '#ef4444' }
            ]
        },
        options: { responsive: true, maintainAspectRatio: true, scales: { x: { stacked: true }, y: { stacked: true } } }
    });
}

function renderWorkersAnalytics() {
    const workers = currentReport.workers || [];
    let totalWorkHours = 0;
    const workerStats = workers.map(w => {
        const hours = parseFloat(w.workHours) || 0;
        totalWorkHours += hours;
        return { ...w, hours };
    });
    document.getElementById('workersCards').innerHTML = `
            <div class="stat-card"><div class="label">عدد العمال</div><div class="value">${workers.length}</div></div>
            <div class="stat-card"><div class="label">إجمالي ساعات العمل</div><div class="value">${totalWorkHours}</div></div>
            <div class="stat-card"><div class="label">متوسط ساعات العمل لكل عامل</div><div class="value">${(totalWorkHours / workers.length || 0).toFixed(1)}</div></div>
        `;
    document.getElementById('workersTbody').innerHTML = workerStats.map(w => `
            <tr>
                <td>${w.name || ''}</td>
                <td>${w.role || ''}</td>
                <td>${w.hours}</td>
                <td>${w.workArea || ''}</td>
                <td>${w.completedArea || ''}</td>
            </tr>
        `).join('');
    if (workersChart) workersChart.destroy();
    const ctx = document.getElementById('workersChart').getContext('2d');
    workersChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: workerStats.map(w => w.name || 'بدون اسم'), datasets: [{ label: 'ساعات العمل', data: workerStats.map(w => w.hours), backgroundColor: '#3b82f6' }] },
        options: { responsive: true }
    });
}

function renderProcurementAnalytics() {
    const procurement = currentReport.procurement || [];
    let totalCost = 0;
    const procStats = procurement.map(p => {
        const cost = parseFloat(p.price) || 0;
        totalCost += cost;
        return { ...p, cost };
    }).filter(p => p.materialType && p.materialType.trim() !== '');
    document.getElementById('procurementCards').innerHTML = `
            <div class="stat-card"><div class="label">عدد المشتريات</div><div class="value">${procStats.length}</div></div>
            <div class="stat-card"><div class="label">إجمالي قيمة المشتريات</div><div class="value">${totalCost.toFixed(2)} د.أ</div></div>
        `;
    document.getElementById('procurementTbody').innerHTML = procStats.map(p => `
            <tr>
                <td>${p.materialType || ''}</td>
                <td>${p.supplier || ''}</td>
                <td>${p.quantity || 0}</td>
                <td>${p.cost.toFixed(2)}</td>
            </tr>
        `).join('');
    if (procurementChart) procurementChart.destroy();
    const ctx = document.getElementById('procurementChart').getContext('2d');
    procurementChart = new Chart(ctx, {
        type: 'pie',
        data: { labels: procStats.map(p => p.materialType), datasets: [{ data: procStats.map(p => p.cost), backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'] }] },
        options: { responsive: true }
    });
}

window.selectTab = (tab) => {
    document.getElementById('machinesView').style.display = tab === 'machines' ? 'block' : 'none';
    document.getElementById('workersView').style.display = tab === 'workers' ? 'block' : 'none';
    document.getElementById('procurementView').style.display = tab === 'procurement' ? 'block' : 'none';
    document.querySelectorAll('.selector button').forEach(btn => btn.classList.remove('active'));
    if (tab === 'machines') document.getElementById('btnMachines').classList.add('active');
    else if (tab === 'workers') document.getElementById('btnWorkers').classList.add('active');
    else if (tab === 'procurement') document.getElementById('btnProcurement').classList.add('active');
};
