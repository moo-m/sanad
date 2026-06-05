
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js';

const firebaseConfig = { apiKey: "AIzaSyDEVzj2FOCXJCbgDmdmQWiyDv8kB4IglKE", authDomain: "engineering-87472.firebaseapp.com", projectId: "engineering-87472", storageBucket: "engineering-87472.firebasestorage.app", messagingSenderId: "712205545095", appId: "1:712205545095:web:ebd7e69c1850ca857c5222" };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const CLOUD_NAME = "dj10aagp8";
const UPLOAD_PRESET = "frontend_eng";

let currentUser = null, currentReport = null, currentDate = null, saveTimer = null;

onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = 'login.html'; return; }
    currentUser = user;
    const urlParams = new URLSearchParams(window.location.search);
    currentDate = urlParams.get('date');
    if (!currentDate) { window.location.href = 'dashboard.html'; return; }
    await loadReport();
});

async function loadReport() {
    const docRef = doc(db, 'users', currentUser.uid, 'daily_reports', currentDate);
    const snap = await getDoc(docRef);
    if (!snap.exists()) { alert('التقرير غير موجود'); window.location.href = 'dashboard.html'; return; }
    currentReport = snap.data();
    document.getElementById('project-name').innerText = currentReport.projectName || '—';
    document.getElementById('location').innerText = currentReport.location || '—';
    document.getElementById('report-date').innerText = currentReport.date || '—';
    renderMachines(currentReport.machines || []);
    renderWorkers(currentReport.workers || []);
    renderProcurement(currentReport.procurement || []);
    renderAttachments(currentReport.attachments || []);
}

function scheduleAutoSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
        if (!currentReport) return;
        await updateDoc(doc(db, 'users', currentUser.uid, 'daily_reports', currentDate), {
            machines: currentReport.machines,
            workers: currentReport.workers,
            procurement: currentReport.procurement,
            attachments: currentReport.attachments || [],
            updatedAt: serverTimestamp()
        });
        const badge = document.getElementById('auto-save-badge');
        badge.style.display = 'block';
        setTimeout(() => badge.style.display = 'none', 2000);
    }, 1000);
}

async function uploadToCloudinary(file, folderHint) {
    return new Promise((resolve, reject) => {
        if (file.size > 10 * 1024 * 1024) { reject('حجم الملف يتجاوز 10 ميجابايت'); return; }
        const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (!allowed.includes(file.type)) { reject('نوع الملف غير مدعوم'); return; }
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);
        formData.append('folder', `reports/${currentUser.uid}/${currentDate}/${folderHint}`);
        fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => { if (data.error) reject(data.error.message); else resolve({ downloadURL: data.secure_url, storagePath: data.public_id, fileName: file.name, fileType: file.type, fileSize: file.size, uploadedAt: new Date().toISOString() }); })
            .catch(reject);
    });
}

function calculateTimeDifference(start, end) {
    if (!start || !end) return '';
    let [sh, sm] = start.split(':').map(Number);
    let [eh, em] = end.split(':').map(Number);
    let startMin = sh * 60 + sm, endMin = eh * 60 + em;
    if (endMin < startMin) endMin += 24 * 60;
    let diff = endMin - startMin;
    let hours = Math.floor(diff / 60), mins = diff % 60;
    return mins ? `${hours} ساعة و ${mins} دقيقة` : `${hours} ساعات`;
}

