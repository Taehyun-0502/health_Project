# -*- coding: utf-8 -*-
"""
헬스장 회원 이탈 — 행동 변화 시뮬레이터 (Streamlit 데모)
실행:  streamlit run app.py       (이 폴더에서)
구성:  ① 회원 진단·시뮬레이션   ② 헬스장 대시보드
"""
import os, sys
import pandas as pd
import streamlit as st
import altair as alt

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from predict import predict, simulate, predict_gym   # 엔진 재사용

st.set_page_config(page_title="헬스장 이탈 시뮬레이터", page_icon="🏋️", layout="wide")

TIER_COLOR = {"안정": "#2e7d32", "관찰": "#f9a825", "개입": "#ef6c00", "긴급": "#c62828"}
CONG_OPTS = ["여유", "보통", "혼잡", "매우혼잡"]


if "selected_gym_id" not in st.session_state:
    st.session_state.selected_gym_id = 0
if "selected_gym_name" not in st.session_state:
    st.session_state.selected_gym_name = "전체 헬스장"


def tier_badge(tier, score, actual):
    c = TIER_COLOR.get(tier, "#555")
    ar = f"{actual:.0f}%" if actual is not None else "-"
    st.markdown(
        f"""<div style="background:{c};color:white;padding:18px 22px;border-radius:12px;">
        <span style="font-size:15px;opacity:.85;">위험 등급</span><br>
        <span style="font-size:40px;font-weight:800;">{tier}</span>
        <span style="font-size:18px;margin-left:12px;">위험점수 {score:.1f}</span><br>
        <span style="font-size:14px;opacity:.9;">이 등급의 실제 이탈률(과거 관측): <b>{ar}</b></span>
        </div>""", unsafe_allow_html=True)


@st.cache_data(show_spinner="헬스장 전체 회원 분석 중…")
def gym_report(source="테스트용 CSV 파일", gym_id=0):
    if source == "실시간 DB (Supabase)":
        from churn import fetch_all, row_to_member
        rows = fetch_all()
        if gym_id != 0:
            rows = [r for r in rows if r.get("gym_id") == gym_id]
        members = [row_to_member(r) for r in rows]
        rep = predict_gym(members)
        return rep
    else:
        df = pd.read_csv(os.path.join(HERE, "gym_churn_realistic_v23.csv"), encoding="cp949")
        cols = ["나이", "그룹수업_참여", "이번달_주당방문횟수", "총_이용개월수", "최근한달_일평균_운동시간",
                "PT_가입여부", "기구_만족도", "최근한달_부상경험", "주_이용_시간대_혼잡도", "불편_회원_경험",
                "가격_만족도", "직원_만족도", "서비스_만족도", "상대_방문공백", "설문_응답여부"]
        members = [{c: r[c] for c in cols} for _, r in df.iterrows()]
        rep = predict_gym(members)
        rep["_실제이탈율"] = round(float(df["이탈"].mean()) * 100, 1)
        rep["_실제이탈수"] = int(df["이탈"].sum())
        return rep


st.sidebar.subheader("⚙️ 시스템 설정")
data_source = st.sidebar.radio("데이터 소스 선택", ["실시간 DB (Supabase)", "테스트용 CSV 파일"], index=0)

st.sidebar.markdown("---")
st.sidebar.subheader("🔄 DB 데이터 관리")
if st.sidebar.button("전체 회원 분석 및 DB 갱신", help="Spring Boot API를 호출하여 h_churn_result 테이블을 갱신합니다."):
    with st.spinner("전체 회원 이탈 예측을 갱신하는 중..."):
        import requests
        try:
            res_api = requests.post("http://localhost:8080/result/analyze/all", timeout=120)
            if res_api.status_code == 200:
                count = res_api.text
                st.sidebar.success(f"✅ DB 갱신 완료! (총 {count}명 분석)")
                st.cache_data.clear()  # 캐시 초기화하여 실시간 분석 즉시 갱신
            else:
                st.sidebar.error(f"❌ 갱신 실패 (HTTP {res_api.status_code})")
        except Exception as e:
            st.sidebar.error(f"❌ 백엔드 연결 실패: {e}\n\n(스프링 부트 서버가 8080 포트로 동작 중인지 확인해 주세요.)")

