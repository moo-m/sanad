import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, serverTimestamp, query, where, arrayUnion, arrayRemove } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyDEVzj2FOCXJCbgDmdmQWiyDv8kB4IglKE",
    authDomain: "engineering-87472.firebaseapp.com",
    projectId: "engineering-87472",
    storageBucket: "engineering-87472.firebasestorage.app",
    messagingSenderId: "712205545095",
    appId: "1:712205545095:web:ebd7e69c1850ca857c5222"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let currentShareReportId = null;

onAuthStateChanged(auth, (user) => {
    if (!user) { window.location.href = './src/pages/login.html'; return; }
    currentUser = user;
    document.getElementById('userEmail').innerText = user.email;
    loadDashboard();
});

// ===================== دوال البيانات الافتراضية =====================
function getDefaultMachines(date) {
    return [
        { date, machineType: "Loader", machineNumber: "", driverName: "حمد الدمانية", startTime: "09:00", endTime: "16:00", totalHours: "7 ساعات", dieselFilled: "FALSE", dieselAmount: "", dieselCost: 0, dieselReceipt: null, hasMaintenance: "FALSE", maintenanceNotes: "", maintenanceCost: 0, maintenanceReceipt: null, oilFilled: "FALSE", oilType: "", oilCost: 0, oilReceipt: null, greaseUsed: "FALSE", greaseType: "", greaseCost: 0, engineerSignature: "" },
        { date, machineType: "Grader Cat 140h", machineNumber: "", driverName: "محمد الشناوي", startTime: "08:00", endTime: "16:00", totalHours: "8 ساعات", dieselFilled: "FALSE", dieselAmount: "", dieselCost: 0, dieselReceipt: null, hasMaintenance: "TRUE", maintenanceNotes: "تزويد زيت", maintenanceCost: 0, maintenanceReceipt: null, oilFilled: "TRUE", oilType: "", oilCost: 0, oilReceipt: null, greaseUsed: "TRUE", greaseType: "", greaseCost: 0, engineerSignature: "" },
        { date, machineType: "Bulldozer Cat D8R", machineNumber: "36-96273", driverName: "محمد الكوز", startTime: "08:00", endTime: "14:00", totalHours: "6 ساعات", dieselFilled: "TRUE", dieselAmount: "591", dieselCost: 0, dieselReceipt: null, hasMaintenance: "FALSE", maintenanceNotes: "", maintenanceCost: 0, maintenanceReceipt: null, oilFilled: "FALSE", oilType: "", oilCost: 0, oilReceipt: null, greaseUsed: "TRUE", greaseType: "", greaseCost: 0, engineerSignature: "" },
        { date, machineType: "Digger Hitachi ZX350h", machineNumber: "45-23502", driverName: "خالد محمد", startTime: "08:00", endTime: "15:00", totalHours: "7 ساعات", dieselFilled: "FALSE", dieselAmount: "", dieselCost: 0, dieselReceipt: null, hasMaintenance: "FALSE", maintenanceNotes: "", maintenanceCost: 0, maintenanceReceipt: null, oilFilled: "FALSE", oilType: "", oilCost: 0, oilReceipt: null, greaseUsed: "TRUE", greaseType: "", greaseCost: 0, engineerSignature: "" },
        { date, machineType: "قلاب أحمر", machineNumber: "", driverName: "عايد أبو تايه", startTime: "08:00", endTime: "12:00", totalHours: "4 ساعات", dieselFilled: "FALSE", dieselAmount: "", dieselCost: 0, dieselReceipt: null, hasMaintenance: "FALSE", maintenanceNotes: "", maintenanceCost: 0, maintenanceReceipt: null, oilFilled: "FALSE", oilType: "", oilCost: 0, oilReceipt: null, greaseUsed: "FALSE", greaseType: "", greaseCost: 0, engineerSignature: "" },
        { date, machineType: "قلاب أزرق", machineNumber: "", driverName: "حاتم الدماني", startTime: "08:00", endTime: "12:00", totalHours: "4 ساعات", dieselFilled: "TRUE", dieselAmount: "60", dieselCost: 51, dieselReceipt: null, hasMaintenance: "FALSE", maintenanceNotes: "", maintenanceCost: 0, maintenanceReceipt: null, oilFilled: "FALSE", oilType: "", oilCost: 0, oilReceipt: null, greaseUsed: "FALSE", greaseType: "", greaseCost: 0, engineerSignature: "" }
    ];
}
function getDefaultWorkers(date) {
    return [
        { date, name: "عبدالله النقروز", role: "متعدد الاليات", arrivalTime: 7, departureTime: 5, workHours: 9, workArea: "الجفر", completedArea: "", notes: "", signature: "" },
        { date, name: "جبريل النقروز", role: "عامل", arrivalTime: 7, departureTime: 5, workHours: 9, workArea: "الجفر", completedArea: "", notes: "", signature: "" },
        { date, name: "محمد الشناوي", role: "سايق جريدر", arrivalTime: 7, departureTime: 5, workHours: 9, workArea: "الجفر", completedArea: "", notes: "", signature: "" },
        { date, name: "محمد الكوز", role: "سايق بلدوزر", arrivalTime: 7, departureTime: 5, workHours: 9, workArea: "الجفر", completedArea: "", notes: "", signature: "" },
        { date, name: "خالد عبدالله", role: "سايق جفاره", arrivalTime: 7, departureTime: 5, workHours: 9, workArea: "الجفر", completedArea: "", notes: "", signature: "" }
    ];
}
function getDefaultProcurement(date) {
    return [
        { date, materialType: "ديزل", supplier: "", quantity: 800, price: 680, description: "", invoiceNumber: "", attachment: null, signature: "" },
        { date, materialType: "ديزل", supplier: "", quantity: 900, price: 765, description: "", invoiceNumber: "", attachment: null, signature: "" },
        { date, materialType: "", supplier: "", quantity: "", price: 0, description: "", invoiceNumber: "", attachment: null, signature: "" },
        { date, materialType: "", supplier: "", quantity: "", price: 0, description: "", invoiceNumber: "", attachment: null, signature: "" },
        { date, materialType: "", supplier: "", quantity: "", price: 0, description: "", invoiceNumber: "", attachment: null, signature: "" }
    ];
}