// عرض الآليات (النسخة النظيفة مع عمود الملاحظات وعودة المجموع التلقائي المقفل)
function renderMachines(machines) {
    const tbody = document.getElementById('machines-tbody');
    tbody.innerHTML = '';
    machines.forEach((m, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
                <td><input type="date" value="${m.date || ''}" onchange="updateMachine(${idx},'date',this.value)"></td>
                <td><input value="${m.machineType || ''}" onchange="updateMachine(${idx},'machineType',this.value)"></td>
                <td><input value="${m.machineNumber || ''}" onchange="updateMachine(${idx},'machineNumber',this.value)"></td>
                <td><input value="${m.driverName || ''}" onchange="updateMachine(${idx},'driverName',this.value)"></td>
                <td><input type="time" value="${m.startTime || ''}" onchange="updateMachineTime(${idx},'startTime',this.value)"></td>
                <td><input type="time" value="${m.endTime || ''}" onchange="updateMachineTime(${idx},'endTime',this.value)"></td>
                
                <!-- المجموع عاد تلقائياً للقراءة فقط مع دمج زر التصفير التفاعلي داخله -->
                <td>
                    <div style="display:flex; gap:4px; align-items:center;">
                        <input readonly value="${m.totalHours || ''}" placeholder="تلقائي" style="min-width:60px;">
                        <button class="btn-icon" onclick="resetMachineHours(${idx})" title="تصفير ساعات العمل والتشغيل">🔄</button>
                    </div>
                </td>
                
                <!-- حقل ملاحظات العمل المعتمد بعد المجموع مباشرة -->
                <td><input value="${m.workNotes || ''}" onchange="updateMachine(${idx},'workNotes',this.value)" placeholder="أكتب ملاحظات الآلية والعمل..."></td>

                <td><select onchange="updateMachine(${idx},'dieselFilled',this.value)"><option value="FALSE" ${m.dieselFilled !== 'TRUE' ? 'selected' : ''}>لا</option><option value="TRUE" ${m.dieselFilled === 'TRUE' ? 'selected' : ''}>نعم</option></select></td>
                <td><input value="${m.dieselAmount || ''}" onchange="updateMachine(${idx},'dieselAmount',this.value)"></td>
                <td><input type="number" step="0.01" value="${m.dieselCost || 0}" onchange="updateMachine(${idx},'dieselCost',this.value)"></td>
                <td>${attachmentCell(m.dieselReceipt, idx, 'dieselReceipt')}</td>
                <td><select onchange="updateMachine(${idx},'hasMaintenance',this.value)"><option value="FALSE" ${m.hasMaintenance !== 'TRUE' ? 'selected' : ''}>لا</option><option value="TRUE" ${m.hasMaintenance === 'TRUE' ? 'selected' : ''}>نعم</option></select></td>
                <td><input value="${m.maintenanceNotes || ''}" onchange="updateMachine(${idx},'maintenanceNotes',this.value)"></td>
                <td><input type="number" step="0.01" value="${m.maintenanceCost || 0}" onchange="updateMachine(${idx},'maintenanceCost',this.value)"></td>
                <td>${attachmentCell(m.maintenanceReceipt, idx, 'maintenanceReceipt')}</td>
                <td><select onchange="updateMachine(${idx},'oilFilled',this.value)"><option value="FALSE" ${m.oilFilled !== 'TRUE' ? 'selected' : ''}>لا</option><option value="TRUE" ${m.oilFilled === 'TRUE' ? 'selected' : ''}>نعم</option></select></td>
                <td><input value="${m.oilType || ''}" onchange="updateMachine(${idx},'oilType',this.value)"></td>
                <td><input type="number" step="0.01" value="${m.oilCost || 0}" onchange="updateMachine(${idx},'oilCost',this.value)"></td>
                <td>${attachmentCell(m.oilReceipt, idx, 'oilReceipt')}</td>
                <td><select onchange="updateMachine(${idx},'greaseUsed',this.value)"><option value="FALSE" ${m.greaseUsed !== 'TRUE' ? 'selected' : ''}>لا</option><option value="TRUE" ${m.greaseUsed === 'TRUE' ? 'selected' : ''}>نعم</option></select></td>
                <td><input value="${m.greaseType || ''}" onchange="updateMachine(${idx},'greaseType',this.value)"></td>
                <td><input type="number" step="0.01" value="${m.greaseCost || 0}" onchange="updateMachine(${idx},'greaseCost',this.value)"></td>
                <td><input value="${m.engineerSignature || ''}" onchange="updateMachine(${idx},'engineerSignature',this.value)"></td>
                <td><button class="btn-icon" onclick="deleteMachineRow(${idx})">🗑️</button></td>
            `;
        tbody.appendChild(tr);
    });
}

function attachmentCell(att, idx, field) {
    if (att && att.downloadURL) return `<div class="file-cell"><button onclick="window.open('${att.downloadURL}','_blank')">👁️ عرض</button><button onclick="deleteMachineAttachment(${idx},'${field}')">🗑️</button><span>${att.fileName}</span></div>`;
    else return `<label class="file-upload-label">📎 رفع<input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style="display:none" onchange="uploadMachineAttachment(${idx},'${field}',this)"></label>`;
}
window.uploadMachineAttachment = async (idx, field, input) => {
    const file = input.files[0]; if (!file) return;
    try {
        const meta = await uploadToCloudinary(file, `machines/${idx}`);
        currentReport.machines[idx][field] = meta;
        renderMachines(currentReport.machines);
        scheduleAutoSave();
    } catch (e) { alert(e.message); }
};
window.deleteMachineAttachment = async (idx, field) => {
    const att = currentReport.machines[idx][field];
    if (att && att.storagePath) await deleteObject(ref(storage, att.storagePath)).catch(() => { });
    delete currentReport.machines[idx][field];
    renderMachines(currentReport.machines);
    scheduleAutoSave();
};
window.updateMachine = (idx, field, value) => {
    currentReport.machines[idx][field] = (field.includes('Cost') || field.includes('cost')) ? parseFloat(value) || 0 : value;
    scheduleAutoSave();
};
window.updateMachineTime = (idx, field, value) => {
    currentReport.machines[idx][field] = value;
    const start = currentReport.machines[idx].startTime;
    const end = currentReport.machines[idx].endTime;
    if (start && end) {
        currentReport.machines[idx].totalHours = calculateTimeDifference(start, end);
    } else {
        currentReport.machines[idx].totalHours = '';
    }
    renderMachines(currentReport.machines);
    scheduleAutoSave();
};

// دالة تصفير ساعات العمل والتشغيل للآلية المحددة مع الحفظ التلقائي
window.resetMachineHours = (idx) => {
    currentReport.machines[idx].startTime = '';
    currentReport.machines[idx].endTime = '';
    currentReport.machines[idx].totalHours = '';
    renderMachines(currentReport.machines);
    scheduleAutoSave();
};

window.addMachineRow = () => { currentReport.machines.push({ date: currentDate }); renderMachines(currentReport.machines); scheduleAutoSave(); };
window.deleteMachineRow = (idx) => { currentReport.machines.splice(idx, 1); renderMachines(currentReport.machines); scheduleAutoSave(); };

// العمال
function renderWorkers(workers) {
    const tbody = document.getElementById('workers-tbody');
    tbody.innerHTML = '';
    workers.forEach((w, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
                <td><input type="date" value="${w.date || ''}" onchange="updateWorker(${idx},'date',this.value)"></td>
                <td><input value="${w.name || ''}" onchange="updateWorker(${idx},'name',this.value)"></td>
                <td><input value="${w.role || ''}" onchange="updateWorker(${idx},'role',this.value)"></td>
                <td><input type="number" value="${w.arrivalTime || ''}" onchange="updateWorker(${idx},'arrivalTime',this.value)"></td>
                <td><input type="number" value="${w.departureTime || ''}" onchange="updateWorker(${idx},'departureTime',this.value)"></td>
                <td><input type="number" value="${w.workHours || ''}" onchange="updateWorker(${idx},'workHours',this.value)"></td>
                <td><input value="${w.workArea || ''}" onchange="updateWorker(${idx},'workArea',this.value)"></td>
                <td><input value="${w.completedArea || ''}" onchange="updateWorker(${idx},'completedArea',this.value)"></td>
                <td><input value="${w.notes || ''}" onchange="updateWorker(${idx},'notes',this.value)"></td>
                <td><input value="${w.signature || ''}" onchange="updateWorker(${idx},'signature',this.value)"></td>
                <td><button onclick="deleteWorkerRow(${idx})">🗑️</button></td>
            `;
        tbody.appendChild(tr);
    });
}
window.updateWorker = (idx, field, val) => { currentReport.workers[idx][field] = val; scheduleAutoSave(); };
window.addWorkerRow = () => { currentReport.workers.push({ date: currentDate }); renderWorkers(currentReport.workers); scheduleAutoSave(); };
window.deleteWorkerRow = (idx) => { currentReport.workers.splice(idx, 1); renderWorkers(currentReport.workers); scheduleAutoSave(); };

