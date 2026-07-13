# -*- coding: utf-8 -*-
"""
헬스장 이탈/불만 예측 모델 학습 · 저장
--------------------------------------------------------------------
입력 : gym_churn_realistic_v22.csv (같은 폴더 또는 DATA 경로)
출력 : churn_bundle.joblib  (이탈모델 + 불만16모델 + 메타 전부 포함)
실행 : python train_models.py
"""
import os, json, numpy as np, pandas as pd
from sklearn.model_selection import cross_val_predict, StratifiedKFold
from sklearn.metrics import (roc_auc_score, accuracy_score, precision_score,
                             recall_score, f1_score, confusion_matrix)
from sklearn.calibration import CalibratedClassifierCV
from xgboost import XGBClassifier
import joblib, shap, warnings; warnings.filterwarnings("ignore")

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.environ.get("CHURN_CSV", os.path.join(HERE, "gym_churn_realistic_v23.csv"))
if not os.path.exists(DATA):
    DATA = r"c:\project\data\ver1\gym_churn_realistic_v23.csv"

CONG_MAP = {"여유": 0, "보통": 1, "혼잡": 2, "매우혼잡": 3}

# 설문 자기보고 컬럼(6종): 회원이 설문에 응답해야만 채워짐. 미응답 시 6개가 통째로 결측(NaN).
# 만족도 4종 + 부상경험 + 불편경험(모두 자기보고). 미응답은 '값 모름'으로만 취급(그 요인을
# 이탈이유에서 제외) — 미응답=이탈 신호로 단정 안 함(불만족뿐 아니라 무관심/게으름도 미응답이므로).
SURVEY_COLS = ["가격_만족도", "직원_만족도", "서비스_만족도", "기구_만족도",
               "최근한달_부상경험", "불편_회원_경험"]

FEATURES = ["나이","그룹수업_참여","이번달_주당방문횟수","총_이용개월수","최근한달_일평균_운동시간",
            "PT_가입여부","기구_만족도","최근한달_부상경험","주_이용_시간대_혼잡도","불편_회원_경험",
            "가격_만족도","직원_만족도","서비스_만족도","상대_방문공백"]
TARGET = "이탈"

# 단조 제약: 이탈 증가(+1)/감소(-1)/중립(0). 방향 뒤집힘(과적합 노이즈)만 차단, 비선형·상호작용은 유지.
# what-if 시뮬레이션의 '튕김'(개선책인데 이탈↑) 원천 차단용. churn 모델에만 적용(불만모델 제외).
MONO = {"나이": 0, "그룹수업_참여": -1, "이번달_주당방문횟수": -1, "총_이용개월수": -1, "최근한달_일평균_운동시간": -1,
        "PT_가입여부": -1, "기구_만족도": -1, "최근한달_부상경험": 1, "주_이용_시간대_혼잡도": 1, "불편_회원_경험": 1,
        "가격_만족도": -1, "직원_만족도": -1, "서비스_만족도": -1, "상대_방문공백": 1}
MONO_STR = "(" + ",".join(str(MONO[f]) for f in FEATURES) + ")"

def load():
    df = pd.read_csv(DATA, encoding="cp949")
    df["주_이용_시간대_혼잡도"] = df["주_이용_시간대_혼잡도"].map(CONG_MAP)
    return df

def prepare_survey_flag(df):
    """설문_응답여부(1=응답/0=미응답) 준비. v23엔 이미 컬럼·결측이 있으므로 그대로 쓰고,
    없으면 만족도 결측 여부로 파생. 데이터의 MNAR 결측을 그대로 학습에 사용."""
    df = df.copy()
    if "설문_응답여부" not in df.columns:
        df["설문_응답여부"] = df[SURVEY_COLS].notna().all(axis=1).astype(int)
    n_missing = int((df["설문_응답여부"] == 0).sum())
    return df, n_missing