// ===================== تحميل لوحة التحكم (نسخة آمنة ومحدثة) =====================
async function loadDashboard() {
    try {
        const uid = currentUser.uid;

        // 1. جلب التقارير اليومية الخاصة بالمهندس
        const reportsSnap = await getDocs(
            collection(db, 'users', uid, 'daily_reports')
        );

        // 2. حل أمني واقتصادي: جلب كل مستندات المشاركة التي تخص هذا المهندس فقط بطلب واحد مفلتر
        const sharesQuery = query(
            collection(db, 'shared_reports'),
            where('ownerId', '==', uid)
        );
        const sharesQuerySnap = await getDocs(sharesQuery);

        // تحويل ناتج المشاركات إلى الخريطة (Map) لتسهيل ربطها بالتقارير
        const shareMap = {};
        sharesQuerySnap.docs.forEach(docSnap => {
            const data = docSnap.data();
            if (data.reportId) {
                shareMap[data.reportId] = data.viewers || [];
            }
        });

        // 3. بناء مصفوفة الأيام ودمج بيانات المشاركة بأمان
        const days = reportsSnap.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data(),
            sharedWith: shareMap[docSnap.id] || []
        }));

        // ترتيب تنازلي حسب التاريخ
        days.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

        // حساب الإحصائيات
        let totalExp = 0, totalWorkers = 0, lastEdit = null;
        days.forEach(day => {
            (day.machines || []).forEach(m =>
                totalExp += (parseFloat(m.dieselCost) || 0) + (parseFloat(m.maintenanceCost) || 0)
                + (parseFloat(m.oilCost) || 0) + (parseFloat(m.greaseCost) || 0)
            );
            (day.procurement || []).forEach(p => totalExp += parseFloat(p.price) || 0);
            totalWorkers += (day.workers || []).length;
            if (!lastEdit || (day.updatedAt && day.updatedAt.toMillis?.() > (lastEdit.toMillis?.() || 0))) {
                lastEdit = day.updatedAt;
            }
        });

        document.getElementById('daysCount').innerText = days.length;
        document.getElementById('totalExpenses').innerHTML = (Math.round(totalExp) || 0).toLocaleString('ar-EG') + ' د.أ';
        document.getElementById('totalWorkers').innerText = totalWorkers;
        document.getElementById('lastEdit').innerText = lastEdit
            ? new Date(lastEdit.toDate()).toLocaleDateString('ar-EG') : '—';

        renderDays(days);
    } catch (error) {
        console.error('خطأ في تحميل البيانات:', error);
        let hint = '';
        if (error.message?.includes('index')) {
            hint = '<br><small style="color:#f59e0b">تأكد من إنشاء Index في Firebase Console إذا تطلب الأمر.</small>';
        }
        document.getElementById('daysGrid').innerHTML =
            `<div style="grid-column:1/-1;text-align:center;padding:60px;color:#ef4444">
                    ❌ خطأ في تحميل البيانات من السيرفر<br>
                    <small style="color:#9ca3af">${error.message}</small>
                    ${hint}
                  </div>`;
        toast('حدث خطأ في تحميل البيانات: ' + error.message);
    }
}