tab1, tab2 = st.tabs(["🧍 회원 진단 · 시뮬레이션", "🏢 헬스장 대시보드"])

# ─────────────────────────────── 탭1: 개별 회원 ───────────────────────────────
with tab1:
    st.title("🏋️ 회원 이탈 진단 & 행동 변화 시뮬레이터")
    st.caption("회원 조건을 넣으면 이탈 위험을 진단하고, **무엇을 바꾸면 이탈이 얼마나 줄어드는지** 시뮬레이션합니다.")

    left, right = st.columns([1, 1.9], gap="large")
    with left:
        st.subheader("📋 회원 선택 및 프로필")
        
        # 데이터 소스에 따른 회원 목록 준비
        selected_row = None
        member = {}
        username_str = ""
        contract_type_str = ""
        
        if data_source == "실시간 DB (Supabase)":
            from churn import fetch_all, row_to_member
            db_rows = fetch_all()
            if not db_rows:
                st.warning("DB에 등록된 회원 데이터가 없습니다.")
                st.stop()
                
            # 세션에 저장된 헬스장 ID가 있으면 필터링
            if st.session_state.selected_gym_id != 0:
                db_rows = [r for r in db_rows if r.get("gym_id") == st.session_state.selected_gym_id]
                st.info(f"🏢 **{st.session_state.selected_gym_name}** 회원만 표시 중입니다.")
            else:
                st.info("🏢 **전체 헬스장** 회원 표시 중 (탭2에서 특정 헬스장을 고르면 연동됩니다.)")
                
            if not db_rows:
                st.warning(f"선택한 헬스장({st.session_state.selected_gym_name})에 회원 데이터가 없습니다.")
                st.stop()
                
            def format_db_member(r):
                return f"회원 {r['username']} (나이: {r['age']}, 계약: {r['contract_type'] or '-'})"
            
            selected_row = st.selectbox("진단할 회원을 선택하세요:", options=db_rows, format_func=format_db_member)
            if selected_row:
                member = row_to_member(selected_row)
                username_str = str(selected_row["username"])
                contract_type_str = selected_row.get("contract_type") or "-"
        else:
            df = pd.read_csv(os.path.join(HERE, "gym_churn_realistic_v23.csv"), encoding="cp949")
            if df.empty:
                st.warning("CSV 파일에 데이터가 없습니다.")
                st.stop()
                
            cols = ["나이", "그룹수업_참여", "이번달_주당방문횟수", "총_이용개월수", "최근한달_일평균_운동시간",
                    "PT_가입여부", "기구_만족도", "최근한달_부상경험", "주_이용_시간대_혼잡도", "불편_회원_경험",
                    "가격_만족도", "직원_만족도", "서비스_만족도", "상대_방문공백", "설문_응답여부", "마지막_방문_경과일"]
            
            member_list = []
            for idx, r in df.iterrows():
                m_dict = {c: r[c] for c in cols if c in df.columns}
                m_dict["username"] = r.get("username", r.get("전화번호", idx))
                m_dict["contract_type"] = r.get("contract_type", r.get("계약유형", "테스트"))
                member_list.append(m_dict)
                
            def format_csv_member(r):
                return f"회원 {r['username']} (나이: {r['나이']}, 계약: {r['contract_type']})"
            
            selected_row = st.selectbox("진단할 회원을 선택하세요:", options=member_list, format_func=format_csv_member)
            if selected_row:
                member = selected_row
                username_str = str(selected_row["username"])
                contract_type_str = selected_row.get("contract_type", "테스트")
        
        # 회원 프로필 카드 가시화
        if selected_row:
            st.markdown("---")
            st.markdown("##### 👤 회원 프로필 요약")
            col_a, col_b = st.columns(2)
            with col_a:
                st.write(f"**전화번호(ID)**: `{username_str}`")
                st.write(f"**나이**: `{member.get('나이')}세`")
                st.write(f"**이용 개월수**: `{member.get('총_이용개월수')}개월`")
                st.write(f"**주당 방문 횟수**: `{member.get('이번달_주당방문횟수'):.1f}회`")
                st.write(f"**마지막 방문 경과**: `{member.get('마지막_방문_경과일', 0)}일`")
            with col_b:
                st.write(f"**운동 시간**: `{member.get('최근한달_일평균_운동시간')}분`")
                st.write(f"**PT 가입 여부**: `{'가입' if member.get('PT_가입여부') == 1 else '미가입'}`")
                st.write(f"**그룹수업 참여**: `{'참여' if member.get('그룹수업_참여') == 1 else '미참여'}`")
                st.write(f"**시간대 혼잡도**: `{member.get('주_이용_시간대_혼잡도')}`")
                st.write(f"**계약 유형**: `{contract_type_str}`")
            
            st.markdown("---")
            # 설문 응답 여부 및 만족도 표시
            if member.get("설문_응답여부", 1):
                st.success("✅ 최근 설문조사 응답자 (만족도 정보 포함)")
                st.write(f"· 기구 만족도: `{member.get('기구_만족도')}점` · 가격 만족도: `{member.get('가격_만족도')}점`")
                st.write(f"· 직원 만족도: `{member.get('직원_만족도')}점` · 서비스 만족도: `{member.get('서비스_만족도')}점`")
            else:
                st.info("ℹ️ 최근 설문조사 미응답자 (행동 데이터 기반 진단)")

    res = predict(member)
    sim = simulate(member)

    with right:
        tier_badge(res["위험등급"], res["위험점수"], res.get("등급_실측이탈률%"))

        st.subheader("📌 핵심 이탈 원인")
        st.caption("무엇이 이탈을 밀어올리고(↑), 무엇이 잡아주는지(↓) — SHAP 기여도")
        cc1, cc2 = st.columns(2)
        with cc1:
            st.markdown("**🔺 위험요인 (이탈↑)**")
            up = pd.DataFrame(res["위험요인_이탈↑"])
            if up.empty:
                st.caption("두드러진 위험요인 없음")
            else:
                cat_mapping = {
                    "가격_만족도": ("가격불만", "💸 가격 불만족 세부 분석"),
                    "기구_만족도": ("기구불만", "🏋️ 기구 불만족 세부 분석"),
                    "직원_만족도": ("직원불만", "👤 직원 불만족 세부 분석"),
                    "서비스_만족도": ("서비스불만", "🧼 서비스 불만족 세부 분석")
                }
                
                for _, row in up.iterrows():
                    col = row["컬럼"]
                    factor_label = row["해석"]
                    contrib = row["기여도"]
                    conf = row["신뢰도%"]
                    
                    header_text = f"🔺 {factor_label} (기여도: {contrib:.2f} / 신뢰도: {conf:.1f}%)"
                    with st.expander(header_text):
                        st.markdown(f"**요인 상세**: 이탈 기여도 `{contrib:.3f}` | 신뢰도 `{conf:.1f}%`")
                        
                        if col in cat_mapping:
                            cat_key, cat_label = cat_mapping[col]
                            st.markdown(f"**{cat_label} (Top 3)**")
                            cat_items = res["카테고리별_예상불만"].get(cat_key, [])
                            if cat_items:
                                cat_df = pd.DataFrame(cat_items).rename(columns={"확률%": "가능성%"})
                                cat_df["항목"] = cat_df["항목"].apply(lambda x: x.split("_")[-1] if "_" in x else x)
                                st.dataframe(cat_df[["항목", "가능성%"]], hide_index=True, width='stretch')
        with cc2:
            st.markdown("**🔻 보호요인 (이탈↓)**")
            dn = pd.DataFrame(res["보호요인_이탈↓"])
            if dn.empty:
                st.caption("두드러진 보호요인 없음")
            else:
                st.dataframe(dn.rename(columns={"컬럼": "요인", "해석": "설명"})[["요인", "설명", "기여도", "신뢰도%"]],
                             hide_index=True, width='stretch')



        st.subheader("🔁 개선 시뮬레이션")
        st.caption(f"가장 효과적인 개입: **{sim['가장_효과적_개입']}**  ·  막대가 길수록 이탈을 크게 낮춤")
        sdf = pd.DataFrame(sim["시뮬레이션"])
        sdf["이탈감소(%p)"] = -sdf["위험점수_변화"]   # 양수=감소폭(클수록 좋음)

        def sim_block(title, cat, color):
            sub = sdf[sdf["유형"] == cat].sort_values("이탈감소(%p)", ascending=False)
            if sub.empty:
                return
            st.markdown(f"**{title}**")
            chart = (alt.Chart(sub).mark_bar(color=color).encode(
                x=alt.X("이탈감소(%p):Q", title="이탈 위험 감소 (%p)"),
                y=alt.Y("개입:N", sort="-x", title=None),
                tooltip=["개입", "변경후_위험점수", "이탈감소(%p)", "변경후_등급", "신뢰도%"])
                .properties(height=max(70, 42 * len(sub))))
            st.altair_chart(chart, width='stretch')

        sim_block("🏢 헬스장이 바로 할 수 있는 것 (직접)", "직접", "#1565c0")
        sim_block("🎯 행동 유도 목표 — 프로그램/혜택으로 (유도)", "유도", "#00897b")

        show = sdf.rename(columns={"변경후_위험점수": "변경후점수", "변경후_등급": "변경후등급"})
        st.dataframe(show[["개입", "유형", "변경후점수", "이탈감소(%p)", "변경후등급", "신뢰도%"]],
                     hide_index=True, width='stretch')

        st.info("ℹ️ 유도(방문 회복)는 효과가 가장 크지만 헬스장이 직접 통제하긴 어렵습니다 — "
                "출석 챌린지·리인게이지 캠페인으로 **유도**하는 목표입니다. 직접 지렛대(PT·만족도)는 바로 실행 가능. "
                "수치는 상관 기반 예상 시나리오로 인과 보장은 아니며, 신뢰도(%)가 낮으면 회원별 효과 편차가 큽니다.")

