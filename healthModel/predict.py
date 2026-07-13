# -*- coding: utf-8 -*-
"""
헬스장 회원 이탈/불만 예측 — 추론 모듈
--------------------------------------------------------------------
사용법:
    from predict import predict
    result = predict({
        "나이": 28, "그룹수업_참여": 0, "이번달_주당방문횟수": 0.8,
        "총_이용개월수": 3, "최근한달_일평균_운동시간": 45, "PT_가입여부": 0,
        "기구_만족도": 2, "최근한달_부상경험": 0, "주_이용_시간대_혼잡도": "매우혼잡",
        "불편_회원_경험": 0, "가격_만족도": 2, "직원_만족도": 3, "서비스_만족도": 3,
        "마지막_방문_경과일": 22,          # → 상대_방문공백 자동 계산
    })
    print(result)

CLI: python predict.py           (샘플 회원 예측 데모)
"""
import os, numpy as np, pandas as pd, joblib, shap
import warnings; warnings.filterwarnings("ignore")

HERE = os.path.dirname(os.path.abspath(__file__))
_B = joblib.load(os.path.join(HERE, "churn_bundle.joblib"))
_FEAT = _B["features"]; _CONG = _B["cong_map"]
_SURVEY = _B.get("survey_cols", ["가격_만족도","직원_만족도","서비스_만족도","기구_만족도","최근한달_부상경험","불편_회원_경험"])
_CHURN = _B["churn_model"]; _COMP = _B["complaint_models"]
_CALIB = _B.get("calib_model")   # 헬스장 집계용 보정 모델
_EXPL = shap.TreeExplainer(_CHURN)
_TEDGES = _B.get("tier_edges", [25, 45, 65])          # 위험등급 컷(% 단위, 보정확률 기준)
_TNAMES = _B.get("tier_names", ["안정", "관찰", "개입", "긴급"])
_TRATES = _B.get("meta", {}).get("tier_rates", {})    # 등급별 '실측' 이탈률(참조·갱신대상)
_FCONF = _B.get("meta", {}).get("feature_confidence", {})  # 변수 영향 신뢰도(SHAP 일관성)

def _conf(feat):
    """변수 영향 신뢰도(%) — SHAP 기여도의 회원간 일관성."""
    c = _FCONF.get(feat, {}).get("신뢰도")
    return None if c is None else round(c * 100, 1)

def _tier(cal_p):
    """보정확률(0~1) → 위험등급명. 컷은 % 단위."""
    return _TNAMES[int(np.digitize(cal_p * 100, _TEDGES))]

def _tier_actual(tier):
    """해당 등급의 실측 이탈률(%) — 참조값(운영 시 rolling 갱신)."""
    r = _TRATES.get(tier, {}).get("실측이탈률")
    return None if r is None else round(r * 100, 1)

_LABEL = {  # 방향 해설용
    "상대_방문공백": ("평소보다 오래 결석", "규칙적 방문"),
    "이번달_주당방문횟수": ("방문 적음", "자주 방문"),
    "PT_가입여부": ("PT 미가입", "PT 가입"),
    "그룹수업_참여": ("그룹수업 미참여", "그룹수업 참여"),
    "총_이용개월수": ("가입 초기", "장기 회원"),
    "기구_만족도": ("기구 불만족", "기구 만족"),
    "직원_만족도": ("직원 불만족", "직원 만족"),
    "서비스_만족도": ("서비스 불만족", "서비스 만족"),
    "가격_만족도": ("가격 불만족", "가격 만족"),
    "최근한달_부상경험": ("최근 부상", "부상 없음"),
    "불편_회원_경험": ("불편 경험", "불편 없음"),
    "최근한달_일평균_운동시간": ("운동시간 짧음", "운동 몰입"),
    "주_이용_시간대_혼잡도": ("혼잡시간대 이용", "여유시간대 이용"),
    "나이": ("위험 연령대(젊은층/고령층)", "안정 연령대(중년)"),   # 비선형 U자
}

