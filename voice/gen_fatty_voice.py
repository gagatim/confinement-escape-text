# 肥宅物語配音產生工具（需要：pip install kokoro soundfile "misaki[zh]" lameenc edge-tts）
# 旁白：Kokoro-82M zm_yunxi（語速 0.85，與第 13～15 章結局旁白相同）
# 肥宅：微軟 edge-tts zh-TW-YunJheNeural（雲哲）
# 輸出：voice/story/fatty{章}_intro_NN.mp3、fatty{章}_end_NN.mp3，並印出要貼進 index.html 的 FATTY_VOX
import asyncio, json, os, sys
import numpy as np, lameenc, edge_tts
from kokoro import KPipeline

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "story")
N, F = "N", "F"
SCRIPT = {
 16: {
  "intro": [
   (N, "停屍間的鐵櫃之間，有人用紙箱搭了一個小窩，四周堆滿泡麵、零食和可樂。一個圓滾滾的人影窩在裡面，捧著一碗冒煙的泡麵。"),
   (F, "欸？你們也被傳進來啦？這遊戲的新手教學也太硬了吧。"),
   (N, "他叫肥宅。他完全不覺得這是真的。"),
   (F, "這是 VR 吧？登出鍵在哪？")],
  "end": [
   (N, "教學機器人倒下的時候，螢幕上跳出一行字：恭喜畢業。"),
   (F, "……欸，這好像不是遊戲欸。"),
   (N, "他低頭看了看自己的手，剛才捧著泡麵的那雙手，還在微微發抖。"),
   (F, "沒關係。反正，我本來就不想一個人待在紙箱裡。"),
   (N, "前方，有一道新的門亮了起來。")]},
 17: {
  "intro": [
   (N, "新手教學的門後，是一條長長的暗廊，牆上貼滿職業的圖示：戰士、法師、盜賊、牧師。喇叭廣播著：請依照職業，排隊接受鑑定。無職業者，將被視為多餘的人。"),
   (F, "這種遊戲，我一定都選坦克。……可是這裡的人，好像不覺得坦克算職業。")],
  "end": [
   (N, "鑑定官倒下的前一刻，把手裡最後一把刀，擲向了隊友的背後。"),
   (N, "肥宅什麼都沒想，整個人撲了過去。刀鋒擦過他的外套，他悶哼了一聲，卻沒有退。"),
   (F, "欸，這一下，我擋得住。"),
   (N, "隊友回過頭，臉色發白。肥宅咬著牙，拍了拍他的肩。"),
   (F, "坦克也是職業。登記起來，以後有人可以抄。"),
   (N, "他眼前跳出一行字：防禦，加一。"),
   (F, "……欸，這好像是真的？")]},
 18: {
  "intro": [
   (N, "走廊的鐵櫃之間，空氣裡浮滿了密密麻麻的留言，像一場永不停止的暴風雪。肥宅去死。第一個淘汰。笑死，坦克。每一個字，都在看著你們。"),
   (N, "肥宅抬頭看了一會兒，握緊拳頭，然後戴上耳機。"),
   (F, "欸，沒事。我在網路上被罵習慣了。"),
   (N, "他把留言區靜音，繼續往前走。")],
  "end": [
   (N, "彈幕之王倒下，滿螢幕的留言一條一條熄滅，只剩下最後一行小小的字：對不起。"),
   (N, "肥宅把耳機拿下來一邊，靜靜地看了很久。"),
   (F, "欸，我沒有生氣。下次，換你們幫別人擋著吧。"),
   (N, "他沒有關掉靜音，只是讓一點點聲音，漏了進來。")]},
 19: {
  "intro": [
   (N, "你們走進一片荒廢的營地，補給箱全空了，只剩下被翻得亂七八糟的紙箱。空氣裡，是一股空蕩蕩的飢餓感。廣播低聲念著：補給已耗盡。最後一份，只夠一個人。"),
   (N, "隊伍裡的每個人，都開始盯著彼此的背包。肥宅沒有說話，默默把自己的背包拉開。"),
   (F, "……來，大家分。")],
  "end": [
   (N, "斷糧者倒下，空箱子裡滾出了一顆小小的糖果。他看著肥宅，低聲問：為什麼，你們沒有搶？"),
   (N, "那天晚上，肥宅把最後一碗泡麵，分成了好幾份。營火旁，每個人手裡都捧著一點熱湯，沒有人說話，只有筷子碰到碗邊的聲音。"),
   (N, "斷糧者站在火光的邊緣，肥宅把自己那份，也遞了過去。"),
   (F, "欸，因為我們有人幫我們擋著，所以，不用搶。"),
   (F, "一碗泡麵的錢，換一群朋友，這筆生意不虧。")]},
 20: {
  "intro": [
   (N, "最後一個大廳，是一座蓋在大樓頂樓的巨大競技場。看台上坐滿了沉默的觀眾，腳下是整座城市的夜景，競技場中央，立著一個巨大的紅色按鈕。廣播平靜地念著：請選出一位，永久刪除。其餘人，可以離開。"),
   (N, "肥宅看著那顆按鈕，把耳機摘了下來，輕輕放進口袋。"),
   (F, "……這次，我自己來說。")],
  "end": [
   (N, "護盾快要碎掉的那一刻，滿天的留言突然湧了出來。這一次，不是罵聲：撐住！不要輸！這才是主角！"),
   (N, "肥宅把留言區的靜音，整個打開了。那些字化成金色的光，匯進他的手心，凝成了一把劍。"),
   (N, "他握緊劍，回頭看了一眼身後的人。"),
   (F, "欸，這一次，換我們打回去。"),
   (N, "全員衝鋒，刪號者伸向按鈕的手，被一劍擋了下來。紅色的按鈕，慢慢熄滅了。"),
   (N, "那天晚上，大家圍著營火，每個人手裡都捧著一碗泡麵。滿天的留言，變成了星星：好好休息。你們做到了。")]},
}

