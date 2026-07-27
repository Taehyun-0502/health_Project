import { useEffect, useState } from 'react';
import NavIcon from '../components/uiIcons.jsx';
import './AiPanel.css';

// AI 비서 플로팅 입력바 (Phase 1 - OWNER 정식 / ADMIN·TRAINER 프리뷰)
// 2026-07-21 목업 기획서 반영: 채팅 본문은 우측 통합 드로어의 'AI' 탭(AiChat)으로 이동하고
// 이 컴포넌트는 하단 중앙 알약형 입력바(480px)와 질문 전달 브리지만 담당한다.
//
// 입력바 노출 규칙(기획서 확정)
//  - 폭 480px 상시 노출
//  - AI 채팅 탭이 "활성"일 때만 숨김 (드로어 자체 입력창을 사용하므로)
//  - 드로어가 열려 있어도 AI 탭이 아니면 노출
//  - 드로어를 접으면 AI 탭이 보존된 채 입력바 다시 노출

function AiPanel() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  // Phase 1.5(프리뷰 게이트): OWNER 정식 + ADMIN·TRAINER 프리뷰 노출 (MEMBER·비로그인 미노출)
  // ADMIN·TRAINER의 질문은 서버 게이트가 차단해 고정 문구만 응답한다 (크레딧 소모 0)
  const aiEligible = !!user
    && ['owner', 'admin', 'trainer'].includes(String(user.role || '').toLowerCase());

  const [fabInput, setFabInput] = useState('');
  const [aiTabActive, setAiTabActive] = useState(false); // 드로어에서 AI 탭이 활성이며 펼쳐진 상태

  // 드로어 상태 구독 - AI 탭 활성 + 펼침일 때만 입력바를 숨긴다
  useEffect(() => {
    const onDrawerState = (e) => {
      const { activeKind, collapsed } = e.detail || {};
      setAiTabActive(activeKind === 'ai' && !collapsed);
    };
    window.addEventListener('b2b-drawer-state', onDrawerState);
    return () => window.removeEventListener('b2b-drawer-state', onDrawerState);
  }, []);

  // 드로어의 AI 탭을 열고(없으면 생성) 질문을 전달한다.
  // 탭 생성 직후에는 AiChat의 리스너 등록 전일 수 있어 매크로태스크로 한 틱 미룬다.
  const askAi = (text) => {
    window.dispatchEvent(new CustomEvent('b2b-drawer-open', {
      detail: { kind: 'ai', id: 'assistant', title: 'AI 비서' },
    }));
    const trimmed = String(text || '').trim();
    if (!trimmed) return;
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('ai-chat-send', { detail: trimmed }));
    }, 0);
  };

  // 대시보드 질문 카드 등 외부에서 질문 자동 전송 (문구는 발신 측 메타에 고정)
  useEffect(() => {
    if (!aiEligible) return undefined;
    const onAsk = (e) => askAi(e.detail);
    window.addEventListener('ai-ask', onAsk);
    return () => window.removeEventListener('ai-ask', onAsk);
  }, [aiEligible]);

  // 입력바 전송 - 빈 입력이면 AI 탭만 열어 기존 대화를 다시 보여준다
  const sendFromFab = () => {
    const text = fabInput.trim();
    setFabInput('');
    askAi(text);
  };

  // Phase 1.5: ADMIN·OWNER·TRAINER만 렌더, MEMBER·비로그인 미노출 (훅 호출 이후에 분기)
  if (!aiEligible || aiTabActive) return null;

  return (
    <div className="ai-fabbar">
      <input
        type="text"
        value={fabInput}
        placeholder="매출, 계약, 회원에 대해 물어보세요"
        onChange={(e) => setFabInput(e.target.value)}
        onFocus={() => askAi('')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) sendFromFab();
        }}
      />
      <button type="button" title="전송" onClick={sendFromFab}><NavIcon id="send" size={18} /></button>
    </div>
  );
}

export default AiPanel;
