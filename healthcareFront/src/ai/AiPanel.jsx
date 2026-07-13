import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AiPanel.css';

// AI 비서 챗 패널 (Phase 1 MVP - OWNER 전용)
// /fitb 전역 상주: 우하단 FAB -> 우측 도킹 리사이저블 사이드 패널 (본문을 밀어내는 도킹 방식)
// 폭: 최소 360px ~ 화면의 50%, 조절 폭은 localStorage에 저장해 메뉴 이동·재접속에도 유지

const MIN_WIDTH = 360;
const WIDTH_KEY = 'aiPanelWidth';

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

function AiPanel() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const isOwner = !!user && String(user.role || '').toLowerCase() === 'owner';

  const [open, setOpen] = useState(false);
  const [width, setWidth] = useState(() => {
    const saved = Number(localStorage.getItem(WIDTH_KEY));
    return saved >= MIN_WIDTH ? saved : 400;
  });
  const [view, setView] = useState('chat'); // chat | sessions
  const [messages, setMessages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [currentTool, setCurrentTool] = useState(null);
  const [gymName, setGymName] = useState('');

  const scrollRef = useRef(null);
  const resizingRef = useRef(false);
  const asideRef = useRef(null);
  const [topOffset, setTopOffset] = useState(0);

  // 패널 상단 오프셋(헤더 높이) 측정 - 입력바가 화면 밖으로 잘리지 않도록 높이 보정
  useEffect(() => {
    if (open && asideRef.current) {
      const rect = asideRef.current.getBoundingClientRect();
      setTopOffset(Math.max(0, Math.round(rect.top + window.scrollY)));
    }
  }, [open]);

  // 헤더 지점명 표시용 - 공개 지점 목록에서 본인 gymId 매칭
  useEffect(() => {
    if (!isOwner || !user?.gymId) return;
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

  // 패널 좌측 경계 드래그로 폭 조절 (최소 360px, 최대 화면의 ~50%)
  const onResizeStart = useCallback((e) => {
    e.preventDefault();
    resizingRef.current = true;
    const onMove = (ev) => {
      if (!resizingRef.current) return;
      const max = Math.floor(window.innerWidth * 0.5);
      const next = Math.min(max, Math.max(MIN_WIDTH, window.innerWidth - ev.clientX));
      setWidth(next);
    };
    const onUp = () => {
      resizingRef.current = false;
      setWidth((w) => {
        localStorage.setItem(WIDTH_KEY, String(w));
        return w;
      });
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

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
          .map((m) => ({ role: m.role, content: m.content, links: [], tools: [] })),
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

  // 메시지 전송 - POST /ai/chat SSE 스트림 소비 (start/tool/answer/error)
  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setSending(true);
    setCurrentTool(null);

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ conversationId, message: text }),
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
      setSending(false);
      setCurrentTool(null);
    }
  };

  // Phase 1: OWNER 외 역할에는 렌더하지 않음 (훅 호출 이후에 분기)
  if (!isOwner) return null;

  if (!open) {
    return (
      <button type="button" className="ai-fab" onClick={() => setOpen(true)} title="AI 비서">
        🤖
      </button>
    );
  }

  return (
    <aside ref={asideRef} className="ai-panel" style={{ width }}>
      {/* 좌측 경계 드래그 핸들 */}
      <div className="ai-resizer" onMouseDown={onResizeStart} />

      <div className="ai-panel-inner" style={{ height: `calc(100vh - ${topOffset}px)` }}>
        {/* 헤더: 타이틀 + 지점명 + role 배지 + 폭 배지 + 히스토리/닫기 */}
        <div className="ai-header">
          <span className="ai-header-title">🤖 AI 비서</span>
          {gymName && <span className="ai-header-gym">{gymName}</span>}
          <span className="ai-badge ai-badge-role">OWNER</span>
          <div className="ai-header-actions">
            {/* 대화 추가하기(새 대화)는 대화 목록을 펼쳤을 때만 노출 - 대화 목록 버튼 왼쪽 배치 */}
            {view === 'sessions' && (
              <button type="button" title="대화 추가하기" onClick={newChat}>✚</button>
            )}
            <button type="button" title="대화 목록" onClick={loadSessions}>🕘</button>
            <button type="button" title="닫기" onClick={() => setOpen(false)}>✕</button>
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
                  {m.links && m.links.length > 0 && (
                    <div className="ai-links">
                      {m.links.map((link) => (
                        <button
                          key={link.to}
                          type="button"
                          className="ai-link-btn"
                          onClick={() => navigate(link.to)}
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

        {/* 입력바 */}
        <div className="ai-inputbar">
          <input
            type="text"
            value={input}
            placeholder="매출, 계약, 회원에 대해 물어보세요"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) send();
            }}
            disabled={sending}
          />
          <button type="button" onClick={send} disabled={sending || !input.trim()}>
            전송
          </button>
        </div>
      </div>
    </aside>
  );
}

export default AiPanel;
