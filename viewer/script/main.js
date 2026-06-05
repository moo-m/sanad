
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

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

let currentUser = null;
let allSharedReports = [];
let filteredReports = [];
let selectedManualDates = []; 
let pieChartInstance = null;
let barChartInstance = null;

onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = './pages/viewer_login.html'; return; }
    currentUser = user;
    document.getElementById('userEmail').innerText = user.email;
    await loadSharedReports();
});

async function loadSharedReports() {
    try {
        const sharesRef = collection(db, 'shared_reports');
        const q = query(sharesRef, where('viewers', 'array-contains', currentUser.email));
        const sharesSnap = await getDocs(q);
        const shareDocs = sharesSnap.docs.map(d => d.data());

        const reports = await Promise.all(shareDocs.map(async (shareData) => {
            try {
                const reportDocRef = doc(db, 'users', shareData.ownerId, 'daily_reports', shareData.reportId);
                const reportSnap = await getDoc(reportDocRef);

                if (reportSnap.exists()) {
                    const reportData = reportSnap.data();
                    return {
                        ownerId: shareData.ownerId,
                        reportId: shareData.reportId,
                        date: reportData.date || shareData.reportId,
                        projectName: reportData.projectName || 'مشروع غير مسمى',
                        location: reportData.location || 'غير محدد',
                        machines: reportData.machines || [],
                        workers: reportData.workers || [],
                        procurement: reportData.procurement || []
                    };
                }
            } catch (reportErr) {
                console.error('تعذر جلب تفاصيل التقرير الفرعي:', reportErr);
            }
            return null;
        }));

        allSharedReports = reports.filter(r => r !== null);
        allSharedReports.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

        populateMonthFilter();
        populateManualDaysList();
        applyFilters();

    } catch (error) {
        console.error(error);
        document.getElementById('daysGrid').innerHTML = `<div style="text-align:center;padding:40px;color:#ef4444">❌ فشل تحميل التقارير: ${error.message}</div>`;
        toast('حدث خطأ: ' + error.message);
    }
}

function populateMonthFilter() {
    const filterMonthSelect = document.getElementById('filterMonth');
    filterMonthSelect.innerHTML = '<option value="ALL">جميع الشهور والأعوام</option>';

    const months = new Set();
    allSharedReports.forEach(report => {
        if (report.date) {
            const parts = report.date.split('-');
            if (parts.length >= 2) {
                const monthYear = parts[0] + '-' + parts[1];
                months.add(monthYear);
            }
        }
    });

    const sortedMonths = Array.from(months).sort().reverse();
    sortedMonths.forEach(m => {
        const option = document.createElement('option');
        option.value = m;
        const dateObj = new Date(m + '-01');
        const monthName = dateObj.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
        option.textContent = monthName;
        filterMonthSelect.appendChild(option);
    });
}

function populateManualDaysList() {
    const container = document.getElementById('manualDaysList');
    container.innerHTML = '';

    // استخراج التواريخ الفريدة لتقارير هذا المستشار
    const uniqueDates = [...new Set(allSharedReports.map(r => r.date))].sort().reverse();

    if (!uniqueDates.length) {
        container.innerHTML = '<span style="font-size:11px;color:var(--text-muted)">لا توجد أيام مخصصة متاحة</span>';
        return;
    }

    uniqueDates.forEach(date => {
        const btn = document.createElement('button');
        btn.className = 'manual-day-btn';
        btn.textContent = date;
        btn.dataset.date = date;
        btn.onclick = (e) => {
            e.preventDefault();
            toggleManualDateSelection(btn, date);
        };
        container.appendChild(btn);
    });
}

function toggleManualDateSelection(buttonElement, dateStr) {
    const index = selectedManualDates.indexOf(dateStr);
    if (index > -1) {
        // إزالة اليوم من التحديد الفردي
        selectedManualDates.splice(index, 1);
        buttonElement.classList.remove('active-day');
    } else {
        // إضافة اليوم للتحديد الفردي
        selectedManualDates.push(dateStr);
        buttonElement.classList.add('active-day');
    }
    applyFilters();
}

function getWeekOfMonth(dateString) {
    if (!dateString) return 1;
    const parts = dateString.split('-');
    if (parts.length < 3) return 1;
    const day = parseInt(parts[2]);
    return Math.ceil(day / 7);
}

