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

  // رابط تطبيق الويب الخاص بـ Google Sheets (Apps Script Webhook)
  const GOOGLE_SHEETS_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbxKhFCBKkYXlMw5N71jkN11B74xiSnvOarQppc2iEkkWitUu17oVrX69EaxJGH2-_sv/exec";

  // إعدادات النشر المباشر في مجموعة تيليجرام (حقيبة نشطاء جسور ⬅️ موضوع تقارير المداومة)
  const TELEGRAM_BOT_TOKEN = "8509092860:AAHmuzN7Ro2NSUrcjj9f_2kStXI6gHcozX8";
  const JOSOUR_GROUP_ID = "-1004497345814";
  const DUTY_TOPIC_THREAD_ID = 30;

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

    // 6. الاحتياجات
    urgentNeeds: document.getElementById('urgentNeeds'),
    generalIncidents: document.getElementById('generalIncidents'),

    // 7. الصباحي
    updatesTransferredRadios: document.getElementsByName('updatesTransferred'),
    updatesTransferredReasonBox: document.getElementById('updatesTransferredReasonBox'),
    updatesTransferredReason: document.getElementById('updatesTransferredReason'),

    keyHandedOverRadios: document.getElementsByName('keyHandedOver'),
    keyHandedOverReasonBox: document.getElementById('keyHandedOverReasonBox'),
    keyHandedOverReason: document.getElementById('keyHandedOverReason'),

    // 7. المسائي
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

    // الأزرار والتحكم
    form: document.getElementById('dutyReportForm'),
    btnPreview: document.getElementById('btnPreview'),
    previewModal: document.getElementById('previewModal'),
    btnCloseModal: document.getElementById('btnCloseModal'),
    reportPreviewText: document.getElementById('reportPreviewText'),
    btnCopyText: document.getElementById('btnCopyText'),
    copyBtnLabel: document.getElementById('copyBtnLabel'),
    btnConfirmSend: document.getElementById('btnConfirmSend'),
    toastContainer: document.getElementById('toastContainer')
  };

  let currentShift = 'morning';

  // تهيئة التطبيق عند التحميل
  function init() {
    setupDateTime();
    setupShiftTabs();
    setupConditionalLogic();
    setupEventHandlers();
    autoFillUserData();
  }

  // ضبط التاريخ واليوم والأسبوع
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
        showToast('⚠️ إلزامي: يجب فتح سجل الأعطال وتسجيل الخلل ثم تفعيل الإقرار قبل إرسال التقرير!');
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

  // إعداد مستمعات الأحداث
  function setupEventHandlers() {
    // زر المعاينة
    elements.btnPreview.addEventListener('click', () => {
      if (!validateForm()) return;
      const data = collectFormData();
      const text = generateFormattedReport(data);
      elements.reportPreviewText.textContent = text;
      elements.previewModal.classList.remove('is-hidden');
    });

    // إغلاق المعاينة
    elements.btnCloseModal.addEventListener('click', () => {
      elements.previewModal.classList.add('is-hidden');
    });

    // نسخ نص التقرير
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

    // فتح رابط سجل الأعطال مباشرة في المتصفح الخارجي / تطبيق Google Sheets
    const defectLink = document.querySelector('.btn-sheet-link');
    if (defectLink) {
      defectLink.addEventListener('click', (e) => {
        const sheetUrl = "https://docs.google.com/spreadsheets/d/1DmuSOLyNDck0aeBtkapptSn2KdqyVzpiS2DOI6VKFBE/edit?gid=0#gid=0";
        if (tg && tg.openLink) {
          e.preventDefault();
          tg.openLink(sheetUrl);
        }
      });
    }

    // زر الإرسال من النافذة أو النموذج
    elements.btnConfirmSend.addEventListener('click', submitReport);
    elements.form.addEventListener('submit', (e) => {
      e.preventDefault();
      submitReport();
    });
  }

  // إرسال وحفظ التقرير (متعدد المنصات: Firebase + Google Sheets + Telegram)
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

    // 3. النشر الفوري المباشر في مجموعة "حقيبة نشطاء جسور" داخل موضوع "تقارير المداومة"
    try {
      const tgUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
      fetch(tgUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: JOSOUR_GROUP_ID,
          message_thread_id: DUTY_TOPIC_THREAD_ID,
          text: formattedText
        })
      }).then(res => res.json()).then(resData => {
        if (resData.ok) {
          showToast('📢 تم إرسال التقرير فوراً إلى مجموعة حقيبة نشطاء جسور!');
        }
      }).catch(tgErr => {
        console.warn("Direct Telegram post notice:", tgErr);
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

  // دالة الإشعارات السريعة (Toasts)
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

  // الانطلاق عند اكتمال تحميل الصفحة
  document.addEventListener('DOMContentLoaded', init);

})();