def mp3(a, rate=24000):
    pcm = (np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes()
    e = lameenc.Encoder(); e.set_bit_rate(64); e.set_in_sample_rate(rate); e.set_channels(1); e.set_quality(2)
    return e.encode(pcm) + e.flush()

def narrate(pipe, text, path):
    aud = [a.numpy() if hasattr(a, "numpy") else np.array(a) for _, _, a in pipe(text, voice="zm_yunxi", speed=0.85)]
    open(path, "wb").write(mp3(np.concatenate(aud)))

async def fatty(text, path):
    for k in range(6):  # edge-tts 偶爾會回傳空音訊，重試幾次
        try:
            await edge_tts.Communicate(text, "zh-TW-YunJheNeural").save(path)
            if os.path.getsize(path) > 1000: return
        except Exception as e:
            print("retry", k, e, flush=True)
        await asyncio.sleep(1.5)
    raise RuntimeError("edge-tts 失敗：" + text)

def main():
    pipe = KPipeline(lang_code="z", repo_id="hexgrad/Kokoro-82M")
    vox = {}
    for ch, parts in SCRIPT.items():
        vox[ch] = {}
        for kind in ("intro", "end"):
            names = []
            for i, (who, text) in enumerate(parts[kind], 1):
                name = f"fatty{ch - 15}_{kind}_{i:02d}"
                path = os.path.join(OUT, name + ".mp3")
                if os.path.exists(path) and os.path.getsize(path) > 1000: names.append(name); print("skip", name, flush=True); continue
                if who == N: narrate(pipe, text, path)
                else: asyncio.run(fatty(text, path))
                names.append(name); print("ok", name, flush=True)
            vox[ch][kind] = names
    print("FATTY_VOX=" + json.dumps(vox, ensure_ascii=False))

if __name__ == "__main__":
    main()