window.applyFilters = () => {
    const selectedMonth = document.getElementById('filterMonth').value;
    const selectedWeek = document.getElementById('filterWeek').value;
    const fromDate = document.getElementById('filterFromDate').value;
    const toDate = document.getElementById('filterToDate').value;

    filteredReports = allSharedReports.filter(report => {
        // 1. إذا قام المستخدم بتحديد أيام يدوية مخصصة، تكون لها الأولوية القصوى والكاملة
        if (selectedManualDates.length > 0) {
            return selectedManualDates.includes(report.date);
        }

        // 2. فلترة النطاق الزمني (من تاريخ / إلى تاريخ)
        if (fromDate && report.date < fromDate) return false;
        if (toDate && report.date > toDate) return false;

        // 3. فلترة الشهر والسنة
        if (selectedMonth !== 'ALL') {
            if (!report.date || !report.date.startsWith(selectedMonth)) return false;
        }

        // 4. فلترة الأسبوع من الشهر
        if (selectedWeek !== 'ALL') {
            const weekNum = getWeekOfMonth(report.date);
            if (weekNum != selectedWeek) return false;
        }

        return true;
    });

    calculateMetricsAndRender();
};

window.resetFilters = () => {
    document.getElementById('filterMonth').value = 'ALL';
    document.getElementById('filterWeek').value = 'ALL';
    document.getElementById('filterFromDate').value = '';
    document.getElementById('filterToDate').value = '';
    selectedManualDates = [];

    // إزالة اللون والستايل النشط من كافة أزرار التحديد اليدوي
    document.querySelectorAll('.manual-day-btn').forEach(btn => {
        btn.classList.remove('active-day');
    });

    applyFilters();
};

function calculateMetricsAndRender() {
    let totalDiesel = 0;
    let totalMaint = 0;
    let totalOilGrease = 0;
    let totalProc = 0;
    let totalMachinesHours = 0;

    filteredReports.forEach(report => {
        (report.machines || []).forEach(m => {
            totalDiesel += parseFloat(m.dieselCost) || 0;
            totalMaint += parseFloat(m.maintenanceCost) || 0;
            totalOilGrease += (parseFloat(m.oilCost) || 0) + (parseFloat(m.greaseCost) || 0);

            if (m.totalHours) {
                const hoursMatch = m.totalHours.match(/(\d+)/);
                if (hoursMatch) totalMachinesHours += parseInt(hoursMatch[1]);
            }
        });

        (report.procurement || []).forEach(p => {
            totalProc += parseFloat(p.price) || 0;
        });
    });

    const overallTotal = totalDiesel + totalMaint + totalOilGrease + totalProc;

    document.getElementById('aggDaysCount').innerText = filteredReports.length;
    document.getElementById('aggDiesel').innerText = totalDiesel.toFixed(2) + ' د.أ';
    document.getElementById('aggMaint').innerText = totalMaint.toFixed(2) + ' د.أ';
    document.getElementById('aggOil').innerText = totalOilGrease.toFixed(2) + ' د.أ';
    document.getElementById('aggProc').innerText = totalProc.toFixed(2) + ' د.أ';
    document.getElementById('aggTotal').innerText = overallTotal.toFixed(2) + ' د.أ';

    renderDaysList();
    renderAccountingTable();
    updateCharts(totalDiesel, totalMaint, totalOilGrease, totalProc, totalMachinesHours);
}

function renderDaysList() {
    const grid = document.getElementById('daysGrid');
    if (!filteredReports.length) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:80px;color:var(--text-secondary);">📭 لا توجد تقارير مشتركة تطابق شروط الفلترة المحددة</div>';
        return;
    }

    grid.innerHTML = filteredReports.map(day => {
        const safeOwner = escapeHtml(day.ownerId);
        const safeReport = escapeHtml(day.reportId);
        const safeDate = escapeHtml(day.date);
        const safeProject = escapeHtml(day.projectName);
        const safeLocation = escapeHtml(day.location);
        const weekNum = getWeekOfMonth(day.date);

        return `
                <div class="day-card">
                    <div class="day-card-header">
                        <span class="day-date">${safeDate}</span>
                        <span class="badge-week">الأسبوع ${weekNum}</span>
                    </div>
                    <div class="day-project">${safeProject}</div>
                    <div class="day-location">📍 ${safeLocation}</div>
                    <div class="day-stats" style="display:flex;gap:8px;margin-bottom:12px;">
                        <span style="font-size:11px;background:#1a1f2d;padding:4px 8px;border-radius:4px;">⚙️ آليات: ${(day.machines || []).length}</span>
                        <span style="font-size:11px;background:#1a1f2d;padding:4px 8px;border-radius:4px;">👷 عمال: ${(day.workers || []).length}</span>
                        <span style="font-size:11px;background:#1a1f2d;padding:4px 8px;border-radius:4px;">🛒 مشتريات: ${(day.procurement || []).length}</span>
                    </div>
                    <div class="card-actions">
                        <button class="btn-analytics" onclick="window.location.href='./pages/analytics.html?owner=${safeOwner}&report=${safeReport}'">📊 تحليل البيانات</button>
                        <button class="btn-view" onclick="window.location.href='./pages/viewer_report.html?owner=${safeOwner}&date=${safeReport}'">📂 عرض التقرير</button>
                    </div>
                </div>
            `;
    }).join('');
}

