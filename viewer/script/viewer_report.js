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

        let currentUser = null;
        let ownerId = null;
        let currentDate = null;
        let currentReport = null;

        onAuthStateChanged(auth, async (user) => {
            if (!user) { window.location.href = 'viewer_login.html'; return; }
            currentUser = user;

            // جلب الإحداثيات من الروابط الذكية
            const urlParams = new URLSearchParams(window.location.search);
            ownerId = urlParams.get('owner');
            currentDate = urlParams.get('date');

            if (!ownerId || !currentDate) {
                alert('معلمات الطلب غير صحيحة');
                window.location.href = 'shared_dashboard.html';
                return;
            }
            await loadReport();
        });

        async function loadReport() {
            try {
                // 1. جلب محتوى التقرير اليومي الأساسي من مجموعة المهندس
                const docRef = doc(db, 'users', ownerId, 'daily_reports', currentDate);
                const snap = await getDoc(docRef);

                if (!snap.exists()) {
                    alert('التقرير المطلوب غير موجود أو غير مشترك معك.');
                    window.location.href = 'shared_dashboard.html';
                    return;
                }

                currentReport = snap.data();

                // 2. جلب البريد الإلكتروني الحقيقي للمهندس المسؤول من مستند المشاركة المركب الآمن
                let emailDisplay = ownerId; // خطة بديلة (Fallback) للتقارير القديمة
                try {
                    const shareDocRef = doc(db, 'shared_reports', ownerId + '_' + currentDate);
                    const shareSnap = await getDoc(shareDocRef);
                    if (shareSnap.exists()) {
                        const shareData = shareSnap.data();
                        if (shareData.ownerEmail) {
                            emailDisplay = shareData.ownerEmail;
                        }
                    }
                } catch (shareErr) {
                    console.warn('تعذر جلب بريد المهندس الإلكتروني:', shareErr);
                }

                // حقن الإيميل الحقيقي أو الـ UID الاحتياطي في الترويسة
                document.getElementById('owner-email').innerText = emailDisplay;
                
                document.getElementById('project-name').innerText = currentReport.projectName || '—';
                document.getElementById('location').innerText = currentReport.location || '—';
                document.getElementById('report-date').innerText = currentReport.date || '—';

                renderMachines(currentReport.machines || []);
                renderWorkers(currentReport.workers || []);
                renderProcurement(currentReport.procurement || []);
                renderAttachments(currentReport.attachments || []);

            } catch (e) {
                console.error(e);
                alert('حدث خطأ في صلاحية قراءة الملف: ' + e.message);
            }
        }

        function renderMachines(machines) {
            const tbody = document.getElementById('machines-tbody');
            if (!machines.length) {
                tbody.innerHTML = '<tr><td colspan="24" class="no-data">لا توجد سجلات آليات مسجلة لهذا اليوم</td></tr>';
                return;
            }
            tbody.innerHTML = '';
            machines.forEach(m => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                <td>${m.date || '—'}</td>
                <td><strong>${m.machineType || '—'}</strong></td>
                <td>${m.machineNumber || '—'}</td>
                <td>${m.driverName || '—'}</td>
                <td>${m.startTime || '—'}</td>
                <td>${m.endTime || '—'}</td>
                <td><span class="badge badge-warning">${m.totalHours || '—'}</span></td>
                
                <!-- 🛠️ ملاحظات العمل المضافة حديثاً للمشاهد -->
                <td style="background: rgba(59, 130, 246, 0.02);"><div class="notes-text">${m.workNotes || '—'}</div></td>
                
                <td>${renderBoolBadge(m.dieselFilled)}</td>
                <td>${m.dieselAmount || '—'}</td>
                <td>${m.dieselCost ? m.dieselCost.toFixed(2) + ' د.أ' : '—'}</td>
                <td>${renderAttachmentLink(m.dieselReceipt)}</td>
                <td>${renderBoolBadge(m.hasMaintenance)}</td>
                <td><div class="notes-text">${m.maintenanceNotes || '—'}</div></td>
                <td>${m.maintenanceCost ? m.maintenanceCost.toFixed(2) + ' د.أ' : '—'}</td>
                <td>${renderAttachmentLink(m.maintenanceReceipt)}</td>
                <td>${renderBoolBadge(m.oilFilled)}</td>
                <td>${m.oilType || '—'}</td>
                <td>${m.oilCost ? m.oilCost.toFixed(2) + ' د.أ' : '—'}</td>
                <td>${renderAttachmentLink(m.oilReceipt)}</td>
                <td>${renderBoolBadge(m.greaseUsed)}</td>
                <td>${m.greaseType || '—'}</td>
                <td>${m.greaseCost ? m.greaseCost.toFixed(2) + ' د.أ' : '—'}</td>
                <td><span style="font-size: 11px; color:#10b981;">✍️ ${m.engineerSignature || '—'}</span></td>
            `;
                tbody.appendChild(tr);
            });
        }

        function renderWorkers(workers) {
            const tbody = document.getElementById('workers-tbody');
            if (!workers.length) {
                tbody.innerHTML = '<tr><td colspan="10" class="no-data">لا توجد سجلات عمال مسجلة لهذا اليوم</td></tr>';
                return;
            }
            tbody.innerHTML = '';
            workers.forEach(w => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                <td>${w.date || '—'}</td>
                <td><strong>${w.name || '—'}</strong></td>
                <td>${w.role || '—'}</td>
                <td>${w.arrivalTime || '—'}</td>
                <td>${w.departureTime || '—'}</td>
                <td>${w.workHours || '—'}</td>
                <td>${w.workArea || '—'}</td>
                <td>${w.completedArea || '—'}</td>
                <td><div class="notes-text">${w.notes || '—'}</div></td>
                <td><span style="font-size: 11px; color: #3b82f6;">✍️ ${w.signature || '—'}</span></td>
            `;
                tbody.appendChild(tr);
            });
        }

        function renderProcurement(proc) {
            const tbody = document.getElementById('procurement-tbody');
            if (!proc.length) {
                tbody.innerHTML = '<tr><td colspan="9" class="no-data">لا توجد سجلات مشتريات مسجلة لهذا اليوم</td></tr>';
                return;
            }
            tbody.innerHTML = '';
            proc.forEach(p => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                <td>${p.date || '—'}</td>
                <td><strong>${p.materialType || '—'}</strong></td>
                <td>${p.supplier || '—'}</td>
                <td>${p.quantity || '—'}</td>
                <td>${p.price ? p.price.toFixed(2) + ' د.أ' : '—'}</td>
                <td><div class="notes-text">${p.description || '—'}</div></td>
                <td>${p.invoiceNumber || '—'}</td>
                <td>${renderAttachmentLink(p.attachment)}</td>
                <td><span style="font-size: 11px; color: #10b981;">✍️ ${p.signature || '—'}</span></td>
            `;
                tbody.appendChild(tr);
            });
        }

        function renderAttachments(atts) {
            const tbody = document.getElementById('attachments-tbody');
            if (!atts || !atts.length) {
                tbody.innerHTML = '<tr><td colspan="4" class="no-data">لا توجد مرفقات مستقلة مرفوعة مع هذا اليوم</td></tr>';
                return;
            }
            tbody.innerHTML = '';
            atts.forEach(a => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                <td><strong>${a.fileName}</strong></td>
                <td>${a.fileType ? a.fileType.split('/')[1].toUpperCase() : 'PDF'}</td>
                <td>${a.uploadedAt ? new Date(a.uploadedAt).toLocaleDateString('ar-EG') : '—'}</td>
                <td><a href="${a.downloadURL}" target="_blank" class="btn-link">📂 معاينة الملف</a></td>
            `;
                tbody.appendChild(tr);
            });
        }

        function renderBoolBadge(val) {
            if (val === 'TRUE' || val === true) return '<span class="badge badge-success">نعم</span>';
            return '<span class="badge badge-danger">لا</span>';
        }

        function renderAttachmentLink(att) {
            if (att && att.downloadURL) {
                return `<a href="${att.downloadURL}" target="_blank" class="btn-link" title="${att.fileName}">👁️ عرض الفاتورة</a>`;
            }
            return '<span style="color:var(--text-muted);">لا يوجد</span>';
        }

        window.switchTab = (tab) => {
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(cont => cont.classList.remove('active'));

            document.querySelector(`.tab-btn[onclick*="${tab}"]`).classList.add('active');
            document.getElementById(`tab-${tab}`).classList.add('active');
        };

        window.exportExcel = () => {
            if (!currentReport) return;
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

            XLSX.utils.book_append_sheet(wb, machinesSheet, 'سجل المعدات والآليات');
            XLSX.utils.book_append_sheet(wb, workersSheet, 'سجل العاملين والعمال');
            XLSX.utils.book_append_sheet(wb, procurementSheet, 'المشتريات والتوريد');

            XLSX.writeFile(wb, `تقرير_معاينة_${currentDate}.xlsx`);
        };