// المشتريات
function renderProcurement(proc) {
    const tbody = document.getElementById('procurement-tbody');
    tbody.innerHTML = '';
    proc.forEach((p, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
                <td><input type="date" value="${p.date || ''}" onchange="updateProcurement(${idx},'date',this.value)"></td>
                <td><input value="${p.materialType || ''}" onchange="updateProcurement(${idx},'materialType',this.value)"></td>
                <td><input value="${p.supplier || ''}" onchange="updateProcurement(${idx},'supplier',this.value)"></td>
                <td><input type="number" value="${p.quantity || ''}" onchange="updateProcurement(${idx},'quantity',this.value)"></td>
                <td><input type="number" step="0.01" value="${p.price || 0}" onchange="updateProcurement(${idx},'price',this.value)"></td>
                <td><input value="${p.description || ''}" onchange="updateProcurement(${idx},'description',this.value)"></td>
                <td><input value="${p.invoiceNumber || ''}" onchange="updateProcurement(${idx},'invoiceNumber',this.value)"></td>
                <td>${procAttachmentCell(p.attachment, idx)}</td>
                <td><input value="${p.signature || ''}" onchange="updateProcurement(${idx},'signature',this.value)"></td>
                <td><button onclick="deleteProcurementRow(${idx})">🗑️</button></td>
            `;
        tbody.appendChild(tr);
    });
}
function procAttachmentCell(att, idx) {
    if (att && att.downloadURL) return `<div><button onclick="window.open('${att.downloadURL}','_blank')">👁️</button><button onclick="deleteProcurementAttachment(${idx})">🗑️</button> ${att.fileName}</div>`;
    else return `<label class="file-upload-label">📎 رفع<input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style="display:none" onchange="uploadProcurementAttachment(${idx},this)"></label>`;
}
window.uploadProcurementAttachment = async (idx, input) => {
    const file = input.files[0]; if (!file) return;
    try {
        const meta = await uploadToCloudinary(file, `procurement/${idx}`);
        currentReport.procurement[idx].attachment = meta;
        renderProcurement(currentReport.procurement);
        scheduleAutoSave();
    } catch (e) { alert(e.message); }
};
window.deleteProcurementAttachment = async (idx) => {
    const att = currentReport.procurement[idx].attachment;
    if (att && att.storagePath) await deleteObject(ref(storage, att.storagePath)).catch(() => { });
    delete currentReport.procurement[idx].attachment;
    renderProcurement(currentReport.procurement);
    scheduleAutoSave();
};
window.updateProcurement = (idx, field, val) => {
    if (field === 'price' || field === 'quantity') currentReport.procurement[idx][field] = parseFloat(val) || 0;
    else currentReport.procurement[idx][field] = val;
    scheduleAutoSave();
};
window.addProcurementRow = () => { currentReport.procurement.push({ date: currentDate }); renderProcurement(currentReport.procurement); scheduleAutoSave(); };
window.deleteProcurementRow = (idx) => { currentReport.procurement.splice(idx, 1); renderProcurement(currentReport.procurement); scheduleAutoSave(); };

// المرفقات المستقلة
function renderAttachments(atts) {
    const tbody = document.getElementById('attachments-tbody');
    tbody.innerHTML = '';
    atts.forEach((a, i) => {
        const row = tbody.insertRow();
        row.innerHTML = `<td>${a.fileName}</td><td>${a.fileType.split('/')[1]}</td><td>${new Date(a.uploadedAt).toLocaleDateString('ar-EG')}</td><td><button onclick="window.open('${a.downloadURL}','_blank')">📂 فتح</button></td><td><button onclick="deleteIndependentAttachment(${i})">🗑️</button></td>`;
    });
}
window.uploadIndependentAttachment = async () => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.pdf,.jpg,.jpeg,.png,.webp';
    input.onchange = async (e) => {
        const file = e.target.files[0]; if (!file) return;
        try {
            const meta = await uploadToCloudinary(file, 'general');
            if (!currentReport.attachments) currentReport.attachments = [];
            currentReport.attachments.push(meta);
            renderAttachments(currentReport.attachments);
            scheduleAutoSave();
        } catch (e) { alert(e.message); }
    };
    input.click();
};
window.deleteIndependentAttachment = async (idx) => {
    const att = currentReport.attachments[idx];
    if (att && att.storagePath) await deleteObject(ref(storage, att.storagePath)).catch(() => { });
    currentReport.attachments.splice(idx, 1);
    renderAttachments(currentReport.attachments);
    scheduleAutoSave();
};

// تصدير Excel
window.exportExcel = () => {
    const XLSX = window.XLSX;
    const wb = XLSX.utils.book_new();
    const machinesSheet = XLSX.utils.aoa_to_sheet([
        ['التاريخ', 'نوع الآلية', 'رقم الآلية', 'اسم السائق', 'ساعة البداية', 'ساعة النهاية', 'مجموع ساعات التشغيل', 'ملاحظات العمل', 'هل تم تعبئة ديزل؟', 'كمية الديزل المعبأة', 'تكلفة الديزل', 'هل يوجد صيانة؟', 'نوع الصيانة / الملاحظات', 'تكلفة الصيانة', 'هل تم تعبئة زيت و شحمة؟', 'كمية الزيت / نوعه', 'تكلفة الزيت', 'هل تم استخدام شحم؟', 'كمية الشحمة / نوعه', 'تكلفة الشحمة', 'توقيع مهندس الموقع'],
        ...currentReport.machines.map(m => [m.date, m.machineType, m.machineNumber, m.driverName, m.startTime, m.endTime, m.totalHours, m.workNotes || '', m.dieselFilled, m.dieselAmount, m.dieselCost, m.hasMaintenance, m.maintenanceNotes, m.maintenanceCost, m.oilFilled, m.oilType, m.oilCost, m.greaseUsed, m.greaseType, m.greaseCost, m.engineerSignature])
    ]);
    const workersSheet = XLSX.utils.aoa_to_sheet([
        ['التاريخ', 'الاسم', 'الوظيفة', 'وقت الحضور', 'وقت المغادرة', 'ساعات العمل', 'موقع / منطقة العمل', 'المساحة المنجزة', 'ملاحظات', 'توقيع المسؤول'],
        ...currentReport.workers.map(w => [w.date, w.name, w.role, w.arrivalTime, w.departureTime, w.workHours, w.workArea, w.completedArea, w.notes, w.signature])
    ]);
    const procurementSheet = XLSX.utils.aoa_to_sheet([
        ['التاريخ', 'النوع / المادة', 'المورد', 'الكمية', 'السعر الإجمالي', 'الوصف', 'رقم الفاتورة / سند الصرف', 'توقيع المسؤول'],
        ...currentReport.procurement.map(p => [p.date, p.materialType, p.supplier, p.quantity, p.price, p.description, p.invoiceNumber, p.signature])
    ]);
    XLSX.utils.book_append_sheet(wb, machinesSheet, 'Daily site log');
    XLSX.utils.book_append_sheet(wb, workersSheet, 'Worker sheet');
    XLSX.utils.book_append_sheet(wb, procurementSheet, 'Procurement');
    XLSX.writeFile(wb, `تقرير_${currentDate}.xlsx`);
};

window.switchTab = (tab) => {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(cont => cont.classList.remove('active'));
    document.querySelector(`.tab-btn[onclick*="${tab}"]`).classList.add('active');
    document.getElementById(`tab-${tab}`).classList.add('active');
};
