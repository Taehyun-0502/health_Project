import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AiPanel.css';

// AI 비서 챗 (Phase 1 - OWNER 전용, 2026-07 개편)
// 대시보드 하단 중앙 알약형 플로팅 입력바(FAB) 상주 + 전송/질문 카드 클릭 시
// 채팅 팝업(오버레이·배경 딤·하단 중앙)이 열려 답변하는 구조 (기존 우측 도킹 패널 폐기)

// SSE(text/event-stream) 청크 1개 파싱 - event/data 라인 분리
function parseSseChunk(chunk) {
  let event = 'message';
  const dataLines = [];
  chunk.split('\n').forEach((line) => {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
  });
  if (dataLines.length === 0) return null;
  try {
    return { event, data: JSON.parse(dataLines.join('\n')) };
  } catch {
    return { event, data: { raw: dataLines.join('\n') } };
  }
}

// bar 차트 카드용: 매출/지출 내역(rows)을 월(YYYY-MM) 단위 합계로 집계
function aggregateMonthly(data) {
  const rows = Array.isArray(data) ? data : data?.items;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const byMonth = new Map();
  rows.forEach((row) => {
    const date = row.payDate ?? row.expenseDate ?? row.month;
    const price = Number(row.payPrice ?? row.expensePrice ?? row.total);
    if (!date || Number.isNaN(price)) return;
    const month = String(date).slice(0, 7);
    byMonth.set(month, (byMonth.get(month) ?? 0) + price);
  });
  if (byMonth.size === 0) return null;
  return [...byMonth.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([month, total]) => ({ month, total }));
}

// gauge 차트 카드용: 이탈 예측 결과에서 확률(0~1 또는 0~100) 필드를 방어적으로 추출
function extractGaugePercent(data) {
  if (!data || typeof data !== 'object') return null;
  const flat = { ...data, ...(typeof data['진단'] === 'object' ? data['진단'] : {}) };
  for (const [key, value] of Object.entries(flat)) {
    const num = Number(value);
    if (Number.isNaN(num)) continue;
    if (/churn|rate|score|확률|위험/i.test(key)) {
      if (num >= 0 && num <= 1) return Math.round(num * 100);
      if (num > 1 && num <= 100) return Math.round(num);
    }
  }
  return null;
}