function renderDays(days) {
    const grid = document.getElementById('daysGrid');
    if (!days.length) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:80px;color:#9ca3af">📋 لا توجد أيام مسجلة<br>انقر على "إنشاء يوم جديد" للبدء</div>';
        return;
    }
    grid.innerHTML = days.map(day => {
        const safeProject = escapeHtml(day.projectName || '—');
        const safeLocation = escapeHtml(day.location || '—');
        const safeDate = escapeHtml(day.date || '');
        const safeId = escapeHtml(day.id || '');
        const lastEditStr = day.updatedAt
            ? new Date(day.updatedAt.toDate()).toLocaleDateString('ar-EG') : '';
        const sharedHtml = day.sharedWith.length
            ? day.sharedWith.map(e => `<span>${escapeHtml(e)}</span>`).join('')
            : 'لا أحد';
        return `
            <div class="day-card" data-report-id="${safeId}">
                <div class="day-card-header">
                    <div class="day-date">${safeDate}</div>
                    <div class="day-last-edit">${lastEditStr}</div>
                </div>
                <div class="day-project">${safeProject}</div>
                <div class="day-location">📍 ${safeLocation}</div>
                <div class="day-stats">
                    <div class="day-stat">⚙️ آليات: <span>${(day.machines || []).length}</span></div>
                    <div class="day-stat">👷 عمال: <span>${(day.workers || []).length}</span></div>
                    <div class="day-stat">🛒 مشتريات: <span>${(day.procurement || []).length}</span></div>
                </div>
                <div class="shared-users">مشارك مع: ${sharedHtml}</div>
                <div class="day-actions">
                    <button class="share-btn" data-report-id="${safeId}">🔗 مشاركة</button>
                    <button class="delete-btn" data-report-id="${safeId}">🗑️ حذف</button>
                    <button class="open-btn" data-report-id="${safeId}">📂 فتح</button>
                </div>
            </div>
            `;
    }).join('');

    grid.querySelectorAll('.share-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            openShareModal(btn.dataset.reportId);
        });
    });
    grid.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            deleteDay(btn.dataset.reportId);
        });
    });
    grid.querySelectorAll('.open-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            window.location.href = `./src/pages/report.html?date=${btn.dataset.reportId}`;
        });
    });
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ===================== إدارة المشاركات =====================
window.openShareModal = async (reportId) => {
    currentShareReportId = reportId;
    document.getElementById('shareEmail').value = 'omar@gmail.com';
    document.getElementById('shareError').style.display = 'none';
    const shareListDiv = document.getElementById('shareList');
    shareListDiv.innerHTML = '<div style="font-size:12px;color:#9ca3af;margin-bottom:8px;">⏳ جارٍ التحميل...</div>';
    document.getElementById('shareModal').classList.add('active');

    try {
        const shareSnap = await getDoc(doc(db, 'shared_reports', currentUser.uid + '_' + reportId));
        const sharedWith = shareSnap.exists() ? (shareSnap.data().viewers || []) : [];

        shareListDiv.innerHTML = '<div style="font-size:12px;color:#9ca3af;margin-bottom:8px;">المشاركون الحاليون:</div>';
        if (sharedWith.length === 0) {
            shareListDiv.innerHTML += '<div style="font-size:12px;">لا يوجد مشاركون</div>';
        } else {
            sharedWith.forEach(email => {
                const item = document.createElement('div');
                item.className = 'share-item';
                item.innerHTML = `<span class="share-email">${escapeHtml(email)}</span>`;
                const unshareBtn = document.createElement('button');
                unshareBtn.className = 'unshare-btn';
                unshareBtn.textContent = 'إلغاء المشاركة';
                unshareBtn.addEventListener('click', () => unshare(reportId, email));
                item.appendChild(unshareBtn);
                shareListDiv.appendChild(item);
            });
        }
    } catch (err) {
        shareListDiv.innerHTML = `<div style="font-size:12px;color:#ef4444;">خطأ في جلب المشاركين: ${escapeHtml(err.message)}</div>`;
    }
};