def _num(v):
    """숫자로 못 바꾸는 값(None·빈문자·NaN·미제공)은 결측(np.nan)으로. XGBoost가 native 처리."""
    if v is None:
        return np.nan
    if isinstance(v, str) and v.strip() == "":
        return np.nan
    try:
        return float(v)
    except (TypeError, ValueError):
        return np.nan

def _vectorize(m):
    m = dict(m)
    # 상대_방문공백 계산 (마지막방문 ÷ 평소주기), 미제공 시 그대로 사용
    if "상대_방문공백" not in m:
        v = max(_num(m.get("이번달_주당방문횟수", 1)) or 0.3, 0.3)
        gap = _num(m.get("마지막_방문_경과일", 0)) or 0.0
        m["상대_방문공백"] = round(min(gap / (7.0 / v), 20), 2)
    if isinstance(m.get("주_이용_시간대_혼잡도"), str):
        m["주_이용_시간대_혼잡도"] = _CONG[m["주_이용_시간대_혼잡도"]]

    # 설문 미응답 처리: 설문 컬럼이 하나라도 비면 '미응답'으로 간주(학습 분포와 일치시키기 위해
    # 5개를 통째로 NaN 처리하고 플래그 0). 호출자가 설문_응답여부를 명시하면 그 값을 존중.
    filled = [c for c in _SURVEY if _num(m.get(c)) == _num(m.get(c))]  # NaN 아닌 값만
    responded = m.get("설문_응답여부")
    responded = (1 if len(filled) == len(_SURVEY) else 0) if responded is None else int(responded)
    if not responded:
        for c in _SURVEY:
            m[c] = np.nan
    m["설문_응답여부"] = responded

    return np.array([[_num(m.get(f)) for f in _FEAT]], dtype=float), m

def predict(member, top_k=3):
    """회원 1명 → 위험등급 + 이유(SHAP) + 예상 불만 (CRM 개별 의사결정용).
    개별 단계에선 '확률 숫자'가 아니라 등급·순위·이유가 핵심.
    위험점수(보정확률)는 참고용, 등급_실측이탈률은 '같은 등급이 과거 실제로 얼마나 이탈했나'.
    """
    X, m = _vectorize(member)
    raw_p = float(_CHURN.predict_proba(X)[0, 1])                 # 랭킹용 원점수
    cal_p = float(_CALIB.predict_proba(X)[0, 1]) if _CALIB is not None else raw_p
    tier = _tier(cal_p)

    # SHAP 기여도 (양수=이탈 위험↑). 방향별로 분리해 각각 top-k.
    sv = _EXPL.shap_values(X)[0]

    def _drv(idxs, direction):
        out = []
        for i in idxs:
            f = _FEAT[i]; val = float(sv[i])
            out.append({"컬럼": f, "기여도": round(val, 3),
                        "해석": _LABEL.get(f, ("", ""))[direction] or f, "신뢰도%": _conf(f)})
        return out

    # 설문 미응답자는 만족도를 '모르는' 상태 → SHAP가 NaN 기본분기로 값을 귀속해도
    # '기구 만족' 같은 요인을 표시하지 않음(모르는 걸 아는 척 X). 설문_응답여부 자체는 유효 신호라 유지.
    skip = set() if int(m.get("설문_응답여부", 1)) else {_FEAT.index(c) for c in _SURVEY if c in _FEAT}
    pos = [i for i in np.argsort(-sv) if sv[i] > 0 and i not in skip][:top_k]   # 이탈↑ 큰 순
    neg = [i for i in np.argsort(sv) if sv[i] < 0 and i not in skip][:top_k]    # 이탈↓ 큰 순

    # 불만 예측
    comp = {c: float(mdl.predict_proba(X)[0, 1]) for c, mdl in _COMP.items()}
    top_comp = sorted(comp.items(), key=lambda kv: -kv[1])[:top_k]

    return {
        "위험등급": tier,
        "등급_실측이탈률%": _tier_actual(tier),          # 같은 등급의 과거 실제 이탈률
        "위험점수": round(cal_p * 100, 1),               # 참고용(보정확률). '확률'로 단정 X
        "랭킹점수": round(raw_p * 100, 1),               # 회원 간 순위 비교용
        "위험요인_이탈↑": _drv(pos, 0),                  # 이탈을 밀어올리는 요인
        "보호요인_이탈↓": _drv(neg, 1),                  # 이탈을 잡아주는 요인
        "예상_불만이유": [{"항목": c, "확률%": round(p * 100, 1)} for c, p in top_comp],
    }

