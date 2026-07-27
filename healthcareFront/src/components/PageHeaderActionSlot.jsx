import { useEffect, useState } from 'react';

// usePageHeaderAction으로 등록된 액션 버튼을 렌더링하는 슬롯.
// 페이지 헤더(h2 제목 블록)를 렌더링하는 컴포넌트 쪽에 두면, 하위 탭 컴포넌트가 등록한
// 새로고침·프로모션 발행 등 버튼이 여기 나타난다. 버튼이 없으면 아무 것도 렌더링하지 않는다.
function PageHeaderActionSlot({ className = 'page-header-action' }) {
  const [action, setAction] = useState(null);

  useEffect(() => {
    const onSet = (event) => setAction(event.detail);
    const onClear = (event) => {
      setAction((previous) => (previous && previous.id === event.detail.id ? null : previous));
    };
    window.addEventListener('b2b-page-header-action-set', onSet);
    window.addEventListener('b2b-page-header-action-clear', onClear);
    return () => {
      window.removeEventListener('b2b-page-header-action-set', onSet);
      window.removeEventListener('b2b-page-header-action-clear', onClear);
    };
  }, []);

  if (!action) return null;

  // variant='primary'면 강조 CTA 클래스(className--primary)를 함께 붙인다 (기본은 보조 버튼 규격)
  const variantClass = action.variant === 'primary' ? ` ${className}--primary` : '';

  return (
    <button type="button" className={`${className}${variantClass}`} onClick={action.onClick} disabled={action.disabled}>
      {action.label}
    </button>
  );
}

export default PageHeaderActionSlot;