# ─────────────────────────────── 탭2: 헬스장 대시보드 ───────────────────────────────
with tab2:
    st.title("🏢 헬스장 리텐션 대시보드")
    st.caption("전체 회원 명단 기준 경영 지표 — 예상 이탈율 · 위험등급 분포 · 관리 대상(위험군)")

    # 헬스장 지점 선택기
    if data_source == "실시간 DB (Supabase)":
        from churn import fetch_gyms
        try:
            gyms = fetch_gyms()
            gym_options = [{"gym_id": 0, "gym_name": "전체 헬스장"}] + gyms
            
            # 현재 선택된 gym_id의 인덱스 매칭
            selected_idx = 0
            for idx, g in enumerate(gym_options):
                if g["gym_id"] == st.session_state.selected_gym_id:
                    selected_idx = idx
                    break
                    
            selected_gym = st.selectbox(
                "🏢 분석할 사업장(헬스장) 선택:",
                options=gym_options,
                index=selected_idx,
                format_func=lambda x: f"{x['gym_name']} (ID: {x['gym_id']})" if x['gym_id'] != 0 else x['gym_name'],
                key="gym_selector_tab2"
            )
            if selected_gym:
                st.session_state.selected_gym_id = selected_gym["gym_id"]
                st.session_state.selected_gym_name = selected_gym["gym_name"]
        except Exception as e:
            st.error(f"헬스장 목록 조회 실패: {e}")
            st.session_state.selected_gym_id = 0
            st.session_state.selected_gym_name = "전체 헬스장"
    else:
        st.session_state.selected_gym_id = 0
        st.session_state.selected_gym_name = "전체 헬스장"
        st.info("💡 테스트용 CSV 파일은 지점 필터링을 지원하지 않습니다.")

    rep = gym_report(data_source, st.session_state.selected_gym_id)

    k1, k2, k3, k4 = st.columns(4)
    k1.metric("회원 수", f"{rep['회원수']:,}명")
    k2.metric("예상 이탈율", f"{rep['예상_이탈율']}%",
              help="보정확률 평균 — 실제 이탈률과 대조 가능한 경영 KPI")
    ci = rep["예상_이탈인원_95CI"]
    k3.metric("예상 이탈 인원", f"{rep['예상_이탈인원']:.0f}명", help=f"95% CI {ci[0]:.0f}~{ci[1]:.0f}")
    if "_실제이탈율" in rep:
        k4.metric("실제 이탈(학습표본)", f"{rep['_실제이탈율']}% / {rep['_실제이탈수']:,}명")
    else:
        k4.metric("실제 이탈(실시간)", "-")

    st.divider()
    d1, d2 = st.columns([1.2, 1], gap="large")
    with d1:
        st.subheader("위험 등급 분포")
        tdf = pd.DataFrame(rep["위험등급_분포"])
        chart = (alt.Chart(tdf).mark_bar().encode(
            x=alt.X("인원:Q", title="인원"),
            y=alt.Y("등급:N", sort=["긴급", "개입", "관찰", "안정"], title=None),
            color=alt.Color("등급:N", scale=alt.Scale(domain=list(TIER_COLOR),
                            range=list(TIER_COLOR.values())), legend=None),
            tooltip=["등급", "인원", "비율%", "실측이탈률%"]).properties(height=200))
        st.altair_chart(chart, width='stretch')
        st.dataframe(tdf, hide_index=True, width='stretch')

    with d2:
        st.subheader("🎯 관리 대상 (위험군)")
        a = rep["액션_top_N"]
        st.metric("관리 대상", f"{a['액션대상_수']:,}명", f"전체의 {a['액션대상_비율%']}%")
        st.metric("커버하는 예상 이탈", f"{a['커버_예상이탈인원']:.0f}명",
                  f"{a['예상이탈_커버율%']}% of 예상 이탈")
        st.caption("위험등급이 **개입·긴급**인 회원 전체가 관리 대상입니다. "
                   "전체 이탈 예상의 대부분을 이 그룹이 차지합니다.")

    st.divider()
    e1, e2 = st.columns([1, 1.25], gap="large")
    with e1:
        st.subheader("🔍 위험군 이탈 이유 TOP 5")
        st.caption(f"위험군 {rep.get('위험군_수', 0):,}명 기준 — 이탈을 밀어올린 핵심 요인(SHAP)을 "
                   "회원 수로 집계한 **진단**입니다.")
        rdf = pd.DataFrame(rep.get("이탈이유_top5", []))
        if rdf.empty:
            st.caption("위험군이 없습니다.")
        else:
            st.dataframe(rdf, hide_index=True, width='stretch')
    with e2:
        st.subheader("🛠️ 개입 우선순위 (효과 큰 순)")
        st.caption("위험군에 적용했을 때 이탈을 크게 낮추는 **순서**입니다. "
                   "감소 인원은 일부러 표시하지 않습니다 — 상관 기반 추정이라 '몇 명 절감'을 "
                   "단정할 수 없어, **어디부터 손댈지 우선순위로만** 제공합니다.")
        pdf = pd.DataFrame(rep.get("개입_우선순위", []))
        if pdf.empty:
            st.caption("위험군이 없습니다.")
        else:
            st.dataframe(pdf, hide_index=True, width='stretch')
            st.caption("유형 — **직접**: 헬스장이 바로 제공/투자(PT·시설·서비스) · "
                       "**유도**: 캠페인으로 회원 행동을 유도(출석 챌린지·리인게이지)")