def _score(member):
    """회원 dict → (위험점수%, 등급). 위험점수=보정확률(없으면 raw)."""
    X, _ = _vectorize(member)
    p = float(_CALIB.predict_proba(X)[0, 1]) if _CALIB is not None else float(_CHURN.predict_proba(X)[0, 1])
    return round(p * 100, 1), _tier(p)

def simulate(member, custom=None, top_k=3):
    """회원 1명 → 현재 위험 + '행동 변화 시뮬레이션'(what-if).

    각 개입을 적용했을 때 위험점수(보정확률)가 얼마나 떨어지는지 계산해
    '가장 효과적인 개입' 순으로 정렬. 이 프로젝트의 핵심 산출물.

    custom: [{"라벨":..., "변경":{피처:값,...}}] 형태로 직접 시나리오 지정 가능.
            미지정 시 회원 상태에 맞는 기본 개입 세트를 자동 구성.
    """
    cur_score, cur_tier = _score(member)

    def g(k, d): return float(member.get(k, d))

    # 기본 개입 시나리오 (라벨, 변경, 유형, 대표변수).
    #  유형=직접: 헬스장이 바로 제공/판매(PT·그룹·시설/서비스 투자)
    #  유형=유도: 프로그램·혜택으로 회원 행동을 유도(출석 챌린지·리인게이지 캠페인)
    # 단조제약으로 방향 뒤집힘이 없어 '결과가 뭐든' 다 노출해도 안전.
    scen = []
    if g("PT_가입여부", 0) == 0:
        scen.append(("PT 가입 권유", {"PT_가입여부": 1}, "직접", "PT_가입여부"))
    if g("그룹수업_참여", 0) == 0:
        scen.append(("그룹수업 등록 유도", {"그룹수업_참여": 1}, "직접", "그룹수업_참여"))
    # 방문 회복(유도): '빈도↑'와 '공백 해소'는 사실상 같은 행동(다시 규칙적으로 나옴)이라 하나로 통합
    scen.append(("재방문 유도 (방문 회복·출석 챌린지)",
                 {"이번달_주당방문횟수": g("이번달_주당방문횟수", 1) + 1, "마지막_방문_경과일": 2},
                 "유도", "상대_방문공백"))
    for satc, lbl in [("기구_만족도", "기구 개선 (+2)"), ("서비스_만족도", "서비스 개선 (+2)"),
                      ("직원_만족도", "직원 응대 개선 (+2)"), ("가격_만족도", "가격/혜택 개선 (+2)")]:
        if g(satc, 5) <= 3:
            scen.append((lbl, {satc: min(g(satc, 3) + 2, 5)}, "직접", satc))
    if custom:
        scen = [(c["라벨"], c["변경"], c.get("유형", "직접"), c.get("대표변수")) for c in custom]

    results = []
    for lbl, ch, cat, kf in scen:
        mm = dict(member); mm.update(ch)
        # 방문 관련 변경 시 상대_방문공백 재계산 유도
        if "마지막_방문_경과일" in mm and "상대_방문공백" not in ch:
            mm.pop("상대_방문공백", None)
        s, t = _score(mm)
        results.append({"개입": lbl, "유형": cat, "변경후_위험점수": s,
                        "위험점수_변화": round(s - cur_score, 1), "변경후_등급": t,
                        "신뢰도%": _conf(kf) if kf else None})
    results.sort(key=lambda r: r["위험점수_변화"])   # 감소폭 큰 순(음수 우선)

    return {
        "현재_위험등급": cur_tier,
        "현재_위험점수": cur_score,
        "가장_효과적_개입": results[0]["개입"] if results else None,
        "시뮬레이션": results,
    }

