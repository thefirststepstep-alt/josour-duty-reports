/**
 * 📊 سكريبت الربط التلقائي لتقارير المداومة مع جداول بيانات جوجل (Google Sheets)
 * نادي جسور الطلابي — كلية العلوم الإسلامية (جامعة الجزائر 1)
 */

function doPost(e) {
  try {
    const rawData = e.postData.contents;
    const payload = JSON.parse(rawData);
    const data = payload.structuredData;

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
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
    statsSheet.setRightToLeft(true);

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'تم تسجيل التقرير في Google Sheets بنجاح ✅'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

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
  headerRange.setBackground("#eab308");
  headerRange.setFontColor("#000000");
  headerRange.setFontWeight("bold");
  headerRange.setHorizontalAlignment("center");
  sheet.setFrozenRows(1);
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