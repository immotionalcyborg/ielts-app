import time
import json
import os
import requests

BOT_TOKEN = "9085588840:AAE7izAq8_QR3KIH7X08l5T3XwtVsbCu_AI"
BASE_WEBAPP_URL = "https://online-telegram-mini-app.onrender.com"
ADMIN_ID = 7424070960
USERS_FILE = "users.json"

API_URL = f"https://api.telegram.org/bot{BOT_TOKEN}"

def load_users():
    if os.path.exists(USERS_FILE):
        try:
            with open(USERS_FILE, "r") as f:
                return json.load(f)
        except Exception:
            return []
    return []

def save_user(user_id):
    users = load_users()
    if user_id not in users:
        users.append(user_id)
        with open(USERS_FILE, "w") as f:
            json.dump(users, f)

def send_message(chat_id, text, reply_markup=None):
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML"
    }
    if reply_markup:
        payload["reply_markup"] = json.dumps(reply_markup)
    try:
        requests.post(f"{API_URL}/sendMessage", json=payload, timeout=10)
    except Exception as e:
        print(f"Xatolik: {e}")

def handle_update(update):
    if "message" not in update:
        return

    msg = update["message"]
    chat_id = msg["chat"]["id"]
    text = msg.get("text", "")
    first_name = msg["from"].get("first_name", "Foydalanuvchi")

    save_user(chat_id)

    if text.startswith("/start"):
        keyboard = {
            "inline_keyboard": [
                [{"text": "🚀 30 Kunlik Challenge'ni Ochish", "web_app": {"url": BASE_WEBAPP_URL}}],
                [{"text": "🌐 Brauzerda ochish", "url": BASE_WEBAPP_URL}]
            ]
        }
        welcome_text = (
            f"Assalomu alaykum, <b>{first_name}</b>! 👋\n\n"
            "🎯 <b>30 kunlik IELTS Writing Master Challenge</b> platformasiga xush kelibsiz!\n\n"
            "👇 Boshlash uchun pastdagi tugmani bosing:"
        )
        send_message(chat_id, welcome_text, keyboard)

    elif text.startswith("/help"):
        help_text = "💡 Darslarni boshlash uchun <b>«🚀 30 Kunlik Challenge'ni Ochish»</b> tugmasini bosing."
        send_message(chat_id, help_text)

    elif chat_id == ADMIN_ID:
        if text.startswith("/admin"):
            users = load_users()
            admin_text = (
                "⚙️ <b>Admin boshqaruv paneli</b>\n\n"
                f"👥 Foydalanuvchilar soni: <b>{len(users)} ta</b>\n\n"
                "• <code>/stats</code> — Statistika\n"
                "• <code>/send Matn</code> — Barchaga xabar tarqatish"
            )
            send_message(chat_id, admin_text)

        elif text.startswith("/stats"):
            users = load_users()
            send_message(chat_id, f"📊 Jami foydalanuvchilar: <b>{len(users)} ta</b>")

        elif text.startswith("/send"):
            msg_to_send = text.replace("/send", "").strip()
            if msg_to_send:
                users = load_users()
                cnt = 0
                for u in users:
                    try:
                        send_message(u, msg_to_send)
                        cnt += 1
                    except Exception:
                        pass
                send_message(chat_id, f"✅ Xabar <b>{cnt}/{len(users)}</b> ta foydalanuvchiga yuborildi.")

def main():
    print("🤖 IELTS Bot muvaffaqiyatli ishga tushdi...")
    offset = None

    try:
        requests.get(f"{API_URL}/getUpdates?offset=-1", timeout=10)
    except Exception:
        pass

    while True:
        try:
            url = f"{API_URL}/getUpdates?timeout=30"
            if offset:
                url += f"&offset={offset}"
            res = requests.get(url, timeout=35).json()

            if res.get("ok"):
                for item in res.get("result", []):
                    offset = item["update_id"] + 1
                    handle_update(item)
        except Exception:
            time.sleep(2)

if __name__ == "__main__":
    main()