function renderAccountingTable() {
    const tbody = document.getElementById('accountingTbody');
    if (!filteredReports.length) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center;">لا توجد بيانات مفلترة لعرضها</td></tr>';
        return;
    }

    tbody.innerHTML = filteredReports.map(day => {
        let diesel = 0, maint = 0, oil = 0, proc = 0;
        (day.machines || []).forEach(m => {
            diesel += parseFloat(m.dieselCost) || 0;
            maint += parseFloat(m.maintenanceCost) || 0;
            oil += (parseFloat(m.oilCost) || 0) + (parseFloat(m.greaseCost) || 0);
        });
        (day.procurement || []).forEach(p => {
            proc += parseFloat(p.price) || 0;
        });

        const dayTotal = diesel + maint + oil + proc;
        const safeOwner = escapeHtml(day.ownerId);
        const safeReport = escapeHtml(day.reportId);

        return `
                <tr>
                    <td><strong>${escapeHtml(day.date)}</strong></td>
                    <td>${escapeHtml(day.projectName)}</td>
                    <td>📍 ${escapeHtml(day.location)}</td>
                    <td>${diesel.toFixed(2)} د.أ</td>
                    <td>${maint.toFixed(2)} د.أ</td>
                    <td>${oil.toFixed(2)} د.أ</td>
                    <td>${proc.toFixed(2)} د.أ</td>
                    <td style="font-weight:bold;color:var(--accent);">${dayTotal.toFixed(2)} د.أ</td>
                    <td><button class="btn-secondary" style="padding:4px 8px;font-size:11px;" onclick="window.location.href='./pages/viewer_report.html?owner=${safeOwner}&date=${safeReport}'">📂 معاينة</button></td>
                </tr>
            `;
    }).join('');
}

function updateCharts(diesel, maint, oil, proc, totalHours) {
    const ctxPie = document.getElementById('expenseCategoryChart').getContext('2d');
    if (pieChartInstance) pieChartInstance.destroy();

    pieChartInstance = new Chart(ctxPie, {
        type: 'pie',
        data: {
            labels: ['ديزل الآليات', 'أعمال الصيانة', 'زيوت وشحوم الآليات', 'توريد المشتريات العامة'],
            datasets: [{
                data: [diesel, maint, oil, proc],
                backgroundColor: ['#3b82f6', '#f59e0b', '#10b981', '#ef4444'],
                borderColor: '#1a1f2d',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#e8edf8', font: { family: 'Tajawal' } }
                }
            }
        }
    });

    const ctxBar = document.getElementById('expenseTrendChart').getContext('2d');
    if (barChartInstance) barChartInstance.destroy();

    const trendDays = [...filteredReports].reverse().slice(-7);
    const labels = trendDays.map(d => d.date);

    const costsData = trendDays.map(d => {
        let sum = 0;
        (d.machines || []).forEach(m => {
            sum += (parseFloat(m.dieselCost) || 0) + (parseFloat(m.maintenanceCost) || 0) + (parseFloat(m.oilCost) || 0) + (parseFloat(m.greaseCost) || 0);
        });
        (d.procurement || []).forEach(p => sum += parseFloat(p.price) || 0);
        return sum;
    });

    const hoursData = trendDays.map(d => {
        let sumHours = 0;
        (d.machines || []).forEach(m => {
            if (m.totalHours) {
                const match = m.totalHours.match(/(\d+)/);
                if (match) sumHours += parseInt(match[1]);
            }
        });
        return sumHours;
    });

    barChartInstance = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'إجمالي الصرف اليومي (د.أ)',
                    data: costsData,
                    backgroundColor: 'rgba(59, 130, 246, 0.7)',
                    yAxisID: 'y'
                },
                {
                    label: 'ساعات تشغيل المعدات الكلية',
                    data: hoursData,
                    type: 'line',
                    borderColor: '#10b981',
                    backgroundColor: '#10b981',
                    borderWidth: 2,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { ticks: { color: '#e8edf8' } },
                y: {
                    type: 'linear',
                    position: 'left',
                    ticks: { color: '#e8edf8' },
                    grid: { color: '#2a3448' }
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    ticks: { color: '#e8edf8' },
                    grid: { drawOnChartArea: false }
                }
            },
            plugins: {
                legend: { labels: { color: '#e8edf8', font: { family: 'Tajawal' } } }
            }
        }
    });
}

