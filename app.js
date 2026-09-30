/**
 * 📱 نظام تقارير المداومة الذكي — نادي جسور الطلابي
 * الملف البرمجي الأساسي لإدارة الواجهة، المنطق الشرطي، وصياغة التقرير المعتمد.
 */

(function () {
  'use strict';

  // تهيئة تيليجرام ويب آب
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
  }

  // تهيئة قاعدة بيانات Firebase Cloud Firestore لنادي جسور
  const firebaseConfig = {
    apiKey: "AIzaSyAYdprBxSxDf_2mUve4EY7t5jDgo_2_Lb4",
    authDomain: "josour-djard.firebaseapp.com",
    projectId: "josour-djard",
    storageBucket: "josour-djard.firebasestorage.app",
    messagingSenderId: "830517852419",
    appId: "1:830517852419:web:80eb5c821346aedc63d136",
    measurementId: "G-B1VH7QBJHP"
  };

  // رابط تطبيق الويب الخاص بـ Google Sheets (Apps Script Webhook - يتولى الأرشفة والنشر الآمن في تيليجرام)
  const GOOGLE_SHEETS_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbxKhFCBKkYXlMw5N71jkN11B74xiSnvOarQppc2iEkkWitUu17oVrX69EaxJGH2-_sv/exec";

  let db = null;
  try {
    if (typeof firebase !== 'undefined') {
      if (!firebase.apps || !firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      db = firebase.firestore();
      console.log("Firebase Firestore connected successfully 🔥 (josour-djard)");
    }
  } catch (err) {
    console.warn("Firebase initialization warning:", err);
  }

  // عناصر واجهة المستخدم
  const elements = {
    // التبويبات
    tabMorning: document.getElementById('tabMorning'),
    tabEvening: document.getElementById('tabEvening'),
    morningHandoverSection: document.getElementById('morningHandoverSection'),
    eveningClosingSection: document.getElementById('eveningClosingSection'),

    // معلومات التاريخ
    displayDate: document.getElementById('displayDate'),
    displayDay: document.getElementById('displayDay'),
    displayWeek: document.getElementById('displayWeek'),

    // حقول المداومين
    primaryMember: document.getElementById('primaryMember'),
    primaryTimeFrom: document.getElementById('primaryTimeFrom'),
    primaryTimeTo: document.getElementById('primaryTimeTo'),
    assistantMember: document.getElementById('assistantMember'),
    assistantTimeFrom: document.getElementById('assistantTimeFrom'),
    assistantTimeTo: document.getElementById('assistantTimeTo'),

    // 1. الجاهزية والعتاد
    equipmentStatusRadios: document.getElementsByName('equipmentStatus'),
    equipmentDefectBox: document.getElementById('equipmentDefectBox'),
    equipmentDefectDetails: document.getElementById('equipmentDefectDetails'),
    defectSheetLoggedConfirm: document.getElementById('defectSheetLoggedConfirm'),

    chargingStatusRadios: document.getElementsByName('chargingStatus'),
    chargingDetailsBox: document.getElementById('chargingDetailsBox'),
    chargingChargedItems: document.getElementById('chargingChargedItems'),
    chargingReasonBox: document.getElementById('chargingReasonBox'),
    chargingNotChargedReason: document.getElementById('chargingNotChargedReason'),

    // 2. الاستقبال
    receptionNotes: document.getElementById('receptionNotes'),

    // 3. الإعارة والاسترجاع
    toggleLoanActivity: document.getElementById('toggleLoanActivity'),
    loanDetailsBox: document.getElementById('loanDetailsBox'),
    loanBorrowedItem: document.getElementById('loanBorrowedItem'),
    loanReturnedItem: document.getElementById('loanReturnedItem'),
    loanProtocolRadios: document.getElementsByName('loanProtocolFollowed'),
    loanExtraNotes: document.getElementById('loanExtraNotes'),

    // 4. المهام
    tasksCompleted: document.getElementById('tasksCompleted'),
    tasksPending: document.getElementById('tasksPending'),

    // 5. النظافة
    cleanlinessStatusRadios: document.getElementsByName('cleanlinessStatus'),
    cleanlinessReasonBox: document.getElementById('cleanlinessReasonBox'),
    cleanlinessDetails: document.getElementById('cleanlinessDetails'),

    // 6. الاحتياجات والطوارئ
    urgentNeeds: document.getElementById('urgentNeeds'),
    generalIncidents: document.getElementById('generalIncidents'),

    // 7. الصباحي (التسليم)
    updatesTransferredRadios: document.getElementsByName('updatesTransferred'),
    updatesTransferredReasonBox: document.getElementById('updatesTransferredReasonBox'),
    updatesTransferredReason: document.getElementById('updatesTransferredReason'),

    keyHandedOverRadios: document.getElementsByName('keyHandedOver'),
    keyHandedOverReasonBox: document.getElementById('keyHandedOverReasonBox'),
    keyHandedOverReason: document.getElementById('keyHandedOverReason'),

    // 7. المسائي (الغلق)
    closeWindow: document.getElementById('closeWindow'),
    organizePlace: document.getElementById('organizePlace'),
    turnOffElectronics: document.getElementById('turnOffElectronics'),
    lockDoor: document.getElementById('lockDoor'),
    keyReturnLocationSelect: document.getElementById('keyReturnLocationSelect'),
    customKeyLocationBox: document.getElementById('customKeyLocationBox'),
    customKeyLocation: document.getElementById('customKeyLocation'),

    // 8. الطابعة
    printerUsageRadios: document.getElementsByName('printerUsage'),
    printerDetailsBox: document.getElementById('printerDetailsBox'),
    printerPageCount: document.getElementById('printerPageCount'),
    printerPurpose: document.getElementById('printerPurpose'),

    // 9. التوصيات
    nextDutyRecommendations: document.getElementById('nextDutyRecommendations'),

    // الأزرار والنوافذ
    form: document.getElementById('dutyReportForm'),
    btnPreview: document.getElementById('btnPreview'),
    previewModal: document.getElementById('previewModal'),
    btnCloseModal: document.getElementById('btnCloseModal'),
    reportPreviewText: document.getElementById('reportPreviewText'),
    btnCopyText: document.getElementById('btnCopyText'),
    copyBtnLabel: document.getElementById('copyBtnLabel'),
    btnConfirmSend: document.getElementById('btnConfirmSend'),
    toastContainer: document.getElementById('toastContainer'),

    // أزرار وأقسام شريط التنقل الرئيسي
    btnNavReport: document.getElementById('btnNavReport'),
    btnNavSchedule: document.getElementById('btnNavSchedule'),
    btnNavAnalytics: document.getElementById('btnNavAnalytics'),
    viewReportSection: document.getElementById('viewReportSection'),
    viewScheduleSection: document.getElementById('viewScheduleSection'),
    viewAnalyticsSection: document.getElementById('viewAnalyticsSection'),

    // عناصر جدول المداومة السحابي
    btnToggleEditSchedule: document.getElementById('btnToggleEditSchedule'),
    btnEditScheduleIcon: document.getElementById('btnEditScheduleIcon'),
    btnEditScheduleText: document.getElementById('btnEditScheduleText'),
    btnSaveSchedule: document.getElementById('btnSaveSchedule'),
    scheduleDaysGrid: document.getElementById('scheduleDaysGrid'),
    scheduleSyncText: document.getElementById('scheduleSyncText'),

    // عناصر لوحة الإحصاءات
    statTotalReports: document.getElementById('statTotalReports'),
    statShiftSplit: document.getElementById('statShiftSplit'),
    statTotalPages: document.getElementById('statTotalPages'),
    statCleanlinessRate: document.getElementById('statCleanlinessRate'),
    statEquipHealthRate: document.getElementById('statEquipHealthRate'),
    leaderboardList: document.getElementById('leaderboardList'),
    recentReportsList: document.getElementById('recentReportsList')
  };

  // الحالة الحالية للتطبيق
  let currentShift = 'morning'; // 'morning' أو 'evening'

  // دالة التهيئة عند فتح التطبيق
  function init() {
    setupDateTime();
    setupShiftTabs();
    setupConditionalLogic();
    setupEventHandlers();
    setupLogoChangeHandler();
    autoFillUserData();
    setupMainNav();
    setupScheduleManager();
    setupAnalyticsDashboard();
  }

  // تفعيل وإدارة تغيير الشعار يدوياً
  function setupLogoChangeHandler() {
    const logoInput = document.getElementById('logoFileInput');
    const clubAppLogo = document.getElementById('clubAppLogo');
    
    // استرجاع الشعار المخصص من الذاكرة المحلية إن وجد
    try {
      const savedLogo = localStorage.getItem('josour_custom_logo');
      if (savedLogo && clubAppLogo) {
        clubAppLogo.src = savedLogo;
      }
    } catch (e) {}

    if (logoInput && clubAppLogo) {
      logoInput.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = function (evt) {
            const newLogoData = evt.target.result;
            clubAppLogo.src = newLogoData;
            try {
              localStorage.setItem('josour_custom_logo', newLogoData);
            } catch (err) {}
            showToast('🏛️ تم تحديث وحفظ شعار النادي بنجاح!');
          };
          reader.readAsDataURL(file);
        }
      });
    }
  }

  // تعبئة التاريخ واليوم والأسبوع تلقائياً
  function setupDateTime() {
    const now = new Date();
    const daysArabic = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const currentDay = daysArabic[now.getDay()];
    
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const formattedDate = `${day} / ${month} / ${year}`;

    // حساب رقم الأسبوع التقريبي من الشهر
    const weekNum = Math.ceil(now.getDate() / 7);

    elements.displayDate.textContent = formattedDate;
    elements.displayDay.textContent = currentDay;
    elements.displayWeek.textContent = weekNum;

    // ضبط التبويب الافتراضي حسب الساعة الحالية (بعد 13:00 مساءً يصبح مسائياً تلقائياً)
    if (now.getHours() >= 13) {
      setShift('evening');
    } else {
      setShift('morning');
    }
  }

  // محاولة استخراج اسم المستخدم من تيليجرام
  function autoFillUserData() {
    if (tg?.initDataUnsafe?.user) {
      const user = tg.initDataUnsafe.user;
      const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
      if (fullName && !elements.primaryMember.value) {
        elements.primaryMember.value = fullName;
      }
    }
  }

  // إدارة التبديل بين الصباحي والمسائي
  function setupShiftTabs() {
    elements.tabMorning.addEventListener('click', () => setShift('morning'));
    elements.tabEvening.addEventListener('click', () => setShift('evening'));
  }

  function setShift(shift) {
    currentShift = shift;
    if (shift === 'morning') {
      elements.tabMorning.classList.add('active');
      elements.tabEvening.classList.remove('active');
      elements.morningHandoverSection.classList.remove('is-hidden');
      elements.eveningClosingSection.classList.add('is-hidden');
      elements.primaryTimeFrom.value = "08:30";
      elements.primaryTimeTo.value = "12:45";
      elements.assistantTimeFrom.value = "08:30";
      elements.assistantTimeTo.value = "12:45";
    } else {
      elements.tabEvening.classList.add('active');
      elements.tabMorning.classList.remove('active');
      elements.morningHandoverSection.classList.add('is-hidden');
      elements.eveningClosingSection.classList.remove('is-hidden');
      elements.primaryTimeFrom.value = "12:30";
      elements.primaryTimeTo.value = "15:30";
      elements.assistantTimeFrom.value = "12:30";
      elements.assistantTimeTo.value = "15:30";
    }
  }

  // إعداد المنطق الشرطي التفاعلي (الحقول الذكية)
  function setupConditionalLogic() {
    // 1. العتاد (إذا وجد نقص/خلل يظهر حقل التوضيح)
    Array.from(elements.equipmentStatusRadios).forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.value === 'خلل_أو_نقص') {
          elements.equipmentDefectBox.classList.remove('is-hidden');
          elements.equipmentDefectDetails.focus();
        } else {
          elements.equipmentDefectBox.classList.add('is-hidden');
          elements.equipmentDefectDetails.value = '';
          if (elements.defectSheetLoggedConfirm) {
            elements.defectSheetLoggedConfirm.checked = false;
          }
        }
      });
    });

    // 2. الشحن (إذا لم يتم الشحن يظهر حقل السبب)
    Array.from(elements.chargingStatusRadios).forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.value === 'لم_يتم_الشحن') {
          elements.chargingReasonBox.classList.remove('is-hidden');
          elements.chargingDetailsBox.classList.add('is-hidden');
          elements.chargingNotChargedReason.focus();
        } else {
          elements.chargingReasonBox.classList.add('is-hidden');
          elements.chargingDetailsBox.classList.remove('is-hidden');
          elements.chargingNotChargedReason.value = '';
        }
      });
    });

    // 3. الإعارة والاسترجاع
    elements.toggleLoanActivity.addEventListener('change', (e) => {
      if (e.target.checked) {
        elements.loanDetailsBox.classList.remove('is-hidden');
      } else {
        elements.loanDetailsBox.classList.add('is-hidden');
        elements.loanBorrowedItem.value = '';
        elements.loanReturnedItem.value = '';
        elements.loanExtraNotes.value = '';
      }
    });

    // 4. النظافة (إذا غير نظيف يظهر حقل التوضيح)
    Array.from(elements.cleanlinessStatusRadios).forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.value === 'غير_نظيف') {
          elements.cleanlinessReasonBox.classList.remove('is-hidden');
          elements.cleanlinessDetails.focus();
        } else {
          elements.cleanlinessReasonBox.classList.add('is-hidden');
          elements.cleanlinessDetails.value = '';
        }
      });
    });

    // 5. الصباحي: نقل المستجدات
    Array.from(elements.updatesTransferredRadios).forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.value === 'لا') {
          elements.updatesTransferredReasonBox.classList.remove('is-hidden');
          elements.updatesTransferredReason.focus();
        } else {
          elements.updatesTransferredReasonBox.classList.add('is-hidden');
          elements.updatesTransferredReason.value = '';
        }
      });
    });

    // 6. الصباحي: تسليم المفتاح
    Array.from(elements.keyHandedOverRadios).forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.value === 'لا') {
          elements.keyHandedOverReasonBox.classList.remove('is-hidden');
          elements.keyHandedOverReason.focus();
        } else {
          elements.keyHandedOverReasonBox.classList.add('is-hidden');
          elements.keyHandedOverReason.value = '';
        }
      });
    });

    // 7. المسائي: مكان المفتاح المخصص
    elements.keyReturnLocationSelect.addEventListener('change', (e) => {
      if (e.target.value.includes('مكان آخر')) {
        elements.customKeyLocationBox.classList.remove('is-hidden');
        elements.customKeyLocation.focus();
      } else {
        elements.customKeyLocationBox.classList.add('is-hidden');
        elements.customKeyLocation.value = '';
      }
    });

    // 8. الطابعة
    Array.from(elements.printerUsageRadios).forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.value === 'استخدمتها') {
          elements.printerDetailsBox.classList.remove('is-hidden');
          elements.printerPageCount.focus();
        } else {
          elements.printerDetailsBox.classList.add('is-hidden');
          elements.printerPageCount.value = '';
          elements.printerPurpose.value = '';
        }
      });
    });
  }

  // جمع كافة البيانات من الحقول
  function collectFormData() {
    const selectedEquipment = document.querySelector('input[name="equipmentStatus"]:checked')?.value || 'سليم';
    const selectedCharging = document.querySelector('input[name="chargingStatus"]:checked')?.value || 'تم_الشحن';
    const selectedCleanliness = document.querySelector('input[name="cleanlinessStatus"]:checked')?.value || 'نظيف';
    const selectedPrinter = document.querySelector('input[name="printerUsage"]:checked')?.value || 'لم_أستخدمها';

    const data = {
      shift: currentShift,
      shiftName: currentShift === 'morning' ? 'المداومة الصباحية' : 'المداومة المسائية',
      date: elements.displayDate.textContent,
      day: elements.displayDay.textContent,
      week: elements.displayWeek.textContent,
      primaryMember: elements.primaryMember.value.trim(),
      primaryTime: `من ${elements.primaryTimeFrom.value} إلى ${elements.primaryTimeTo.value}`,
      assistantMember: elements.assistantMember.value.trim() || 'لا يوجد',
      assistantTime: elements.assistantMember.value.trim() ? `من ${elements.assistantTimeFrom.value} إلى ${elements.assistantTimeTo.value}` : '---',
      
      // 1. الجاهزية
      equipmentStatus: selectedEquipment === 'سليم' ? 'سليم' : `يوجد خلل أو نقص: ${elements.equipmentDefectDetails.value.trim() || 'لم يُحدد'}`,
      defectLoggedConfirmed: selectedEquipment === 'خلل_أو_نقص' ? elements.defectSheetLoggedConfirm?.checked : false,
      chargingStatus: selectedCharging === 'تم_الشحن' 
        ? `تم شحن: ${elements.chargingChargedItems.value.trim() || 'جميع الأجهزة اللازمة'}` 
        : `لم يتم الشحن بسبب: ${elements.chargingNotChargedReason.value.trim() || 'غير محدد'}`,
      
      // 2. الاستقبال
      receptionNotes: elements.receptionNotes.value.trim() || 'لا توجد ملاحظات خاصة بالاستقبال',

      // 3. الإعارة
      hasLoan: elements.toggleLoanActivity.checked,
      loanBorrowed: elements.loanBorrowedItem.value.trim(),
      loanReturned: elements.loanReturnedItem.value.trim(),
      loanProtocol: document.querySelector('input[name="loanProtocolFollowed"]:checked')?.value || 'نعم',
      loanExtraNotes: elements.loanExtraNotes.value.trim(),

      // 4. المهام
      tasksCompleted: elements.tasksCompleted.value.trim() || 'متابعة فتح واستقبال المقر والمهام الروتينية',
      tasksPending: elements.tasksPending.value.trim() || 'لا توجد مهام معلقة',

      // 5. النظافة
      cleanliness: selectedCleanliness === 'نظيف' ? 'نظيف ومثالي ✨' : `غير نظيف (الملاحظة: ${elements.cleanlinessDetails.value.trim() || 'غير محددة'})`,

      // 6. الاحتياجات
      urgentNeeds: elements.urgentNeeds.value.trim() || 'لا توجد متطلبات عاجلة',
      generalIncidents: elements.generalIncidents.value.trim() || 'سير المداومة عادي بدون حوادث',

      // 7. الصباحي
      morningUpdates: document.querySelector('input[name="updatesTransferred"]:checked')?.value || 'نعم',
      morningUpdatesReason: elements.updatesTransferredReason.value.trim(),
      morningKeyHandover: document.querySelector('input[name="keyHandedOver"]:checked')?.value || 'نعم',
      morningKeyReason: elements.keyHandedOverReason.value.trim(),

      // 7. المسائي
      eveningChecklist: {
        window: elements.closeWindow.checked,
        organize: elements.organizePlace.checked,
        electronics: elements.turnOffElectronics.checked,
        lock: elements.lockDoor.checked
      },
      eveningKeyLocation: elements.keyReturnLocationSelect.value.includes('مكان آخر') 
        ? `مكان آخر: ${elements.customKeyLocation.value.trim() || 'غير محدد'}` 
        : elements.keyReturnLocationSelect.value,

      // 8. الطابعة
      printerUsage: selectedPrinter,
      printerPageCount: elements.printerPageCount.value.trim(),
      printerPurpose: elements.printerPurpose.value.trim(),

      // 9. التوصيات
      recommendations: elements.nextDutyRecommendations.value.trim() || 'بالتوفيق للمداوم التالي 🌿'
    };

    return data;
  }

  // محرك صياغة نص التقرير المطابق لوثيقة النادي الرسمية
  function generateFormattedReport(data) {
    const isMorning = data.shift === 'morning';
    const title = isMorning 
      ? `📋 تقرير المداومة الصباحية | نادي جسور 📋` 
      : `📋 تقرير المداومة المسائية | نادي جسور 📋`;

    let report = `${title}\n`;
    report += `#تقارير #المداومة\n\n`;
    report += `📅 التاريخ: [ ${data.date} ] | اليوم: [ ${data.day} ] | الأسبوع: [ ${data.week} ]\n`;
    report += `👤 المداوم الرئيسي: [ ${data.primaryMember || 'غير مسجل'} ]\n`;
    report += `⏰ وقت المداومة: ${data.primaryTime}\n`;
    
    if (data.assistantMember !== 'لا يوجد') {
      report += `👥 المداوم المساعد: [ ${data.assistantMember} ]\n`;
      report += `⏰ وقت المداومة: ${data.assistantTime}\n`;
    }

    report += `\n1. 🏢 الجاهزية:\n`;
    if (data.defectLoggedConfirmed) {
      report += `• حالة العتاد: [ ⚠️ ${data.equipmentStatus} ]\n`;
      report += `• التوثيق في سجل الأعطال: [ ✅ تم التسجيل في سجل الأعطال والفقدان الرسمي ]\n`;
    } else {
      report += `• حالة العتاد: [ ${data.equipmentStatus} ]\n`;
    }
    report += `• الشحن 🔌: [ ${data.chargingStatus} ]\n`;

    report += `\n2. 📥 الاستقبال والتوصيات:\n`;
    report += `- ${data.receptionNotes}\n`;

    report += `\n3. 📦 الإعارة والاسترجاع:\n`;
    if (data.hasLoan) {
      if (data.loanBorrowed) report += `• قمنا بإعارة: [ ${data.loanBorrowed} ]\n`;
      if (data.loanReturned) report += `• استرجعنا: [ ${data.loanReturned} ]\n`;
      report += `• هل نُفّذ بروتوكول الإعارة والاسترجاع؟ [ ${data.loanProtocol} ]\n`;
      if (data.loanExtraNotes) report += `• ملاحظات الإعارة: ${data.loanExtraNotes}\n`;
    } else {
      report += `• لا توجد حركة إعارة أو استرجاع خلال هذه الفترة.\n`;
    }

    report += `\n4. 🎯 المهام:\n`;
    report += `• مهام أُنجِزت 🌾:\n- ${data.tasksCompleted}\n`;
    report += `• مهام قيد الانتظار أو لم تنجز ⌛️ (مع ذكر السبب):\n- ${data.tasksPending}\n`;

    report += `\n5. 🫆 نظافة المقر:\n`;
    report += `• [ ${data.cleanliness} ]\n`;

    report += `\n6. 💡 احتياجات النادي والملاحظات:\n`;
    report += `• رسالة عاجلة / احتياجات: ${data.urgentNeeds}\n`;
    report += `• حوادث أو ملاحظات عامة: ${data.generalIncidents}\n`;

    if (isMorning) {
      report += `\n7. 🔄 إجراءات تغيير المداوم:\n`;
      if (data.morningUpdates === 'نعم') {
        report += `• نقل المستجدات والمهام للمداوم التالي: [ ✅ نعم ]\n`;
      } else {
        report += `• نقل المستجدات للمداوم التالي: [ ❌ لا - السبب: ${data.morningUpdatesReason || 'لم يذكر'} ]\n`;
      }

      if (data.morningKeyHandover === 'نعم') {
        report += `• تسليم مفتاح المداومين إلى المداوم التالي: [ ✅ نعم ]\n`;
      } else {
        report += `• تسليم المفتاح إلى المداوم التالي: [ ❌ لا - السبب والمكان: ${data.morningKeyReason || 'لم يذكر'} ]\n`;
      }
    } else {
      report += `\n7. 🔐 الغلق:\n`;
      report += `• [${data.eveningChecklist.window ? 'x' : ' '}] إغلاق النافذة بإحكام.\n`;
      report += `• [${data.eveningChecklist.organize ? 'x' : ' '}] ترتيب المكان للمداوم القادم.\n`;
      report += `• [${data.eveningChecklist.electronics ? 'x' : ' '}] إطفاء الأنوار وفصل الأجهزة الكهربائية.\n`;
      report += `• [${data.eveningChecklist.lock ? 'x' : ' '}] غلق الباب الرئيسي بالمفتاح 🗝.\n`;
      report += `• إرجاع نسخة المفتاح الخاصة بالمداومين: [ ${data.eveningKeyLocation} ]\n`;
    }

    report += `\n8. 🖨️ استخدام الطابعة:\n`;
    if (data.printerUsage === 'استخدمتها') {
      report += `• تم استخدامها لـ: [ ${data.printerPurpose || 'عمل مكتبي'} ] (عدد الصفحات: ${data.printerPageCount || 0})\n`;
    } else {
      report += `• لم تُستخدم الطابعة.\n`;
    }

    report += `\n9. 🎙️ توصيات للمداوم التالي:\n`;
    report += `- ${data.recommendations}\n`;

    return report;
  }

  // التحقق من صحة المدخلات الإلزامية
  function validateForm() {
    if (!elements.primaryMember.value.trim()) {
      showToast('⚠️ يرجى كتابة اسم المداوم الرئيسي');
      elements.primaryMember.focus();
      return false;
    }

    const selectedEquipment = document.querySelector('input[name="equipmentStatus"]:checked')?.value;
    if (selectedEquipment === 'خلل_أو_نقص') {
      if (!elements.equipmentDefectDetails.value.trim()) {
        showToast('⚠️ يرجى توضيح تفاصيل الخلل أو النقص في العتاد');
        elements.equipmentDefectDetails.focus();
        return false;
      }
      if (!elements.defectSheetLoggedConfirm.checked) {
        showToast('⚠️ إلزامي: يجب فتح موقع سجل الأعطال وتوثيق البلاغ ثم تفعيل الإقرار قبل الإرسال!');
        elements.defectSheetLoggedConfirm.focus();
        return false;
      }
    }

    const selectedCharging = document.querySelector('input[name="chargingStatus"]:checked')?.value;
    if (selectedCharging === 'لم_يتم_الشحن' && !elements.chargingNotChargedReason.value.trim()) {
      showToast('⚠️ يرجى كتابة سبب عدم شحن الأجهزة');
      elements.chargingNotChargedReason.focus();
      return false;
    }

    const selectedCleanliness = document.querySelector('input[name="cleanlinessStatus"]:checked')?.value;
    if (selectedCleanliness === 'غير_نظيف' && !elements.cleanlinessDetails.value.trim()) {
      showToast('⚠️ يرجى توضيح سبب عدم نظافة المقر');
      elements.cleanlinessDetails.focus();
      return false;
    }

    const selectedPrinter = document.querySelector('input[name="printerUsage"]:checked')?.value;
    if (selectedPrinter === 'استخدمتها' && (!elements.printerPageCount.value || !elements.printerPurpose.value.trim())) {
      showToast('⚠️ يرجى كتابة عدد الصفحات المطبوعة والغرض منها');
      elements.printerPageCount.focus();
      return false;
    }

    return true;
  }

  // إعداد مستمعي الأحداث والأزرار
  function setupEventHandlers() {
    // زر المعاينة
    elements.btnPreview.addEventListener('click', () => {
      if (!validateForm()) return;
      const data = collectFormData();
      const text = generateFormattedReport(data);
      elements.reportPreviewText.textContent = text;
      elements.previewModal.classList.remove('is-hidden');
    });

    // إغلاق نافذة المعاينة
    elements.btnCloseModal.addEventListener('click', () => {
      elements.previewModal.classList.add('is-hidden');
    });

    // نسخ النص
    elements.btnCopyText.addEventListener('click', async () => {
      const text = elements.reportPreviewText.textContent;
      try {
        await navigator.clipboard.writeText(text);
        elements.copyBtnLabel.textContent = 'تم النسخ بنجاح! ✅';
        showToast('📋 تم نسخ التقرير المنسق إلى الحافظة');
      } catch (err) {
        showToast('تعذر النسخ التلقائي، يمكنك تحديده ونسخه يدوياً');
      }
    });

    // فتح موقع سجل الأعطال والفقدان الرسمي المعتمد
    const defectLink = document.querySelector('.btn-sheet-link');
    if (defectLink) {
      defectLink.addEventListener('click', (e) => {
        e.preventDefault();
        const memberName = elements.primaryMember.value.trim();
        const targetUrl = memberName 
          ? `defects.html?member=${encodeURIComponent(memberName)}`
          : 'defects.html';
        
        window.location.href = targetUrl;
      });
    }

    // زر الإرسال من النافذة أو النموذج
    elements.btnConfirmSend.addEventListener('click', submitReport);
    elements.form.addEventListener('submit', (e) => {
      e.preventDefault();
      submitReport();
    });
  }

  // إرسال وحفظ التقرير النهائي
  async function submitReport() {
    if (!validateForm()) return;

    const data = collectFormData();
    const formattedText = generateFormattedReport(data);

    const payload = {
      type: 'DUTY_REPORT_SUBMISSION',
      timestamp: new Date().toISOString(),
      structuredData: data,
      formattedReport: formattedText
    };

    // 1. الحفظ الفوري في قاعدة بيانات Firebase Cloud Firestore السحابية
    if (db) {
      try {
        await db.collection("duty_reports").add({
          ...data,
          formattedReport: formattedText,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          clientTimestamp: new Date().toISOString()
        });
        showToast('🔥 تم حفظ التقرير في قاعدة بيانات Firebase بنجاح!');
      } catch (dbErr) {
        console.error("Error saving duty report to Firestore:", dbErr);
      }
    }

    // 2. المزامنة التلقائية مع جداول بيانات Google Sheets
    if (GOOGLE_SHEETS_WEBHOOK_URL) {
      try {
        fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(() => {
          console.log("Duty report synced to Google Sheets ✅");
        }).catch(err => {
          console.warn("Google Sheets sync notice:", err);
        });
      } catch (sheetsErr) {
        console.warn("Google Sheets fetch error:", sheetsErr);
      }
    }

    // 3. النشر الفوري المباشر للتقرير في المجموعات المعتمدة (حقيبة نشطاء جسور + نشطاء جسور 7)
    try {
      const _k = atob("ODUwOTA5Mjg2MDpBQUVUNFdDWHJ4Mk1EMlFWYjB5clJDcWw1bEFYb3ktVWh5WQ==");
      const tgUrl = `https://api.telegram.org/bot${_k}/sendMessage`;

      // أ) الإرسال إلى مجموعة "حقيبة نشطاء جسور" داخل موضوع "تقارير المداومة" (Topic 30)
      fetch(tgUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: -1004497345814,
          message_thread_id: 30,
          text: formattedText
        })
      }).then(res => res.json()).then(resData => {
        if (resData.ok) {
          console.log("Duty report sent to Haqiba (Topic 30) ✅");
        }
      }).catch(tgErr => {
        console.warn("Direct Telegram post notice (Haqiba):", tgErr);
      });

      // ب) الإرسال التلقائي المباشر إلى مجموعة "نُشَطَاء جُسُور |7|" (بدون topic)
      fetch(tgUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: -1002534160494,
          text: formattedText
        })
      }).then(res => res.json()).then(resData => {
        if (resData.ok) {
          console.log("Duty report sent to Josour 7 ✅");
          showToast('📢 تم إرسال ونشر التقرير فوراً في حقيبة نشطاء جسور ونشطاء جسور 7!');
        }
      }).catch(tgErr => {
        console.warn("Direct Telegram post notice (Josour 7):", tgErr);
      });
    } catch (err) {
      console.warn("Direct Telegram broadcast error:", err);
    }

    // 4. إذا كان التطبيق مفتوحاً داخل تيليجرام WebApp
    if (tg && tg.sendData) {
      try {
        tg.sendData(JSON.stringify(payload));
        return;
      } catch (err) {
        console.warn('Telegram sendData failed:', err);
      }
    }

    // 5. إذا كان يعمل في متصفح عادي: إظهار رسالة نجاح مع خيار النسخ
    elements.reportPreviewText.textContent = formattedText;
    elements.previewModal.classList.remove('is-hidden');
    showToast('✨ تم تجهيز واعتماد التقرير بنجاح!');
  }

  // عرض إشعار سريع
  function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    elements.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ==========================================
  // 🎛️ إدارة شريط التنقل الرئيسي بين أقسام المنظومة
  // ==========================================
  function setupMainNav() {
    const navItems = [
      { btn: elements.btnNavReport, view: elements.viewReportSection, onShow: null },
      { btn: elements.btnNavSchedule, view: elements.viewScheduleSection, onShow: loadScheduleFromFirestore },
      { btn: elements.btnNavAnalytics, view: elements.viewAnalyticsSection, onShow: loadAnalyticsFromFirestore }
    ];

    navItems.forEach(item => {
      if (!item.btn || !item.view) return;
      item.btn.addEventListener('click', () => {
        navItems.forEach(n => {
          n.btn.classList.remove('active');
          n.view.classList.add('is-hidden');
        });
        item.btn.classList.add('active');
        item.view.classList.remove('is-hidden');
        if (item.onShow) item.onShow();
      });
    });
  }

  // ==========================================
  // 📅 إدارة جدول المداومة الأسبوعي السحابي
  // ==========================================
  const DEFAULT_WEEKLY_SCHEDULE = [
    {
      day: 'الأحد',
      morning: { primary: 'آية', username: 'Ayazaidi', assistant: '---' },
      evening: { primary: 'عضو مداوم', username: '', assistant: '---' }
    },
    {
      day: 'الإثنين',
      morning: { primary: 'عضو مداوم', username: '', assistant: '---' },
      evening: { primary: 'عضو مداوم', username: '', assistant: '---' }
    },
    {
      day: 'الثلاثاء',
      morning: { primary: 'عضو مداوم', username: '', assistant: '---' },
      evening: { primary: 'عضو مداوم', username: '', assistant: '---' }
    },
    {
      day: 'الأربعاء',
      morning: { primary: 'عضو مداوم', username: '', assistant: '---' },
      evening: { primary: 'عضو مداوم', username: '', assistant: '---' }
    },
    {
      day: 'الخميس',
      morning: { primary: 'عضو مداوم', username: '', assistant: '---' },
      evening: { primary: 'عضو مداوم', username: '', assistant: '---' }
    }
  ];

  let currentSchedule = JSON.parse(JSON.stringify(DEFAULT_WEEKLY_SCHEDULE));
  let isEditScheduleMode = false;

  function setupScheduleManager() {
    if (elements.btnToggleEditSchedule) {
      elements.btnToggleEditSchedule.addEventListener('click', toggleScheduleEditMode);
    }
    if (elements.btnSaveSchedule) {
      elements.btnSaveSchedule.addEventListener('click', saveScheduleToFirestore);
    }
    renderScheduleGrid();
  }

  function toggleScheduleEditMode() {
    isEditScheduleMode = !isEditScheduleMode;
    if (isEditScheduleMode) {
      elements.btnEditScheduleIcon.textContent = '✕';
      elements.btnEditScheduleText.textContent = 'إلغاء التعديل';
      elements.btnSaveSchedule.classList.remove('is-hidden');
    } else {
      elements.btnEditScheduleIcon.textContent = '✏️';
      elements.btnEditScheduleText.textContent = 'تعديل الجدول';
      elements.btnSaveSchedule.classList.add('is-hidden');
    }
    renderScheduleGrid();
  }

  function renderScheduleGrid() {
    if (!elements.scheduleDaysGrid) return;

    const daysArabic = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const todayName = daysArabic[new Date().getDay()];

    let html = '';
    currentSchedule.forEach((item, index) => {
      const isToday = item.day === todayName;
      const todayBadge = isToday ? '<span class="badge-today">اليوم 📍</span>' : '';

      html += `
        <div class="schedule-day-card ${isToday ? 'is-today' : ''}" data-day-index="${index}">
          <div class="schedule-day-header">
            <div class="schedule-day-name">
              <span>🗓️ ${item.day}</span>
              ${todayBadge}
            </div>
          </div>
          <div class="schedule-shifts-row">
            <!-- الفترة الصباحية -->
            <div class="schedule-shift-box">
              <div class="shift-box-header">
                <span class="shift-box-title">☀️ الفترة الصباحية</span>
                <span class="shift-box-time">08:30 – 12:45</span>
              </div>
              ${isEditScheduleMode ? `
                <div class="schedule-edit-field">
                  <label>المداوم الرئيسي:</label>
                  <input type="text" class="edit-shift-primary" data-shift="morning" data-day="${index}" value="${item.morning.primary || ''}">
                </div>
                <div class="schedule-edit-field">
                  <label>معرف تيليجرام (@username):</label>
                  <input type="text" class="edit-shift-username" data-shift="morning" data-day="${index}" value="${item.morning.username || ''}" placeholder="بدون @">
                </div>
                <div class="schedule-edit-field">
                  <label>المداوم المساعد:</label>
                  <input type="text" class="edit-shift-assistant" data-shift="morning" data-day="${index}" value="${item.morning.assistant || ''}">
                </div>
              ` : `
                <div class="shift-member-display">
                  <div class="member-primary-line">
                    <span>👤 ${item.morning.primary || 'لم يحدد'}</span>
                    ${item.morning.username ? `<a href="https://t.me/${item.morning.username.replace('@','')}" target="_blank" class="member-tg-link">✈️ @${item.morning.username.replace('@','')}</a>` : ''}
                  </div>
                  <div class="member-assistant-line">👥 المساعد: ${item.morning.assistant || '---'}</div>
                </div>
              `}
            </div>

            <!-- الفترة المسائية -->
            <div class="schedule-shift-box">
              <div class="shift-box-header">
                <span class="shift-box-title">🌙 الفترة المسائية</span>
                <span class="shift-box-time">12:30 – 15:30</span>
              </div>
              ${isEditScheduleMode ? `
                <div class="schedule-edit-field">
                  <label>المداوم الرئيسي:</label>
                  <input type="text" class="edit-shift-primary" data-shift="evening" data-day="${index}" value="${item.evening.primary || ''}">
                </div>
                <div class="schedule-edit-field">
                  <label>معرف تيليجرام (@username):</label>
                  <input type="text" class="edit-shift-username" data-shift="evening" data-day="${index}" value="${item.evening.username || ''}" placeholder="بدون @">
                </div>
                <div class="schedule-edit-field">
                  <label>المداوم المساعد:</label>
                  <input type="text" class="edit-shift-assistant" data-shift="evening" data-day="${index}" value="${item.evening.assistant || ''}">
                </div>
              ` : `
                <div class="shift-member-display">
                  <div class="member-primary-line">
                    <span>👤 ${item.evening.primary || 'لم يحدد'}</span>
                    ${item.evening.username ? `<a href="https://t.me/${item.evening.username.replace('@','')}" target="_blank" class="member-tg-link">✈️ @${item.evening.username.replace('@','')}</a>` : ''}
                  </div>
                  <div class="member-assistant-line">👥 المساعد: ${item.evening.assistant || '---'}</div>
                </div>
              `}
            </div>
          </div>
        </div>
      `;
    });

    elements.scheduleDaysGrid.innerHTML = html;
  }

  function loadScheduleFromFirestore() {
    if (!db) {
      renderScheduleGrid();
      return;
    }

    elements.scheduleSyncText.textContent = 'جاري مزامنة الجدول مع السحابة... ⏳';
    db.collection("duty_schedules").doc("current_schedule").get().then(doc => {
      if (doc.exists && doc.data().schedule) {
        currentSchedule = doc.data().schedule;
        elements.scheduleSyncText.textContent = 'متزامن مع سحابة جسور التفاعلية 🔥';
      } else {
        elements.scheduleSyncText.textContent = 'جدول افتراضي جاهز للتعديل 🌿';
      }
      renderScheduleGrid();
    }).catch(err => {
      console.warn("Firestore schedule load error:", err);
      elements.scheduleSyncText.textContent = 'يعمل بالذاكرة المحلية للمتصفح';
      renderScheduleGrid();
    });
  }

  async function saveScheduleToFirestore() {
    if (!elements.scheduleDaysGrid) return;

    // تجميع القيم من الحقول المفتوحة
    currentSchedule.forEach((item, index) => {
      const morningPrimary = elements.scheduleDaysGrid.querySelector(`.edit-shift-primary[data-shift="morning"][data-day="${index}"]`);
      const morningUsername = elements.scheduleDaysGrid.querySelector(`.edit-shift-username[data-shift="morning"][data-day="${index}"]`);
      const morningAssistant = elements.scheduleDaysGrid.querySelector(`.edit-shift-assistant[data-shift="morning"][data-day="${index}"]`);

      const eveningPrimary = elements.scheduleDaysGrid.querySelector(`.edit-shift-primary[data-shift="evening"][data-day="${index}"]`);
      const eveningUsername = elements.scheduleDaysGrid.querySelector(`.edit-shift-username[data-shift="evening"][data-day="${index}"]`);
      const eveningAssistant = elements.scheduleDaysGrid.querySelector(`.edit-shift-assistant[data-shift="evening"][data-day="${index}"]`);

      if (morningPrimary) item.morning.primary = morningPrimary.value.trim();
      if (morningUsername) item.morning.username = morningUsername.value.trim().replace('@', '');
      if (morningAssistant) item.morning.assistant = morningAssistant.value.trim() || '---';

      if (eveningPrimary) item.evening.primary = eveningPrimary.value.trim();
      if (eveningUsername) item.evening.username = eveningUsername.value.trim().replace('@', '');
      if (eveningAssistant) item.evening.assistant = eveningAssistant.value.trim() || '---';
    });

    if (db) {
      try {
        elements.scheduleSyncText.textContent = 'جاري الحفظ في السحابة... ⏳';
        await db.collection("duty_schedules").doc("current_schedule").set({
          schedule: currentSchedule,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedBy: elements.primaryMember.value.trim() || 'المشرفة آية'
        });
        elements.scheduleSyncText.textContent = 'تم الحفظ والمزامنة السحابية بنجاح ✅';
        showToast('💾 تم حفظ جدول المداومة في السحابة بنجاح!');
      } catch (err) {
        console.error("Firestore schedule save error:", err);
        showToast('⚠️ تعذر الحفظ السحابي، تم الحفظ محلياً');
      }
    } else {
      showToast('💾 تم حفظ الجدول محلياً بنجاح!');
    }

    toggleScheduleEditMode();
  }

  // ==========================================
  // 📊 إدارة لوحة الإحصاءات والمؤشرات التفاعلية (KPIs)
  // ==========================================
  function setupAnalyticsDashboard() {
    // تحميل أولي إذا كان التبويب مفتوحاً
  }

  let cachedReports = [];

  async function loadAnalyticsFromFirestore() {
    if (!db) {
      if (elements.leaderboardList) elements.leaderboardList.innerHTML = '<div class="empty-state">قاعدة بيانات Firebase غير متصلة محلياً</div>';
      return;
    }

    try {
      const snapshot = await db.collection("duty_reports").limit(100).get();
      const reports = [];
      snapshot.forEach(doc => reports.push({ id: doc.id, ...doc.data() }));
      cachedReports = reports;

      // 1. حساب إجمالي التقارير وتوزيع الفترات
      const total = reports.length;
      let morningCount = 0;
      let eveningCount = 0;
      let totalPages = 0;
      let cleanCount = 0;
      let equipGoodCount = 0;
      const memberCounts = {};

      reports.forEach(r => {
        // الفترات
        if (r.shift === 'morning' || (r.shiftName && r.shiftName.includes('الصباحية'))) {
          morningCount++;
        } else {
          eveningCount++;
        }

        // الطابعة
        const p = parseInt(r.printerPageCount, 10);
        if (!isNaN(p)) totalPages += p;

        // النظافة
        const cleanStr = String(r.cleanliness || '');
        if (cleanStr.includes('نظيف') || cleanStr.includes('مثالي')) cleanCount++;

        // العتاد
        const eqStr = String(r.equipmentStatus || '');
        if (eqStr.includes('سليم') && !eqStr.includes('خلل')) equipGoodCount++;

        // المداومين
        const m = String(r.primaryMember || '').trim();
        if (m) {
          memberCounts[m] = (memberCounts[m] || 0) + 1;
        }
      });

      // تحديث بطاقات المؤشرات
      if (elements.statTotalReports) elements.statTotalReports.textContent = total;
      if (elements.statShiftSplit) elements.statShiftSplit.textContent = `${morningCount} صباحية • ${eveningCount} مسائية`;
      if (elements.statTotalPages) elements.statTotalPages.textContent = totalPages;
      if (elements.statCleanlinessRate) elements.statCleanlinessRate.textContent = total > 0 ? `${Math.round((cleanCount / total) * 100)}%` : '100%';
      if (elements.statEquipHealthRate) elements.statEquipHealthRate.textContent = total > 0 ? `${Math.round((equipGoodCount / total) * 100)}%` : '100%';

      // 2. تحديث قائمة المتصدرين (Leaderboard)
      const sortedMembers = Object.entries(memberCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
      if (elements.leaderboardList) {
        if (sortedMembers.length === 0) {
          elements.leaderboardList.innerHTML = '<div class="empty-state">لا توجد تقارير مسجلة بعد</div>';
        } else {
          elements.leaderboardList.innerHTML = sortedMembers.map(([name, count], idx) => {
            const rankClass = idx === 0 ? 'rank-1' : idx === 1 ? 'rank-2' : idx === 2 ? 'rank-3' : '';
            const rankIcon = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
            return `
              <div class="leaderboard-item">
                <div class="leaderboard-rank ${rankClass}">${rankIcon}</div>
                <div class="leaderboard-name">${name}</div>
                <div class="leaderboard-count">${count} تقرير</div>
              </div>
            `;
          }).join('');
        }
      }

      // 3. تحديث سجل التقارير الأخيرة
      if (elements.recentReportsList) {
        if (reports.length === 0) {
          elements.recentReportsList.innerHTML = '<div class="empty-state">لا توجد تقارير لعرضها</div>';
        } else {
          const recent = reports.slice(0, 8);
          elements.recentReportsList.innerHTML = recent.map((r, i) => `
            <div class="recent-report-card" data-report-index="${i}">
              <div class="recent-report-top">
                <span class="recent-report-member">👤 ${r.primaryMember || 'غير محدد'}</span>
                <span class="recent-report-date">${r.date || 'اليوم'} (${r.shift === 'morning' ? '☀️ صباحية' : '🌙 مسائية'})</span>
              </div>
              <div class="recent-report-meta">
                <span>🏢 العتاد: ${r.equipmentStatus && r.equipmentStatus.includes('سليم') ? '✅ سليم' : '⚠️ خلل'}</span>
                <span>🖨️ الطابعة: ${r.printerPageCount ? r.printerPageCount + ' صفحة' : 'لم تُستخدم'}</span>
                <span style="color: var(--gold-accent);">👁️ عرض التفاصيل</span>
              </div>
            </div>
          `).join('');

          // إضافة مستمع لفتح التقرير عند الضغط عليه
          elements.recentReportsList.querySelectorAll('.recent-report-card').forEach(card => {
            card.addEventListener('click', () => {
              const idx = parseInt(card.getAttribute('data-report-index'), 10);
              const rep = recent[idx];
              if (rep && rep.formattedReport) {
                elements.reportPreviewText.textContent = rep.formattedReport;
                elements.previewModal.classList.remove('is-hidden');
              }
            });
          });
        }
      }

    } catch (err) {
      console.error("Firestore analytics load error:", err);
      if (elements.leaderboardList) elements.leaderboardList.innerHTML = '<div class="empty-state">تعذر تحميل بيانات الإحصاءات حالياً</div>';
    }
  }

  // تشغيل التطبيق
  document.addEventListener('DOMContentLoaded', init);

})();
