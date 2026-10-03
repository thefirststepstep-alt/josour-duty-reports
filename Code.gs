/**
 * 🏛️ المنظومة السحابية الشاملة لإدارة وتذكير المداومة — نادي جسور الطلابي
 * الرابط التلقائي بين بوت تيليجرام (@JosourDutyReportBot) وجداول Google Sheets وتطبيق التقارير.
 */

// إعدادات البوت والتطبيق
const BOT_TOKEN = "8509092860:AAET4WCXrx2MD2QVb0yrRCql5lAXoy-UhyY";
const WEBAPP_URL = "https://thefirststepstep-alt.github.io/josour-duty-reports/";

/**
 * 📩 معالجة الطلبات الواردة (سواء من تطبيق التقارير أو من بوت تيليجرام Webhook)
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput("No data").setMimeType(ContentService.MimeType.TEXT);
    }

    const payload = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1️⃣ الحالة الأولى: استقبال تقرير مداومة جديد من تطبيق الويب
    if (payload.type === 'DUTY_REPORT_SUBMISSION' && payload.structuredData) {
      return handleDutyReportSubmission(ss, payload.structuredData);
    }

    // 2️⃣ الحالة الثانية: استقبال رسالة أو أمر من عضو في بوت تيليجرام
    if (payload.message) {
      return handleTelegramMessage(ss, payload.message);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "ok" })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 📋 1. تسجيل تقرير المداومة في Google Sheets
 */