def new_xgb(pos_weight, mono=None):
    kw = dict(n_estimators=400, max_depth=5, learning_rate=0.05, subsample=0.9,
              colsample_bytree=0.9, scale_pos_weight=pos_weight,
              eval_metric="logloss", random_state=42, n_jobs=-1)
    if mono: kw["monotone_constraints"] = mono
    return XGBClassifier(**kw)

def new_xgb_unweighted(mono=None):   # 확률 보정용: scale_pos_weight 미사용 (확률 왜곡 방지)
    kw = dict(n_estimators=400, max_depth=5, learning_rate=0.05, subsample=0.9,
              colsample_bytree=0.9, eval_metric="logloss", random_state=42, n_jobs=-1)
    if mono: kw["monotone_constraints"] = mono
    return XGBClassifier(**kw)

def main():
    df = load()
    df, n_masked = prepare_survey_flag(df)
    print(f"[설문 결측] 미응답 {n_masked}/{len(df)}명 ({n_masked/len(df)*100:.0f}%) "
          f": 만족도 4종 NaN(값 모름) -> 그 요인 제외. 미응답을 이탈신호로 쓰지 않음")
    comp_cols = [c for c in df.columns if any(c.startswith(p) for p in
                 ["직원불만","가격불만","서비스불만","기구불만"])]
    X = df[FEATURES].astype(float).values   # 설문 미응답 회원은 만족도 컬럼이 NaN (XGBoost가 native 처리)
    y = df[TARGET].values
    cv = StratifiedKFold(5, shuffle=True, random_state=42)
    posw = (y == 0).sum() / (y == 1).sum()

    # ---- 이탈 모델: 교차검증 성능 (단조 제약 적용) ----
    proba = cross_val_predict(new_xgb(posw, MONO_STR), X, y, cv=cv, method="predict_proba", n_jobs=-1)[:, 1]
    pred = (proba >= 0.5).astype(int)
    cm = confusion_matrix(y, pred)
    churn_metrics = {
        "ROC_AUC": round(roc_auc_score(y, proba), 4),
        "정확도": round(accuracy_score(y, pred), 4),
        "정밀도": round(precision_score(y, pred), 4),
        "재현율": round(recall_score(y, pred), 4),
        "F1": round(f1_score(y, pred), 4),
        "혼동행렬_[[TN,FP],[FN,TP]]": cm.tolist(),
        "이탈율": round(float(y.mean()), 4),
    }
    print("[이탈 모델] 5-fold:", churn_metrics)
    churn_model = new_xgb(posw, MONO_STR).fit(X, y)   # 전체 데이터로 최종 학습(단조 제약)

    # ---- 보정(캘리브레이션) 모델: 헬스장 전체 '예상 이탈율' 집계용 ----
    # scale_pos_weight 모델은 확률이 부풀려져 평균이 실제 이탈율보다 높음.
    # isotonic 보정으로 확률을 실제 분포에 맞춤 → mean(p) ≈ 실제 이탈율.
    calib_model = CalibratedClassifierCV(new_xgb_unweighted(MONO_STR), method="isotonic", cv=5).fit(X, y)
    calib_p = calib_model.predict_proba(X)[:, 1]
    calib_meta = {
        "실제_이탈율": round(float(y.mean()), 4),
        "보정_예상이탈율": round(float(calib_p.mean()), 4),
        "raw_예상이탈율(부풀림)": round(float(churn_model.predict_proba(X)[:, 1].mean()), 4),
    }
    print("[보정 모델] 실제 %.1f%% vs 보정예상 %.1f%% (raw %.1f%%)" % (
        calib_meta["실제_이탈율"]*100, calib_meta["보정_예상이탈율"]*100, calib_meta["raw_예상이탈율(부풀림)"]*100))

    # ---- 위험등급 참조 이탈률: 보정확률 밴드별 '실측' 이탈률 ----
    # ⚠ 이 값은 고정 상수가 아니라 '측정 결과'. 운영 시 최근 실데이터(rolling)로 재측정·갱신할 것.
    TIER_EDGES = [25, 45, 65]                 # % 단위 컷
    TIER_NAMES = ["안정", "관찰", "개입", "긴급"]
    tbin = np.digitize(calib_p * 100, TIER_EDGES)
    tier_rates = {}
    for i, nm in enumerate(TIER_NAMES):
        msk = tbin == i
        cut = (f"<{TIER_EDGES[0]}" if i == 0 else
               f"{TIER_EDGES[i-1]}~{TIER_EDGES[i]}" if i < len(TIER_EDGES) else f"{TIER_EDGES[-1]}+")
        tier_rates[nm] = {"컷%": cut, "인원": int(msk.sum()),
                          "실측이탈률": round(float(y[msk].mean()), 4) if msk.any() else None}
    print("[위험등급] " + " | ".join(
        f"{nm} {tier_rates[nm]['인원']}명 실측{(tier_rates[nm]['실측이탈률'] or 0)*100:.1f}%" for nm in TIER_NAMES))

    # ---- 변수 영향 '신뢰도': SHAP 기여도의 회원간 일관성 ----
    # 방향은 단조제약이 보장. 이 점수는 '영향 크기가 회원마다 얼마나 일정한가'(맥락 의존도).
    # 원지표 = |평균|/(|평균|+표준편차) 는 절대값이 작게 뭉쳐 → 최대변수=100 되도록 상대 정규화.
    sv = shap.TreeExplainer(churn_model).shap_values(X)          # (N, n_features)
    raw = {}
    for j, f in enumerate(FEATURES):
        s = sv[:, j]; mu = float(np.mean(s)); sd = float(np.std(s))
        raw[f] = {"평균기여도": round(mu, 4), "표준편차": round(sd, 4),
                  "원지표": abs(mu) / (abs(mu) + sd + 1e-9)}
    mx = max(v["원지표"] for v in raw.values()) or 1.0
    feat_conf = {f: {"평균기여도": v["평균기여도"], "표준편차": v["표준편차"],
                     "신뢰도": round(v["원지표"] / mx, 3)} for f, v in raw.items()}
    print("[신뢰도 top5] " + " | ".join(f"{f} {feat_conf[f]['신뢰도']*100:.0f}"
          for f in sorted(FEATURES, key=lambda k: -feat_conf[k]['신뢰도'])[:5]))

    # ---- 불만 모델(11개) : 서비스3·기구3·직원3·가격2, 접두어로 자동 감지 ----
    complaint_models, complaint_meta = {}, {}
    for c in comp_cols:
        yc = df[c].values
        w = (yc == 0).sum() / max((yc == 1).sum(), 1)
        p = cross_val_predict(new_xgb(w), X, yc, cv=cv, method="predict_proba", n_jobs=-1)[:, 1]
        complaint_meta[c] = {"prevalence": round(float(yc.mean()), 4),
                             "ROC_AUC": round(roc_auc_score(yc, p), 4)}
        complaint_models[c] = new_xgb(w).fit(X, yc)
    print("[불만 모델] 평균 AUC:",
          round(np.mean([m["ROC_AUC"] for m in complaint_meta.values()]), 4))

    bundle = {
        "churn_model": churn_model,
        "calib_model": calib_model,
        "complaint_models": complaint_models,
        "features": FEATURES,
        "survey_cols": SURVEY_COLS,          # 미응답 시 통째로 NaN이 되는 설문 컬럼
        "cong_map": CONG_MAP,
        "target": TARGET,
        "tier_edges": TIER_EDGES,
        "tier_names": TIER_NAMES,
        "meta": {"churn": churn_metrics, "calibration": calib_meta, "complaints": complaint_meta,
                 "tier_rates": tier_rates, "feature_confidence": feat_conf,
                 "n_samples": int(len(df)), "trained_on": os.path.basename(DATA),
                 "n_survey_missing": n_masked},
    }
    out = os.path.join(HERE, "churn_bundle.joblib")
    joblib.dump(bundle, out)
    json.dump(bundle["meta"], open(os.path.join(HERE, "metrics.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)
    print(f"[저장] {out}")

if __name__ == "__main__":
    main()
