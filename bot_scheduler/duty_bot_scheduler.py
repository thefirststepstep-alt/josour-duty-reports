#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
📱 محرك التذكير والجدولة الآلي لتقارير المداومة — نادي جسور الطلابي
يعتمد على Telethon وجلسة المداومة المعتمدة (C:\\JoussourDuty\\duty_session)
"""

import sys
import asyncio
from datetime import datetime
from telethon import TelegramClient, Button

SESSION_PATH = r"C:\JoussourDuty\duty_session"
API_ID = 30632586
API_HASH = "b9049fc2c7dfc7f88e8cbf9403d73278"

# رابط التطبيق المصغر لنادي جسور على GitHub Pages
DUTY_APP_URL = "https://thefirststepstep-alt.github.io/josour-duty-reports/"

async def send_morning_reminder(target_user, mini_app_url=DUTY_APP_URL):
    """إرسال تذكير المداومة الصباحية في الخاص مع زر فتح النموذج (عند 12:45)"""
    client = TelegramClient(SESSION_PATH, API_ID, API_HASH)
    await client.connect()

    text = (
        "☀️ **السلام عليكم ورحمة الله وبركاته أخي/أختي المداوم(ة) 🌸**\n\n"
        "شارفت **المداومة الصباحية** على الانتهاء. نرجو منك التكرم بملء التقرير الصباحي "
        "لتسليم العهدة والمستجدات للمداوم المسائي في أقل من دقيقة عبر الزر أدناه 👇\n\n"
        "بوركت جهودكم وتقبل الله عملكم 🌿"
    )

    buttons = [
        [Button.url("📝 فتح استمارة التقرير الصباحي", mini_app_url)]
    ]

    await client.send_message(target_user, text, buttons=buttons, parse_mode='md')
    await client.disconnect()
    print(f"✅ تم إرسال تذكير الصباحية إلى: {target_user}")


async def send_evening_reminder(target_user, mini_app_url=DUTY_APP_URL):
    """إرسال تذكير المداومة المسائية في الخاص مع زر فتح النموذج (عند 15:30)"""
    client = TelegramClient(SESSION_PATH, API_ID, API_HASH)
    await client.connect()

    text = (
        "🌙 **السلام عليكم ورحمة الله وبركاته أخي/أختي المداوم(ة) 🌿**\n\n"
        "شارفت **المداومة المسائية** على الانتهاء. نرجو منك إتمام بروتوكول الغلق وملء التقرير المسائي "
        "وتوثيق مكان حفظ المفتاح عبر الزر أدناه 👇\n\n"
        "جزاك الله خيراً على جهودك المخلصة طوال اليوم ✨"
    )

    buttons = [
        [Button.url("📝 فتح استمارة التقرير المسائي", mini_app_url)]
    ]

    await client.send_message(target_user, text, buttons=buttons, parse_mode='md')
    await client.disconnect()
    print(f"✅ تم إرسال تذكير المسائية إلى: {target_user}")


async def post_report_to_club_group(group_id_or_username, report_text):
    """نشر نص التقرير المنسق في مجموعة النادي تلقائياً"""
    client = TelegramClient(SESSION_PATH, API_ID, API_HASH)
    await client.connect()

    await client.send_message(group_id_or_username, report_text, parse_mode='md')
    await client.disconnect()
    print(f"🚀 تم نشر التقرير الرسمي بنجاح في مجموعة النادي!")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python duty_bot_scheduler.py [morning|evening|post] [target_user_or_group] [optional_text]")
    else:
        action = sys.argv[1]
        target = sys.argv[2]
        
        if action == "morning":
            asyncio.run(send_morning_reminder(target))
        elif action == "evening":
            asyncio.run(send_evening_reminder(target))
        elif action == "post" and len(sys.argv) >= 4:
            text_to_post = sys.argv[3]
            asyncio.run(post_report_to_club_group(target, text_to_post))