function handleDutyReportSubmission(ss, data) {
  let logSheet = ss.getSheetByName('سجل التقارير اليومية');
  if (!logSheet) {
    logSheet = ss.insertSheet('سجل التقارير اليومية');
    setupLogSheetHeaders(logSheet);
  }

  let statsSheet = ss.getSheetByName('لوحة الإحصاءات والرقابة');
  if (!statsSheet) {
    statsSheet = ss.insertSheet('لوحة الإحصاءات والرقابة');
    setupStatsDashboard(statsSheet);
  }

  const now = new Date();
  const formattedTimestamp = Utilities.formatDate(now, "GMT+1", "yyyy/MM/dd HH:mm:ss");

  const row = [
    formattedTimestamp,
    data.date,
    data.day,
    data.week,
    data.shiftName,
    data.primaryMember,
    data.primaryTime,
    data.assistantMember,
    data.assistantTime,
    data.equipmentStatus,
    data.chargingStatus,
    data.receptionNotes,
    data.hasLoan ? `إعارة: ${data.loanBorrowed || '-'} | استرجاع: ${data.loanReturned || '-'}` : 'لا توجد إعارة',
    data.loanProtocol || '---',
    data.tasksCompleted,
    data.tasksPending,
    data.cleanliness,
    data.urgentNeeds,
    data.generalIncidents,
    data.shift === 'morning' ? `نقل المهام: [${data.morningUpdates}] | تسليم المفتاح: [${data.morningKeyHandover}]` : `غلق: ${data.eveningKeyLocation}`,
    data.printerUsage === 'استخدمتها' ? Number(data.printerPageCount) || 0 : 0,
    data.printerPurpose || '---',
    data.recommendations
  ];

  logSheet.appendRow(row);
  logSheet.setRightToLeft(true);

  // إرسال التقرير تلقائياً لمجموعات النادي المعتمدة (حقيبة نشطاء جسور + نشطاء جسور 7)
  try {
    const postGroupUrl = "https://api.telegram.org/bot" + BOT_TOKEN + "/sendMessage";
    const reportText = data.formattedReport || generateFormattedReport(data);

    // 1. الإرسال إلى مجموعة "حقيبة نشطاء جسور" داخل موضوع "تقارير المداومة" (Topic 30)
    UrlFetchApp.fetch(postGroupUrl, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({
        chat_id: "-1004497345814",
        message_thread_id: 30,
        text: reportText
      }),
      muteHttpExceptions: true
    });

    // 2. الإرسال التلقائي المباشر إلى مجموعة "نُشَطَاء جُسُور |7|" (بدون topic)
    UrlFetchApp.fetch(postGroupUrl, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({
        chat_id: "-1002534160494",
        text: reportText
      }),
      muteHttpExceptions: true
    });
  } catch (tgErr) {
    console.warn("Telegram post error:", tgErr);
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    message: 'تم تسجيل التقرير في Google Sheets ومجموعة النادي بنجاح ✅'
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * 📲 2. معالجة رسائل تيليجرام وحفظ العضو في «دليل الأعضاء»
 */
function handleTelegramMessage(ss, message) {
  const chatId = message.chat.id;
  const firstName = message.from.first_name || '';
  const lastName = message.from.last_name || '';
  const fullName = (firstName + ' ' + lastName).trim();
  const username = message.from.username ? '@' + message.from.username : 'بدون معرف';
  const text = message.text || '';

  let membersSheet = ss.getSheetByName('دليل الأعضاء');
  if (!membersSheet) {
    membersSheet = ss.insertSheet('دليل الأعضاء');
    setupMembersSheetHeaders(membersSheet);
  }

  // التحقق هل العضو مسجل مسبقاً
  const data = membersSheet.getDataRange().getValues();
  let memberExists = false;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(chatId)) {
      memberExists = true;
      // تحديث الاسم أو المعرف إذا تغير
      membersSheet.getRange(i + 1, 2).setValue(fullName);
      membersSheet.getRange(i + 1, 3).setValue(username);
      break;
    }
  }

  if (!memberExists) {
    const nowStr = Utilities.formatDate(new Date(), "GMT+1", "yyyy/MM/dd HH:mm");
    membersSheet.appendRow([chatId, fullName, username, nowStr, "عضو مداومة"]);
  }

  // الرد على العضو في تيليجرام
  if (text.startsWith('/start')) {
    const welcomeMsg = `مرحباً بك زميلنا الكريم **${fullName}** في بوت **خلية المداومة — نادي جسور الطلابي** 🏛️🌿\n\n` +
      `✅ **تم تسجيل وربط حسابك بنجاح** في منظومة المداومة الذكية.\n\n` +
      `📌 **مهام هذا البوت:**\n` +
      `• إرسال رابط تقرير المداومة إليك مباشرة في نهاية فترتك.\n` +
      `• تذكيرك التلقائي لتوثيق أعمال الفترة والعهدة.\n` +
      `• يمكنك فتح نموذج التقرير في أي وقت عبر الضغط على الزر أدناه ⬇️`;

    sendTelegramKeyboardMessage(chatId, welcomeMsg);
  }

  return ContentService.createTextOutput(JSON.stringify({ status: "ok" })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * ⏰ 3. الفحص الدوري وإرسال التذكيرات الذكية للمداومين (يُربط مع Trigger كل 15 دقيقة)
 */
function checkAndSendDutyAlerts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const scheduleSheet = ss.getSheetByName('جدول المداومة الأسبوعي');
  const membersSheet = ss.getSheetByName('دليل الأعضاء');
  const logSheet = ss.getSheetByName('سجل التقارير اليومية');

  if (!scheduleSheet || !membersSheet) {
    return;
  }

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const todayStr = Utilities.formatDate(now, "GMT+1", "yyyy/MM/dd");
  const todayDayArabic = getArabicDayName(now.getDay());

  // تحديد هل نحن في موعد الصباحية (نهاية الدوام 12:45) أو المسائية (15:30)
  let targetShift = null;
  let reminderLevel = 0; // 0: الإشعار الأول، 1: تذكير بعد 30د، 2: تذكير بعد ساعة

  // مواعيد الصباحية (12:45، 13:15، 13:45)
  if (currentHour === 12 && currentMinute >= 40 && currentMinute <= 55) {
    targetShift = 'صباحية';
    reminderLevel = 0;
  } else if (currentHour === 13 && currentMinute >= 10 && currentMinute <= 25) {
    targetShift = 'صباحية';
    reminderLevel = 1;
  } else if (currentHour === 13 && currentMinute >= 40 && currentMinute <= 55) {
    targetShift = 'صباحية';
    reminderLevel = 2;
  }
  // مواعيد المسائية (15:30، 16:00، 16:30)
  else if (currentHour === 15 && currentMinute >= 25 && currentMinute <= 40) {
    targetShift = 'مسائية';
    reminderLevel = 0;
  } else if (currentHour === 16 && currentMinute >= 0 && currentMinute <= 15) {
    targetShift = 'مسائية';
    reminderLevel = 1;
  } else if (currentHour === 16 && currentMinute >= 25 && currentMinute <= 40) {
    targetShift = 'مسائية';
    reminderLevel = 2;
  }

  if (!targetShift) return; // ليس موعد تذكير

  // قراءة المداومين اليوم
  const scheduleData = scheduleSheet.getDataRange().getValues();
  for (let i = 1; i < scheduleData.length; i++) {
    const row = scheduleData[i];
    const rowDay = String(row[1]).trim();
    const rowShift = String(row[2]).trim();
    const primaryNameOrUsername = String(row[4]).trim();

    if (rowDay.includes(todayDayArabic) && rowShift.includes(targetShift)) {
      // فحص هل ملأ التقرير اليوم
      if (hasReportBeenSubmitted(logSheet, todayStr, targetShift, primaryNameOrUsername)) {
        continue; // التقرير تم ملؤه بالفعل، لا داعي للتذكير ✅
      }

      // البحث عن Chat ID للمداوم
      const chatId = findMemberChatId(membersSheet, primaryNameOrUsername);
      if (chatId) {
        sendDutyReminderMessage(chatId, primaryNameOrUsername, targetShift, reminderLevel);
      }
    }
  }
}

