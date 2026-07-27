import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavIcon from '../components/uiIcons.jsx';
import './AiPanel.css';

// AI 비서 채팅 본문 (2026-07-21 기획서: 우측 통합 드로어의 'AI' 탭으로 편입)
// 드로어 패널 안에서 마운트를 유지하므로 드로어를 접어도 대화 상태가 보존된다.
// 외부(플로팅 입력바·대시보드 질문 카드)의 질문은 'ai-chat-send' 이벤트로 전달받는다.

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

// 비서 답변 전용 최소 렌더러: **텍스트**(볼드)만 <strong>으로 치환하고 그 외는 원문 그대로 노출한다.
// dangerouslySetInnerHTML을 쓰지 않고 React 텍스트 노드로만 조립해 임의 마크업 해석을 차단한다.
// 짝이 안 맞는 '**'는 일반 텍스트로 남는다(정규식이 매칭되지 않으므로 자연히 폴백).
function renderBold(content) {
  const text = String(content ?? '');
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
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

function AiChat({ onNavigate }) {
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  // 진행 인디케이터 단계: 'thinking'(생각 중) → 'tool'(데이터 조회 중) → 'visualizing'(시각화 중)
  const [stage, setStage] = useState(null);

  const scrollRef = useRef(null);
  const sendingRef = useRef(false);
  const conversationIdRef = useRef(null);
  const inputRef = useRef(null);
  const stageTimerRef = useRef(null);
  // 대화 시작 시점의 access token exp(초 단위) - 대화 세션 만료 판정용(2026-07-22 확정)
  const sessionExpRef = useRef(null);

  // 새 메시지마다 대화 영역 하단으로 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending, stage]);

  // 드로어 AI 탭이 열려 펼쳐질 때 탭 내 입력창에 자동 포커스(입력 흐름 단절 방지).
  // 기존 이벤트 브리지(b2b-drawer-state)를 그대로 구독만 하고 새 이벤트는 만들지 않는다.
  useEffect(() => {
    const onDrawerState = (e) => {
      const { activeKind, collapsed } = e.detail || {};
      if (activeKind === 'ai' && !collapsed) {
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    };
    window.addEventListener('b2b-drawer-state', onDrawerState);
    return () => window.removeEventListener('b2b-drawer-state', onDrawerState);
  }, []);

  // 언마운트 시 진행 인디케이터 전환 타이머 정리
  useEffect(() => () => clearTimeout(stageTimerRef.current), []);

  // 메시지 전송 - POST /ai/chat SSE 스트림 소비 (start/tool/answer/error)
  const sendText = async (text) => {
    const trimmed = String(text || '').trim();
    if (!trimmed || sendingRef.current) return;
    sendingRef.current = true;

    // 대화 세션 만료 = access token 만료와 동일(2026-07-22 확정): 시작 시점 exp가 지났으면
    // 대화 상태(conversationId·메시지)를 초기화하고 새 대화로 전환
    if (sessionExpRef.current != null && Date.now() / 1000 > sessionExpRef.current) {
      conversationIdRef.current = null;
      setConversationId(null);
      sessionExpRef.current = null;
      setMessages([]);
    }

    const token = localStorage.getItem('accessToken');
    // 새 대화 시작 시점의 access token 만료 시각 저장(표시용 디코드, 서명 검증 불필요)
    if (!conversationIdRef.current && sessionExpRef.current == null && token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (typeof payload.exp === 'number') sessionExpRef.current = payload.exp;
      } catch {
        // 디코드 실패 시 만료 판정 생략(기존 흐름 유지)
      }
    }

    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setSending(true);
    clearTimeout(stageTimerRef.current);
    setStage('thinking');

    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ conversationId: conversationIdRef.current, message: trimmed }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          // 대화 세션 만료와 동일하게 처리: 다음 전송이 새 대화가 되도록 초기화
          conversationIdRef.current = null;
          setConversationId(null);
          sessionExpRef.current = null;
        }
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
            conversationIdRef.current = parsed.data.conversationId;
            setConversationId(parsed.data.conversationId);
          } else if (parsed.event === 'tool') {
            // 도구명은 화면에 노출하지 않는다(감사는 h_ai_tool_audit로만 추적) - 단계 문구만 전환
            clearTimeout(stageTimerRef.current);
            setStage('tool');
            // 마지막 tool 이벤트 후 짧은 지연 뒤 시각화 단계로 전환(추가 tool 이벤트 오면 리셋)
            stageTimerRef.current = setTimeout(() => setStage('visualizing'), 1300);
          } else if (parsed.event === 'answer') {
            clearTimeout(stageTimerRef.current);
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
            clearTimeout(stageTimerRef.current);
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
      clearTimeout(stageTimerRef.current);
      sendingRef.current = false;
      setSending(false);
      setStage(null);
    }
  };

  // 외부 질문 수신 (플로팅 입력바 전송 / 대시보드 질문 카드) - 문구는 발신 측 메타에 고정
  useEffect(() => {
    const onSend = (e) => sendText(e.detail);
    window.addEventListener('ai-chat-send', onSend);
    return () => window.removeEventListener('ai-chat-send', onSend);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendFromInput = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    sendText(text);
  };

  // 바로가기 버튼: 해당 라우트로 이동 (드로어는 접히고 탭·대화는 보존 - onNavigate가 처리)
  const goLink = (to) => {
    if (onNavigate) onNavigate(to);
    else navigate(to);
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

  return (
    <div className="ai-chat">
      <div className="ai-messages" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="ai-empty">
            안녕하세요, 사장님!<br />
            매출, 계약, 회원에 대해 무엇이든 물어보세요.
          </div>
        )}
        {messages.map((m, i) => {
          if (m.role === 'user') {
            return <div key={i} className="ai-bubble ai-bubble-user">{m.content}</div>;
          }
          if (m.role === 'error') {
            // 크레딧 소진/오류 안내 - 경고 톤 카드로 일반 답변과 시각 구분
            return (
              <div key={i} className="ai-bubble ai-bubble-warn">
                <NavIcon id="clock" size={15} className="ui-icon" /> {m.content}
              </div>
            );
          }
          return (
            <div key={i} className="ai-bubble ai-bubble-assistant">
              <div className="ai-bubble-content">{renderBold(m.content)}</div>
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
                      {link.label} <NavIcon id="arrow" size={15} className="ui-icon" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {sending && (
          <div className="ai-bubble ai-bubble-assistant ai-bubble-loading">
            {stage === 'tool'
              ? '데이터를 가져오는 중입니다…'
              : stage === 'visualizing'
                ? '데이터를 시각화하는 중입니다…'
                : '생각 중...'}
          </div>
        )}
      </div>

      {/* 드로어 내 입력바 (AI 탭 활성 시 하단 플로팅 입력바는 숨겨진다) */}
      <div className="ai-inputbar">
        <input
          ref={inputRef}
          type="text"
          value={input}
          placeholder="이어서 물어보세요"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) sendFromInput();
          }}
          disabled={sending}
        />
        <button type="button" onClick={sendFromInput} disabled={sending || !input.trim()}>
          전송
        </button>
      </div>

      {/* 테넌트 격리 신뢰 문구 (2026-07-22: 입력바 아래로 위치 이동) */}
      <div className="ai-trust"><NavIcon id="lock" size={14} className="ui-icon" /> 이 대화는 우리 지점 데이터만 조회해요</div>

      {/* conversationId는 후속 질문 연결에 사용 (표시용 아님) */}
      <span hidden>{conversationId ?? ''}</span>
    </div>
  );
}

export default AiChat;