def predict_gym(members, capacity=None, top_k=3):
    """회원 리스트 → 헬스장 CRM 집계 리포트.

    3층 분리:
      · 경영 KPI : 예상_이탈율(보정확률 평균) + 예상_이탈인원 95%CI  → 실제와 대조용
      · 해석     : 위험등급 분포 + 등급별 '실측' 이탈률(참조)
      · 운영     : capacity 지정 시 랭킹 top-N 액션 대상 + 예상이탈 커버율

    capacity: 이번 기간 실제로 컨택 가능한 인원수(직원 캐파시티). 주면 top-N 액션 블록 포함.
    """
    X = np.vstack([_vectorize(m)[0] for m in members])
    n = len(members)

    # [경영 KPI] 예상 이탈율 — 보정 확률(집계는 잘 맞음). 없으면 raw 폴백
    if _CALIB is not None:
        cp = _CALIB.predict_proba(X)[:, 1]; calibrated = True
    else:
        cp = _CHURN.predict_proba(X)[:, 1]; calibrated = False
    exp_n = float(cp.sum())
    se = float(np.sqrt((cp * (1 - cp)).sum()))   # 포아송-이항 표준편차
    ci = (max(exp_n - 1.96 * se, 0), min(exp_n + 1.96 * se, n))

    # [해석] 위험등급 분포 (보정확률 밴드) + 등급별 실측 이탈률
    tbin = np.digitize(cp * 100, _TEDGES)
    tier_dist = []
    for i, nm in enumerate(_TNAMES):
        c = int((tbin == i).sum())
        tier_dist.append({"등급": nm, "인원": c, "비율%": round(c / n * 100, 1),
                          "실측이탈률%": _tier_actual(nm)})

    # [운영] 위험군(개입·긴급 등급) = 이번 기간 관리 대상. 전체 인원 기준(캐파시티 무관).
    risk_idx = np.where(tbin >= _TNAMES.index("개입"))[0]
    m = len(risk_idx)
    covered = float(cp[risk_idx].sum())          # 위험군이 커버하는 예상 이탈 인원
    action = {"액션대상_수": m,
              "액션대상_비율%": round(m / n * 100, 1),
              "커버_예상이탈인원": round(covered, 1),
              "예상이탈_커버율%": round(covered / exp_n * 100, 1) if exp_n else 0.0}

    # 주요 이탈사유 (불만 예상인원 = 확률합 기준 순위)
    comp_exp = {c: float(mdl.predict_proba(X)[:, 1].sum()) for c, mdl in _COMP.items()}
    top_comp = sorted(comp_exp.items(), key=lambda kv: -kv[1])[:top_k]

    # ── 위험군 기준: 이탈이유 TOP5(진단) + 개입 우선순위(효과순 정렬) ──
    # 위험군 = 위험등급 개입·긴급 회원 전체(위 risk_idx). 안정·관찰까지 섞으면 신호가 흐려짐.
    Xr = X[risk_idx]
    def _proba(Z): return (_CALIB or _CHURN).predict_proba(Z)[:, 1]

    이탈이유_top5, 개입_우선순위 = [], []
    if m:
        # [진단] 위험군 SHAP '이탈↑' 상위3 요인을 회원수로 집계 → 종합 이탈이유
        # 미응답 회원은 만족도 요인을 집계에서 제외(모르는 만족도를 이탈이유로 세지 않음).
        svr = _EXPL.shap_values(Xr)
        surv_idx = {_FEAT.index(c) for c in _SURVEY if c in _FEAT}
        cnt = {}
        for k, row in enumerate(svr):
            responded = not any(np.isnan(Xr[k, j]) for j in surv_idx)   # 만족도 결측이면 미응답
            picked = 0
            for i in np.argsort(-row):
                if row[i] <= 0 or picked >= top_k: break
                if not responded and i in surv_idx: continue   # 미응답자 만족도 요인 skip
                f = _FEAT[i]; cnt[f] = cnt.get(f, 0) + 1; picked += 1
        for f, c in sorted(cnt.items(), key=lambda kv: -kv[1])[:5]:
            이탈이유_top5.append({"이유": _LABEL.get(f, ("", ""))[0] or f,
                                 "취약회원수": c, "비율%": round(c / m * 100, 1),
                                 "신뢰도%": _conf(f)})

        # [처방] 위험군에 개입 적용 시 Σ이탈확률 감소로 '정렬만' (감소 명수는 비공개 —
        #        상관 기반 추정이라 '몇 명 절감'을 단정하면 위험. 우선순위로만 제공.)
        fi = {f: i for i, f in enumerate(_FEAT)}
        base = _proba(Xr)
        def _lever(name, cat, mask, mutate):
            if not mask.any(): return None
            Z = Xr.copy(); mutate(Z)
            gain = float(np.clip(base - _proba(Z), 0, None)[mask].sum())  # 정렬용(비공개)
            return {"개입": name, "유형": cat, "대상회원수": int(mask.sum()), "_효과": gain}

        def _revisit(Z):                       # 방문+1 & 공백 해소(=규칙적 재방문)
            v = Z[:, fi["이번달_주당방문횟수"]] + 1
            Z[:, fi["이번달_주당방문횟수"]] = v
            Z[:, fi["상대_방문공백"]] = np.clip(2.0 * v / 7.0, None, 20)

        levers = [
            _lever("PT 가입 캠페인", "직접", Xr[:, fi["PT_가입여부"]] == 0,
                   lambda Z: Z.__setitem__((slice(None), fi["PT_가입여부"]), 1)),
            _lever("그룹수업 등록 유도", "직접", Xr[:, fi["그룹수업_참여"]] == 0,
                   lambda Z: Z.__setitem__((slice(None), fi["그룹수업_참여"]), 1)),
            _lever("재방문 유도 (출석 챌린지·리인게이지)", "유도", np.ones(m, bool), _revisit),
        ]
        for f, nm in [("기구_만족도", "기구 개선"), ("서비스_만족도", "서비스 개선"),
                      ("직원_만족도", "직원 응대 개선"), ("가격_만족도", "가격/혜택 개선")]:
            levers.append(_lever(nm, "직접", Xr[:, fi[f]] <= 3,
                          (lambda j: lambda Z: Z.__setitem__(
                              (slice(None), j), np.minimum(Z[:, j] + 2, 5)))(fi[f])))
        levers = [l for l in levers if l]
        levers.sort(key=lambda l: -l["_효과"])
        for r, l in enumerate(levers, 1):
            개입_우선순위.append({"우선순위": r, "개입": l["개입"],
                               "유형": l["유형"], "대상회원수": l["대상회원수"]})

    return {
        "회원수": n,
        # 경영 KPI
        "예상_이탈율": round(float(cp.mean()) * 100, 1),
        "예상_이탈인원": round(exp_n, 1),
        "예상_이탈인원_95CI": [round(ci[0], 1), round(ci[1], 1)],
        "확률보정_적용": calibrated,
        # 해석
        "위험등급_분포": tier_dist,
        # 운영
        "액션_top_N": action,
        # 사유(진단) + 처방(우선순위) — 위험군 기준
        "위험군_수": int(m),
        "이탈이유_top5": 이탈이유_top5,
        "개입_우선순위": 개입_우선순위,
        # (레거시) 불만모델 기반 사유 — 확률합 순위
        "주요_이탈사유": [{"항목": c, "예상인원": round(v, 1),
                          "비율%": round(v / n * 100, 1)} for c, v in top_comp],
    }

if __name__ == "__main__":
    import json
    demo = {"나이": 28, "그룹수업_참여": 0, "이번달_주당방문횟수": 3, "총_이용개월수": 3,
            "최근한달_일평균_운동시간": 45, "PT_가입여부": 0, "기구_만족도": 2,
            "최근한달_부상경험": 0, "주_이용_시간대_혼잡도": "보통", "불편_회원_경험": 0,
            "가격_만족도": 3, "직원_만족도": 3, "서비스_만족도": 3, "마지막_방문_경과일": 10}
    print("[예측]"); print(json.dumps(predict(demo), ensure_ascii=False, indent=2))
    print("\n[행동변화 시뮬레이션]"); print(json.dumps(simulate(demo), ensure_ascii=False, indent=2))