/**
 * فحص هل تم تقديم التقرير في سجل التقارير
 */
function hasReportBeenSubmitted(logSheet, dateStr, shiftType, memberIdentifier) {
  if (!logSheet) return false;
  const data = logSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const logDate = String(data[i][1]);
    const logShift = String(data[i][4]);
    const logMember = String(data[i][5]);

    if (logShift.includes(shiftType)) {
      if (memberIdentifier.includes(logMember) || logMember.includes(memberIdentifier) || logDate.includes(dateStr)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * إرسال رسالة التذكير المناسبة حسب المستوى
 */
function sendDutyReminderMessage(chatId, memberName, shiftType, level) {
  let text = "";
  const shiftTitle = shiftType === 'صباحية' ? 'الفترة الصباحية ☀️' : 'الفترة المسائية 🌙';

  if (level === 0) {
    text = `تقبل الله جهودك زميلنا الكريم **${memberName}** 🌿\n\n` +
      `📋 نرجو منك التفضل بملء **تقرير المداومة (${shiftTitle})** لتوثيق أعمال الفترة وإجراءات التسليم والعهدة.\n\n` +
      `اضغط على الزر أدناه لفتح التقرير وملئه في دقيقة واحدة 👇`;
  } else if (level === 1) {
    text = `⏳ **تذكير لطيف (بعد 30 دقيقة):**\n` +
      `أهلاً زميلنا **${memberName}**، لم يصلنا تقرير مداومتك (${shiftTitle}) حتى الآن.\n` +
      `نرجو منك ملؤه الآن لإنهاء أرشفة اليوم 🌿`;
  } else if (level === 2) {
    text = `⚠️ **تنبيه عاجل (مضت ساعة كاملة):**\n` +
      `زميلنا **${memberName}**، يرجى التكرم بملء تقرير مداومة (${shiftTitle}) بشكل عاجل لإتمام عملية الرقابة والتسليم في النادي.`;
  }

  sendTelegramKeyboardMessage(chatId, text);
}

/**
 * إرسال رسالة تيليجرام مع زر فتح تطبيق الويب المباشر
 */
function sendTelegramKeyboardMessage(chatId, text) {
  const url = "https://api.telegram.org/bot" + BOT_TOKEN + "/sendMessage";
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "📝 فتح وتعبئة تقرير المداومة الآن",
            web_app: { url: WEBAPP_URL }
          }
        ]
      ]
    }
  };

  UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
}

function findMemberChatId(membersSheet, identifier) {
  const data = membersSheet.getDataRange().getValues();
  const cleanId = identifier.replace('@', '').trim().toLowerCase();

  for (let i = 1; i < data.length; i++) {
    const chatId = data[i][0];
    const name = String(data[i][1]).toLowerCase();
    const username = String(data[i][2]).replace('@', '').toLowerCase();

    if (username === cleanId || name.includes(cleanId) || cleanId.includes(name)) {
      return chatId;
    }
  }
  return null;
}

function getArabicDayName(dayIndex) {
  const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  return days[dayIndex];
}

/**
 * 🛠️ إعداد رؤوس الجداول والتنسيقات
 */
function setupLogSheetHeaders(sheet) {
  const headers = [
    "طابع الوقت ⏱️", "التاريخ 📅", "اليوم 🗓️", "الأسبوع 🔢", "الفترة ☀️🌙",
    "المداوم الرئيسي 👤", "وقت المداومة ⏰", "المداوم المساعد 👥", "وقت المساعد ⏰",
    "حالة العتاد 🏢", "شحن الأجهزة 🔌", "الاستقبال 📥", "الإعارة والاسترجاع 📦",
    "بروتوكول الإعارة", "مهام أُنجزت 🌾", "مهام معلقة ⌛", "النظافة 🫆",
    "احتياجات عاجلة 💡", "حوادث وملاحظات ⚠️", "التسليم / الغلق 🔐",
    "صفحات الطابعة 🖨️", "غرض الطباعة", "التوصيات 🎙️"
  ];
  sheet.setRightToLeft(true);
  sheet.appendRow(headers);
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground("#eab308").setFontColor("#000000").setFontWeight("bold").setHorizontalAlignment("center");
  sheet.setFrozenRows(1);
}