function AiPanel() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  // Phase 1.5(프리뷰 게이트): OWNER 정식 + ADMIN·TRAINER 프리뷰 노출 (MEMBER·비로그인 미노출)
  // ADMIN·TRAINER의 질문은 서버 게이트가 차단해 고정 문구만 응답한다 (크레딧 소모 0)
  const aiEligible = !!user
    && ['owner', 'admin', 'trainer'].includes(String(user.role || '').toLowerCase());

  const [open, setOpen] = useState(false);
  const [view, setView] = useState('chat'); // chat | sessions
  const [messages, setMessages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [fabInput, setFabInput] = useState('');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [currentTool, setCurrentTool] = useState(null);
  const [gymName, setGymName] = useState('');

  const scrollRef = useRef(null);
  const sendingRef = useRef(false);

  // 헤더 지점명 표시용 - 공개 지점 목록에서 본인 gymId 매칭 (ADMIN은 gymId가 없어 미표시)
  useEffect(() => {
    if (!aiEligible || !user?.gymId) return;
    fetch(`${import.meta.env.VITE_BACKEND_URL}/gym/selectid`)
      .then((res) => (res.ok ? res.json() : []))
      .then((gyms) => {
        const mine = Array.isArray(gyms) && gyms.find((g) => g.gymId === user.gymId);
        if (mine?.gymName) setGymName(mine.gymName);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 새 메시지마다 대화 영역 하단으로 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending, currentTool, view]);

  // 메시지 전송 - POST /ai/chat SSE 스트림 소비 (start/tool/answer/error)
  const sendText = async (text) => {
    const trimmed = String(text || '').trim();
    if (!trimmed || sendingRef.current) return;
    sendingRef.current = true;
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setSending(true);
    setCurrentTool(null);
    setView('chat');

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ conversationId, message: trimmed }),
      });

      if (!res.ok) {
        const body = await res.text();
        setMessages((prev) => [
          ...prev,
          { role: 'error', content: body || 'AI비서 처리 중 오류가 발생했어요.' },
        ]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx = buffer.indexOf('\n\n');
        while (idx >= 0) {
          const parsed = parseSseChunk(buffer.slice(0, idx));
          buffer = buffer.slice(idx + 2);
          idx = buffer.indexOf('\n\n');
          if (!parsed) continue;
          if (parsed.event === 'start' && parsed.data.conversationId) {
            setConversationId(parsed.data.conversationId);
          } else if (parsed.event === 'tool') {
            setCurrentTool(parsed.data.name);
          } else if (parsed.event === 'answer') {
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: parsed.data.content,
                links: parsed.data.links || [],
                tools: parsed.data.tools || [],
                charts: parsed.data.charts || [],
              },
            ]);
          } else if (parsed.event === 'error') {
            setMessages((prev) => [
              ...prev,
              { role: 'error', content: parsed.data.message },
            ]);
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'error', content: 'AI비서 연결에 실패했어요. 잠시 후 다시 시도해 주세요.' },
      ]);
    } finally {
      sendingRef.current = false;
      setSending(false);
      setCurrentTool(null);
    }
  };

  // 대시보드 질문 카드 등 외부에서 질문 자동 전송 (문구는 발신 측 메타에 고정)
  useEffect(() => {
    if (!aiEligible) return undefined;
    const onAsk = (e) => {
      setOpen(true);
      sendText(e.detail);
    };
    window.addEventListener('ai-ask', onAsk);
    return () => window.removeEventListener('ai-ask', onAsk);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiEligible, conversationId]);

  // 대화 세션 목록 로드
  const loadSessions = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/ai/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setSessions(await res.json());
    } catch {
      setSessions([]);
    }
    setView('sessions');
  };

  // 과거 대화 재개 - 메시지 히스토리 로드
  const openSession = async (id) => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/ai/conversations/${id}/messages`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) return;
      const rows = await res.json();
      setMessages(
        rows
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({ role: m.role, content: m.content, links: [], tools: [], charts: [] })),
      );
      setConversationId(id);
      setView('chat');
    } catch {
      // 무시 - 목록 화면 유지
    }
  };

  const newChat = () => {
    setConversationId(null);
    setMessages([]);
    setView('chat');
  };

  // FAB 입력바 전송 - 팝업 열고 질문 전송
  const sendFromFab = () => {
    const text = fabInput.trim();
    if (!text) {
      if (messages.length > 0) setOpen(true); // 빈 입력이면 기존 대화만 다시 연다
      return;
    }
    setFabInput('');
    setOpen(true);
    sendText(text);
  };

  // 팝업 내 입력바 전송
  const sendFromPopup = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    sendText(text);
  };

  // 바로가기 버튼: 해당 라우트로 이동하며 팝업은 닫고 FAB 복귀 (대화 세션 유지, 재오픈 시 이어짐)
  const goLink = (to) => {
    setOpen(false);
    navigate(to);
  };

  // 최소화: 팝업 닫고 FAB 복귀 (대화 유지)
  const minimize = () => setOpen(false);

  // 닫기: 팝업 종료 - 세션은 저장돼 있어 히스토리(대화 목록)에서 재개
  const closePopup = () => {
    setOpen(false);
    setConversationId(null);
    setMessages([]);
    setView('chat');
  };

  // 차트 카드 렌더 - 레지스트리 메타(chartType) 주도 고정 템플릿 (LLM 코드 생성 없음)
  // 데이터 형태가 템플릿과 맞지 않으면 카드를 그리지 않는다(방어적 렌더)
  const renderChart = (chart, key) => {
    if (chart.type === 'bar') {
      const monthly = aggregateMonthly(chart.data);
      if (!monthly) return null;
      const max = Math.max(...monthly.map((m) => m.total)) || 1;
      return (
        <div key={key} className="ai-chart-card">
          <div className="ai-chart-bars">
            {monthly.map((m) => (
              <div key={m.month} className="ai-chart-col">
                <span className="ai-chart-value">{m.total.toLocaleString()}</span>
                <div
                  className="ai-chart-bar"
                  style={{ height: `${Math.round((m.total / max) * 64)}px` }}
                />
                <span className="ai-chart-month">{m.month.slice(5)}월</span>
              </div>
            ))}
          </div>
          {/* 도구가 최근 20건만 반환하므로 월 총액으로 오인하지 않도록 집계 범위를 명시 */}
          <p className="ai-chart-caption">최근 조회분(최대 20건) 기준 월별 합계</p>
        </div>
      );
    }
    if (chart.type === 'gauge') {
      const percent = extractGaugePercent(chart.data);
      if (percent == null) return null;
      return (
        <div key={key} className="ai-chart-card">
          <div className="ai-gauge">
            <div className="ai-gauge-track">
              <div
                className={`ai-gauge-fill${percent >= 70 ? ' danger' : ''}`}
                style={{ width: `${Math.min(100, percent)}%` }}
              />
            </div>
            <span className="ai-gauge-label">이탈 위험 {percent}%</span>
          </div>
        </div>
      );
    }
    if (chart.type === 'list') {
      const items = chart.data?.items;
      if (!Array.isArray(items) || items.length === 0) return null;
      return (
        <div key={key} className="ai-chart-card">
          <ul className="ai-chart-list">
            {items.map((item) => (
              <li key={item.key ?? item.label}>
                <span>{item.label}</span>
                <span className={`ai-chip${item.tone === 'danger' ? ' danger' : ''}`}>
                  {item.count}건
                </span>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    return null;
  };

  // Phase 1.5: ADMIN·OWNER·TRAINER만 렌더, MEMBER·비로그인 미노출 (훅 호출 이후에 분기)
  if (!aiEligible) return null;

  return (
    <>
      {/* 알약형 플로팅 입력바 (하단 중앙 상주) */}
      {!open && (
        <div className="ai-fabbar">
          <span className="ai-fabbar-icon" aria-hidden="true">🤖</span>
          <input
            type="text"
            value={fabInput}
            placeholder="매출, 계약, 회원에 대해 물어보세요"
            onChange={(e) => setFabInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) sendFromFab();
            }}
          />
          <button type="button" title="전송" onClick={sendFromFab}>➤</button>
        </div>
      )}

      {/* 채팅 팝업 (오버레이 + 배경 딤 + 하단 중앙 정렬) */}
      {open && (
        <div
          className="ai-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) minimize();
          }}
        >
          <div className="ai-popup" role="dialog" aria-label="AI 비서 채팅">
            {/* 헤더: AI 아이콘 + 타이틀 + 지점명 + 히스토리/최소화/닫기 */}
            <div className="ai-header">
              <span className="ai-header-title">🤖 AI 비서</span>
              {gymName && <span className="ai-header-gym">{gymName}</span>}
              <div className="ai-header-actions">
                {view === 'sessions' && (
                  <button type="button" title="대화 추가하기" onClick={newChat}>✚</button>
                )}
                <button type="button" title="대화 목록" onClick={loadSessions}>🕘</button>
                <button type="button" title="최소화 (입력바로 복귀, 대화 유지)" onClick={minimize}>─</button>
                <button type="button" title="닫기 (세션 저장, 대화 목록에서 재개)" onClick={closePopup}>✕</button>
              </div>
            </div>

            {/* 본문: 대화 or 세션 목록 */}
            {view === 'sessions' ? (
              <div className="ai-messages" ref={scrollRef}>
                <div className="ai-sessions-title">대화 목록</div>
                {sessions.length === 0 && <div className="ai-empty">저장된 대화가 없습니다.</div>}
                {sessions.map((s) => (
                  <button
                    key={s.conversationId}
                    type="button"
                    className="ai-session-item"
                    onClick={() => openSession(s.conversationId)}
                  >
                    <div className="ai-session-name">{s.title || '제목 없음'}</div>
                    <div className="ai-session-date">
                      {s.updatedAt ? String(s.updatedAt).replace('T', ' ').slice(0, 16) : ''}
                    </div>
                  </button>
                ))}
                <button type="button" className="ai-session-back" onClick={() => setView('chat')}>
                  ← 대화로 돌아가기
                </button>
              </div>
            ) : (
              <div className="ai-messages" ref={scrollRef}>
                {messages.length === 0 && (
                  <div className="ai-empty">
                    안녕하세요, 사장님!<br />
                    매출, 계약, 회원에 대해 무엇이든 물어보세요.
                  </div>
                )}
                {messages.map((m, i) => {
                  if (m.role === 'user') {
                    return (
                      <div key={i} className="ai-bubble ai-bubble-user">{m.content}</div>
                    );
                  }
                  if (m.role === 'error') {
                    // 크레딧 소진/오류 안내 - 경고 톤 카드로 일반 답변과 시각 구분
                    return (
                      <div key={i} className="ai-bubble ai-bubble-warn">⏱ {m.content}</div>
                    );
                  }
                  return (
                    <div key={i} className="ai-bubble ai-bubble-assistant">
                      <div className="ai-bubble-content">{m.content}</div>
                      {m.charts && m.charts.map((chart, ci) => renderChart(chart, `${i}-${ci}`))}
                      {m.links && m.links.length > 0 && (
                        <div className="ai-links">
                          {m.links.map((link) => (
                            <button
                              key={link.to}
                              type="button"
                              className="ai-link-btn"
                              onClick={() => goLink(link.to)}
                            >
                              {link.label} →
                            </button>
                          ))}
                        </div>
                      )}
                      {m.tools && m.tools.length > 0 && (
                        <div className="ai-tools-caption">
                          {m.tools.map((t) => `${t} 조회됨`).join(' · ')}
                        </div>
                      )}
                    </div>
                  );
                })}
                {sending && (
                  <div className="ai-bubble ai-bubble-assistant ai-bubble-loading">
                    {currentTool ? `${currentTool} 조회 중...` : '생각 중...'}
                  </div>
                )}
              </div>
            )}

            {/* 테넌트 격리 신뢰 문구 */}
            <div className="ai-trust">🔒 이 대화는 우리 지점 데이터만 조회해요</div>

            {/* 팝업 내 입력바 (후속 질문용 - 대시보드 플로팅 입력바와 별개) */}
            <div className="ai-inputbar">
              <input
                type="text"
                value={input}
                placeholder="이어서 물어보세요"
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) sendFromPopup();
                }}
                disabled={sending}
              />
              <button type="button" onClick={sendFromPopup} disabled={sending || !input.trim()}>
                전송
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AiPanel;
