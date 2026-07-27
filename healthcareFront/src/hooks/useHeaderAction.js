import { useEffect, useRef } from 'react';

// B2B 상단 유틸리티 바(알림 종 왼쪽)에 페이지별 액션 버튼(CSV 내보내기 등)을 주입하는 훅.
// 기존 드로어(b2b-drawer-open)·AI 패널(ai-ask) 연동과 동일하게 window CustomEvent로 통신한다
// (Header.jsx는 전역 컴포넌트라 페이지가 직접 props를 넘길 수 없음 - 이벤트로 등록/해제).
//
// 사용법: useHeaderAction(showCsv ? { label: 'CSV 내보내기', onClick: handleExportCsv } : null)
// - action이 falsy면 아무 것도 등록하지 않는다(페이지에 해당 액션이 없으면 버튼 미노출).
// - 언마운트 또는 label이 바뀌면(등록 해제 조건) 자동으로 해제해 이전 페이지의 버튼이 남지 않는다.
// - onClick은 ref로 감싸 최신 함수를 항상 참조하므로, 매 렌더 새로 생성되는 인라인 핸들러를 넘겨도
//   재등록 이벤트가 불필요하게 반복 발생하지 않는다.
let seq = 0;

export default function useHeaderAction(action) {
  const label = action ? action.label : null;
  const disabled = action ? Boolean(action.disabled) : false;
  const handlerRef = useRef(null);

  // ref 갱신은 렌더 중이 아니라 커밋 후 effect에서만 한다(렌더 중 ref.current 대입 금지 규칙 준수).
  // deps 없이 매 렌더 후 실행해 항상 최신 onClick을 참조하게 한다.
  useEffect(() => {
    handlerRef.current = action ? action.onClick : null;
  });

  useEffect(() => {
    if (!label) return undefined;

    const id = `header-action-${++seq}`;
    const stableHandler = (...args) => {
      if (handlerRef.current) handlerRef.current(...args);
    };

    window.dispatchEvent(new CustomEvent('b2b-header-action-set', {
      detail: { id, label, onClick: stableHandler, disabled },
    }));

    return () => {
      window.dispatchEvent(new CustomEvent('b2b-header-action-clear', { detail: { id } }));
    };
  }, [label, disabled]);
}
