import { useEffect, useRef } from 'react';

// 페이지 헤더(h2 제목 블록) 우측에 하위 컴포넌트의 주요 액션 버튼(새로고침·프로모션 발행 등)을
// 주입하는 훅. 회원 관리 화면처럼 페이지 헤더(B2bManagementPage)와 실제 액션 버튼(OwnerManagement 등
// 하위 탭 컴포넌트)이 서로 다른 컴포넌트에 있을 때, props 없이 window CustomEvent로 등록/해제한다
// (b2b-drawer-open 등 기존 전역 이벤트 패턴과 동일한 방식 - 전역 Header용 useHeaderAction과는
// 별개 채널이라 서로 간섭하지 않는다).
//
// 사용법: usePageHeaderAction(activeTab === 'schedule' ? { label: '새로고침', onClick: fetchAll } : null)
// 페이지 쪽에는 <PageHeaderActionSlot /> 을 헤더 안에 렌더링해 두면 현재 등록된 버튼을 표시한다.
// action.variant: 'secondary'(기본, 흰 배경+보더) | 'primary'(accent-strong 솔리드 - 핵심 CTA용)
let seq = 0;

export default function usePageHeaderAction(action) {
  const label = action ? action.label : null;
  const disabled = action ? Boolean(action.disabled) : false;
  const variant = action ? (action.variant || 'secondary') : 'secondary';
  const handlerRef = useRef(null);

  // ref 갱신은 렌더 중이 아니라 커밋 후 effect에서만 한다(렌더 중 ref.current 대입 금지 규칙 준수).
  useEffect(() => {
    handlerRef.current = action ? action.onClick : null;
  });

  useEffect(() => {
    if (!label) return undefined;

    const id = `page-header-action-${++seq}`;
    const stableHandler = (...args) => {
      if (handlerRef.current) handlerRef.current(...args);
    };

    window.dispatchEvent(new CustomEvent('b2b-page-header-action-set', {
      detail: { id, label, onClick: stableHandler, disabled, variant },
    }));

    return () => {
      window.dispatchEvent(new CustomEvent('b2b-page-header-action-clear', { detail: { id } }));
    };
  }, [label, disabled, variant]);
}