window.unshare = async (reportId, viewerEmail) => {
    try {
        const shareRef = doc(db, 'shared_reports', currentUser.uid + '_' + reportId);
        await updateDoc(shareRef, { viewers: arrayRemove(viewerEmail) });
        toast('تم إلغاء المشاركة');
        closeModal('shareModal');
        loadDashboard();
    } catch (error) {
        console.error(error);
        toast('خطأ: ' + error.message);
    }
};

document.getElementById('confirmShareBtn').onclick = async () => {
    const viewerEmail = document.getElementById('shareEmail').value.trim();
    const errorDiv = document.getElementById('shareError');
    errorDiv.style.display = 'none';

    if (!viewerEmail) {
        errorDiv.textContent = 'يرجى إدخال البريد الإلكتروني';
        errorDiv.style.display = 'block';
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(viewerEmail)) {
        errorDiv.textContent = 'البريد الإلكتروني غير صحيح';
        errorDiv.style.display = 'block';
        return;
    }

    const shareRef = doc(db, 'shared_reports', currentUser.uid + '_' + currentShareReportId);
    try {
        const shareSnap = await getDoc(shareRef);
        if (shareSnap.exists()) {
            const viewers = shareSnap.data().viewers || [];
            if (viewers.includes(viewerEmail)) {
                errorDiv.textContent = 'هذا التقرير مشترك بالفعل مع هذا المشاهد';
                errorDiv.style.display = 'block';
                return;
            }
            await updateDoc(shareRef, { viewers: arrayUnion(viewerEmail) });
        } else {
            await setDoc(shareRef, {
                ownerId: currentUser.uid,
                ownerEmail: currentUser.email, 
                reportId: currentShareReportId,
                viewers: [viewerEmail],
                createdAt: serverTimestamp()
            });
        }
        toast(`تمت المشاركة مع ${viewerEmail}`);
        closeModal('shareModal');
        loadDashboard();
    } catch (err) {
        errorDiv.textContent = 'خطأ: ' + err.message;
        errorDiv.style.display = 'block';
    }
};

// ===================== حذف يوم =====================
window.deleteDay = async (dateId) => {
    if (!confirm('هل أنت متأكد من حذف هذا اليوم؟')) return;
    try {
        await deleteDoc(doc(db, 'shared_reports', currentUser.uid + '_' + dateId)).catch(() => { });
        await deleteDoc(doc(db, 'users', currentUser.uid, 'daily_reports', dateId));
        toast('تم حذف اليوم');
        loadDashboard();
    } catch (error) {
        toast('خطأ: ' + error.message);
    }
};

// ===================== إنشاء يوم جديد =====================
window.openCreateDayModal = () => {
    document.getElementById('newDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('createDayModal').classList.add('active');
};

document.getElementById('confirmCreateBtn').onclick = async () => {
    const date = document.getElementById('newDate').value;
    const project = document.getElementById('newProject').value.trim() || 'مشروع الجفر';
    const location = document.getElementById('newLocation').value.trim() || 'الجفر';
    if (!date) { toast('اختر التاريخ'); return; }

    const btn = document.getElementById('confirmCreateBtn');
    btn.disabled = true;
    btn.textContent = '⏳ جارٍ الإنشاء...';
    try {
        await setDoc(doc(db, 'users', currentUser.uid, 'daily_reports', date), {
            date, projectName: project, location,
            createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
            machines: getDefaultMachines(date),
            workers: getDefaultWorkers(date),
            procurement: getDefaultProcurement(date),
            attachments: []
        });
        closeModal('createDayModal');
        toast('تم إنشاء اليوم');
        await loadDashboard();
        window.location.href = `./src/pages/report.html?date=${date}`;
    } catch (e) {
        toast('خطأ: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'إنشاء';
    }
};

// ===================== دوال مساعدة =====================
window.closeModal = (modalId) => {
    document.getElementById(modalId).classList.remove('active');
    if (modalId === 'shareModal') currentShareReportId = null;
};

window.logout = async () => { await signOut(auth); };

function toast(msg) {
    const div = document.createElement('div');
    div.className = 'toast';
    div.innerText = msg;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}
window.toast = toast;