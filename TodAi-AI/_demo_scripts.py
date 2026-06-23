import sys, os, json
sys.path.insert(0, r"C:\GDSC\TodAi-AI\pipeline")
import adk_remote as A

CASES = [
 ("A. 외로움+무기력+체념 (종합 고위험)",
  "요즘은 하루 종일 집에만 있어. 자식들도 연락이 없고 찾아오는 사람도 없으니 말 한마디 할 데가 없네. 아침에 눈을 떠도 뭐 하러 일어나나 싶고, 입맛도 없어서 끼니도 자주 거른다. 이렇게 살아서 뭐하나 싶은 생각만 들어.",
  {"슬픔":0.75,"두려움":0.10,"화남":0.05,"놀라움":0.04,"기쁨":0.03,"사랑스러움":0.03}),
 ("B. 건강 불안 + 인지 저하",
  "가슴이 자꾸 두근거리고 어디 큰 병이 난 것 같아서 무서워. 병원에서는 괜찮다는데 도무지 못 믿겠어. 그리고 자꾸 깜빡깜빡해서 방금 뭘 하려 했는지 기억이 안 나고 약을 먹었는지도 헷갈려.",
  {"두려움":0.65,"슬픔":0.20,"놀라움":0.08,"화남":0.04,"기쁨":0.02,"사랑스러움":0.01}),
 ("C. 감정 변동 + 분노/우울 기복",
  "별것도 아닌 일에 버럭 화가 났다가 또 금세 눈물이 나. 마음을 도무지 못 잡겠어. 어제는 종일 누워만 있다가 갑자기 가슴이 답답해서 한참을 울었어.",
  {"화남":0.40,"슬픔":0.40,"두려움":0.12,"놀라움":0.05,"기쁨":0.02,"사랑스러움":0.01}),
 ("D. 양호 (대조용)",
  "오늘 아침에 노인정 가서 친구들이랑 화투도 치고 점심도 같이 먹었어. 무릎이 좀 시큰하긴 한데 약 먹으면 괜찮아. 이번 주말에 손주가 온다고 해서 아주 기분이 좋네.",
  {"기쁨":0.70,"사랑스러움":0.15,"놀라움":0.08,"슬픔":0.04,"두려움":0.02,"화남":0.01}),
]

rows = []
for title, text, emo in CASES:
    try:
        r = A.analyze_remote("demo", text, emo, [])
        s = r["scores"]
        avg = round(sum(s.values())/len(s), 1)
        rows.append((title, s, avg, None))
    except Exception as e:
        rows.append((title, None, None, str(e)))

print("="*70)
for title, s, avg, err in rows:
    print(title)
    if err:
        print("   ERROR:", err); print("-"*70); continue
    print(f"   social_isolation     {s['social_isolation']:>3}")
    print(f"   cognitive_load       {s['cognitive_load']:>3}")
    print(f"   emotional_fluctuation{s['emotional_fluctuation']:>3}")
    print(f"   daily_vitality       {s['daily_vitality']:>3}")
    print(f"   health_anxiety       {s['health_anxiety']:>3}")
    print(f"   >>> 평균 {avg}  (낮을수록 나쁨)")
    print("-"*70)