window.switchTab = (tabId) => {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(cont => cont.classList.remove('active'));

    event.currentTarget.classList.add('active');
    document.getElementById(`tab-${tabId}`).classList.add('active');
};

window.exportAggregatedExcel = () => {
    if (!filteredReports.length) return toast('لا توجد بيانات مفلترة لتصديرها');

    const XLSX = window.XLSX;
    const wb = XLSX.utils.book_new();

    const summaryData = [
        ['البيان المحاسبي المجمع', 'القيمة الإجمالية'],
        ['عدد الأيام المفلترة والمدمجة', filteredReports.length],
        ['إجمالي تكلفة الديزل', filteredReports.reduce((sum, d) => sum + d.machines.reduce((s, m) => s + (parseFloat(m.dieselCost) || 0), 0), 0)],
        ['إجمالي تكلفة صيانة الآليات', filteredReports.reduce((sum, d) => sum + d.machines.reduce((s, m) => s + (parseFloat(m.maintenanceCost) || 0), 0), 0)],
        ['إجمالي تكلفة الزيوت والشحوم', filteredReports.reduce((sum, d) => sum + d.machines.reduce((s, m) => s + (parseFloat(m.oilCost) || 0) + (parseFloat(m.greaseCost) || 0), 0), 0)],
        ['إجمالي قيمة المشتريات والمواد', filteredReports.reduce((sum, d) => sum + d.procurement.reduce((s, p) => s + (parseFloat(p.price) || 0), 0), 0)],
        ['صافي التكلفة الكلية', filteredReports.reduce((sum, d) => {
            const machinesCost = d.machines.reduce((s, m) => s + (parseFloat(m.dieselCost) || 0) + (parseFloat(m.maintenanceCost) || 0) + (parseFloat(m.oilCost) || 0) + (parseFloat(m.greaseCost) || 0), 0);
            const procCost = d.procurement.reduce((s, p) => s + (parseFloat(p.price) || 0), 0);
            return sum + machinesCost + procCost;
        }, 0)]
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

    const detailData = [
        ['التاريخ', 'اسم المشروع', 'الموقع الجغرافي', 'تكلفة الديزل', 'تكلفة الصيانة', 'تكلفة الزيوت والشحوم', 'تكلفة المشتريات', 'الإجمالي']
    ];

    filteredReports.forEach(d => {
        let diesel = 0, maint = 0, oil = 0, proc = 0;
        d.machines.forEach(m => {
            diesel += parseFloat(m.dieselCost) || 0;
            maint += parseFloat(m.maintenanceCost) || 0;
            oil += (parseFloat(m.oilCost) || 0) + (parseFloat(m.greaseCost) || 0);
        });
        d.procurement.forEach(p => {
            proc += parseFloat(p.price) || 0;
        });
        detailData.push([d.date, d.projectName, d.location, diesel, maint, oil, proc, (diesel + maint + oil + proc)]);
    });
    const detailSheet = XLSX.utils.aoa_to_sheet(detailData);

    XLSX.utils.book_append_sheet(wb, summarySheet, 'لوحة التحكم والمؤشرات المالية');
    XLSX.utils.book_append_sheet(wb, detailSheet, 'كشف الحساب التفصيلي المجمع');

    const currentMonthVal = document.getElementById('filterMonth').value;
    const fileName = currentMonthVal === 'ALL' ? 'الجرد_المجمع_الشامل.xlsx' : `جرد_شهر_${currentMonthVal}.xlsx`;
    XLSX.writeFile(wb, fileName);
};

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function toast(msg) {
    const div = document.createElement('div');
    div.className = 'toast';
    div.innerText = msg;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}

window.logout = async () => { await signOut(auth); };
