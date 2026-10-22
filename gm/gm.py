# -*- coding: utf-8 -*-
"""
禁閉逃殺：文字獄　GM 工具（只在你自己的電腦上執行，不要放到網頁上）

功能：
  查詢帳號   看帳號存不存在、註冊／最後登入時間、存檔摘要（用來確認玩家身分）
  重設密碼   幫玩家設一組新密碼（預設隨機產生臨時密碼），玩家登入後再用遊戲裡的「🔑 修改密碼」改掉
  列出帳號   列出所有註冊過的帳號

注意：玩家的「原密碼」查不到——Firebase 只存加密後的結果，連你也還原不出來，所以只能重設。

用法（在專案資料夾裡）：
  python gm/gm.py                       打開選單
  python gm/gm.py find 帳號
  python gm/gm.py reset 帳號 [新密碼]   不填新密碼就自動產生
  python gm/gm.py list

第一次使用要放一個「服務帳戶金鑰」(.json) 到 gm 資料夾，步驟見 gm/說明.txt。這個檔案等於專案的最高權限，千萬不要上傳或傳給別人。
"""
import sys, os, re, json, glob, secrets, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
LIBS = os.path.join(HERE, "_libs")          # firebase-admin 裝在這裡（不進 git）
if os.path.isdir(LIBS):
    sys.path.insert(0, LIBS)
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

DB_URL = "https://confinement-escape-text-default-rtdb.asia-southeast1.firebasedatabase.app"
DOMAIN = "@jbts.game"                         # 遊戲把「帳號」轉成「帳號@jbts.game」當登入信箱
NAME_RE = re.compile(r"^[A-Za-z0-9_]{3,16}$")
PW_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"   # 拿掉容易看錯的 0 O 1 l I
LOG_FILE = os.path.join(HERE, "gm_log.txt")   # 只記「誰、什麼時候、做了什麼」，不記密碼

_fb = {}


class GMError(Exception):
    pass


def valid_name(name):
    return bool(NAME_RE.match(name or ""))


def email_of(name):
    if not valid_name(name):
        raise GMError("帳號格式不對：要 3～16 個英文、數字或底線（不分大小寫）")
    return name.lower() + DOMAIN


def gen_password(n=10):
    """產生臨時密碼：保證有大寫、小寫、數字"""
    while True:
        pw = "".join(secrets.choice(PW_CHARS) for _ in range(n))
        if any(c.isupper() for c in pw) and any(c.islower() for c in pw) and any(c.isdigit() for c in pw):
            return pw


def find_key():
    for f in sorted(glob.glob(os.path.join(HERE, "*.json"))):
        try:
            with open(f, encoding="utf-8") as fh:
                d = json.load(fh)
            if d.get("type") == "service_account" and d.get("private_key"):
                return f
        except Exception:
            continue
    return None


def init():
    """第一次呼叫時才載入 firebase-admin 並連線"""
    if _fb:
        return _fb
    key = find_key()
    if not key:
        raise GMError("找不到服務帳戶金鑰。請依照 gm/說明.txt，把從 Firebase 下載的 .json 檔放進 gm 資料夾。")
    try:
        import firebase_admin
        from firebase_admin import credentials, auth, db
    except ImportError:
        raise GMError("還沒安裝 firebase-admin。請在專案資料夾執行：pip install --target gm/_libs firebase-admin")
    if not firebase_admin._apps:
        firebase_admin.initialize_app(credentials.Certificate(key), {"databaseURL": DB_URL})
    _fb.update(auth=auth, db=db)
    return _fb


def fmt_ts(ms):
    if not ms:
        return "（沒有紀錄）"
    return datetime.datetime.fromtimestamp(ms / 1000).strftime("%Y-%m-%d %H:%M:%S")