function setupMembersSheetHeaders(sheet) {
  const headers = ["معرف تيليجرام (Chat ID)", "اسم العضو", "معرف الحساب (Username)", "تاريخ التسجيل", "الصفة"];
  sheet.setRightToLeft(true);
  sheet.appendRow(headers);
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground("#111e33").setFontColor("#facc15").setFontWeight("bold").setHorizontalAlignment("center");
  sheet.setFrozenRows(1);
}

function setupWeeklyScheduleSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('جدول المداومة الأسبوعي');
  if (!sheet) {
    sheet = ss.insertSheet('جدول المداومة الأسبوعي');
  }
  sheet.clear();
  sheet.setRightToLeft(true);

  const headers = ["الأسبوع 🔢", "اليوم 🗓️", "الفترة ☀️🌙", "التاريخ 📅", "المداوم الرئيسي (@Username أو الاسم)", "المداوم المساعد 👥", "ملاحظات إدارية"];
  sheet.appendRow(headers);

  const sampleRows = [
    [1, "الأحد", "الصباحية ☀️", "2026/09/01", "@Ayazaidi", "---", "الفترة الافتتاحية"],
    [1, "الأحد", "المسائية 🌙", "2026/09/01", "عضو مداوم 2", "---", ""],
    [1, "الإثنين", "الصباحية ☀️", "2026/09/02", "عضو مداوم 3", "---", ""],
    [1, "الإثنين", "المسائية 🌙", "2026/09/02", "عضو مداوم 4", "---", ""],
    [1, "الثلاثاء", "الصباحية ☀️", "2026/09/03", "عضو مداوم 5", "---", ""],
    [1, "الثلاثاء", "المسائية 🌙", "2026/09/03", "عضو مداوم 6", "---", ""],
    [1, "الأربعاء", "الصباحية ☀️", "2026/09/04", "عضو مداوم 7", "---", ""],
    [1, "الأربعاء", "المسائية 🌙", "2026/09/04", "عضو مداوم 8", "---", ""],
    [1, "الخميس", "الصباحية ☀️", "2026/09/05", "عضو مداوم 9", "---", ""],
    [1, "الخميس", "المسائية 🌙", "2026/09/05", "عضو مداوم 10", "---", "نهاية الأسبوع"]
  ];

  for (let r of sampleRows) {
    sheet.appendRow(r);
  }

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground("#ca8a04").setFontColor("#ffffff").setFontWeight("bold").setHorizontalAlignment("center");
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}

function setupStatsDashboard(sheet) {
  sheet.setRightToLeft(true);
  sheet.getRange("A1:D1").merge();
  sheet.getRange("A1").setValue("📊 لوحة الإحصاءات والرقابة الشهرية — خلية المداومة (نادي جسور)")
       .setFontSize(14).setFontWeight("bold").setBackground("#050b14").setFontColor("#facc15").setHorizontalAlignment("center");

  const kpis = [
    ["إجمالي التقارير المسجلة", '=COUNTA(\'سجل التقارير اليومية\'!A2:A)'],
    ["تقارير المداومة الصباحية ☀️", '=COUNTIF(\'سجل التقارير اليومية\'!E2:E, "*الصباحية*")'],
    ["تقارير المداومة المسائية 🌙", '=COUNTIF(\'سجل التقارير اليومية\'!E2:E, "*المسائية*")'],
    ["إجمالي استهلاك ورق الطابعة 🖨️", '=SUM(\'سجل التقارير اليومية\'!U2:U)'],
    ["مرات الإعارة والاسترجاع 📦", '=COUNTIF(\'سجل التقارير اليومية\'!M2:M, "*إعارة*")'],
    ["مرات تسجيل عتاد به خلل ⚠️", '=COUNTIF(\'سجل التقارير اليومية\'!J2:J, "*خلل*")'],
    ["مرات تسجيل مقر غير نظيف 🧹", '=COUNTIF(\'سجل التقارير اليومية\'!Q2:Q, "*غير نظيف*")']
  ];

  for (let i = 0; i < kpis.length; i++) {
    const row = i + 3;
    sheet.getRange(row, 1).setValue(kpis[i][0]).setFontWeight("bold").setBackground("#111e33").setFontColor("#ffffff");
    sheet.getRange(row, 2).setFormula(kpis[i][1]).setFontWeight("bold").setHorizontalAlignment("center");
  }

  sheet.autoResizeColumns(1, 4);
}