def log_action(action, name):
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write("%s\t%s\t%s\n" % (datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"), action, name))
    except Exception:
        pass


def get_user(name):
    fb = init()
    email = email_of(name)
    try:
        return fb["auth"].get_user_by_email(email)
    except fb["auth"].UserNotFoundError:
        raise GMError("找不到帳號「%s」。（帳號不分大小寫，請確認有沒有打錯）" % name)


def summarize_save(uid):
    """讀雲端存檔，整理成幾行摘要；讀不到就回傳 None"""
    fb = init()
    node = fb["db"].reference("users/" + uid).get()
    if not node or "save" not in node:
        return None
    try:
        s = json.loads(node["save"]["d"])
    except Exception:
        return ["（雲端存檔格式讀不出來）"]
    prog = s.get("prog", {})
    cleared = prog.get("cleared", 0)
    return [
        "金條：%s　　總抽數：%s" % (s.get("gold", "?"), s.get("pulls", "?")),
        "擁有角色：%d 名　　出戰隊伍：%s" % (len(s.get("owned", {})), "、".join(s.get("team", [])) or "（無）"),
        "主線進度：已通關 %s 章　　深淵最深：D%s" % (cleared, prog.get("abyssBest", 0)),
        "遠征次數：%s　　成就：%d 個" % (s.get("stats", {}).get("runs", "?"), len(s.get("ach", {}))),
        "存檔最後更新：%s" % fmt_ts(s.get("updatedAt")),
    ]


def cmd_find(name):
    u = get_user(name)
    m = u.user_metadata
    print("\n帳號：%s（登入信箱 %s）" % (name, u.email))
    print("註冊時間：%s" % fmt_ts(m.creation_timestamp))
    print("最後登入：%s" % fmt_ts(m.last_sign_in_timestamp))
    print("帳號狀態：%s" % ("已停用" if u.disabled else "正常"))
    summ = summarize_save(u.uid)
    print("\n── 雲端存檔摘要（拿來確認玩家身分：請他說出目前的金條、角色數）──")
    print("\n".join(summ) if summ else "（還沒有上傳過雲端存檔）")
    log_action("查詢", name)


def cmd_reset(name, new_pw=None, yes=False):
    u = get_user(name)
    if new_pw is None:
        new_pw = gen_password()
        auto = True
    else:
        auto = False
        if len(new_pw) < 6:
            raise GMError("密碼至少要 6 個字")
    if not yes:
        print("即將重設帳號「%s」的密碼（最後登入：%s）。" % (name, fmt_ts(u.user_metadata.last_sign_in_timestamp)))
        ans = input("確定的話，請再輸入一次帳號名稱：").strip()
        if ans.lower() != name.lower():
            print("輸入不一致，已取消。")
            return
    fb = init()
    fb["auth"].update_user(u.uid, password=new_pw)
    try:
        fb["auth"].revoke_refresh_tokens(u.uid)      # 舊的登入狀態全部失效，逼對方用新密碼重新登入
    except Exception:
        pass
    log_action("重設密碼", name)
    print("\n✅ 已重設帳號「%s」的密碼。" % name)
    print("   %s密碼：%s" % ("臨時" if auto else "新", new_pw))
    print("   請把這組密碼告訴玩家，並提醒他登入後到 👤 →「🔑 修改密碼」改成自己的。")


def cmd_list():
    fb = init()
    rows = []
    for u in fb["auth"].list_users().iterate_all():
        if u.email and u.email.endswith(DOMAIN):
            rows.append((u.email[:-len(DOMAIN)], u.user_metadata.creation_timestamp, u.user_metadata.last_sign_in_timestamp))
    rows.sort(key=lambda r: r[1] or 0)
    print("\n共 %d 個帳號：" % len(rows))
    print("%-18s %-20s %s" % ("帳號", "註冊時間", "最後登入"))
    for n, c, l in rows:
        print("%-18s %-20s %s" % (n, fmt_ts(c), fmt_ts(l)))


def ask_name(prompt="請輸入玩家的帳號："):
    return input(prompt).strip()


def menu():
    while True:
        print("\n=== 禁閉逃殺 GM 工具 ===")
        print("1) 查詢帳號（確認玩家身分）")
        print("2) 重設密碼")
        print("3) 列出所有帳號")
        print("0) 離開")
        c = input("請選擇：").strip()
        try:
            if c == "1":
                cmd_find(ask_name())
            elif c == "2":
                n = ask_name()
                pw = input("要指定新密碼嗎？（直接按 Enter＝自動產生臨時密碼）：").strip() or None
                cmd_reset(n, pw)
            elif c == "3":
                cmd_list()
            elif c == "0":
                return
            else:
                print("請輸入 0～3")
        except GMError as e:
            print("❌", e)
        except Exception as e:
            print("❌ 發生錯誤：", type(e).__name__, e)


def main(argv):
    try:
        if len(argv) < 2:
            return menu()
        c = argv[1].lower()
        if c == "find" and len(argv) >= 3:
            cmd_find(argv[2])
        elif c == "reset" and len(argv) >= 3:
            cmd_reset(argv[2], argv[3] if len(argv) >= 4 else None)
        elif c == "list":
            cmd_list()
        else:
            print(__doc__)
    except GMError as e:
        print("❌", e)
        return 1
    except Exception as e:
        print("❌ 發生錯誤：", type(e).__name__, e)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
