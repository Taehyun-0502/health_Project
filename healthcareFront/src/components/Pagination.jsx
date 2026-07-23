// 백엔드 Pager 응답(startPage/endPage/currentPage/hasPrev/hasNext)을 받아
// 페이지 번호 버튼 블록 + 이전/다음 블록 이동 버튼을 그려주는 공용 서버 페이징 컴포넌트.
//
// 정산/물품이 각각 같은 로직을 복사해 쓰고 있었고 차이는 CSS 클래스 접두사뿐이었다.
// 표현만 다르고 동작이 같으므로 구현은 여기 하나만 두고, 도메인별 래퍼가 classPrefix로 스타일을 붙인다.
// CSS는 각 도메인 래퍼가 import한다(공용 컴포넌트가 특정 도메인 CSS에 의존하지 않도록).
//
// 클라이언트 배열을 잘라 쓰는 화면은 이 컴포넌트가 아니라 ClientPagination을 사용한다(입력 규격이 다름).
function Pagination({ pager, onPageChange, classPrefix }) {
  if (!pager || !pager.startPage || !pager.endPage || pager.endPage < 1) {
    return null;
  }

  const pageNumbers = [];
  for (let p = pager.startPage; p <= pager.endPage; p++) {
    pageNumbers.push(p);
  }

  return (
    <nav className={`${classPrefix}-pagination`} aria-label="페이지 이동">
      <button
        type="button"
        className={`${classPrefix}-page-btn`}
        disabled={!pager.hasPrev}
        onClick={() => onPageChange(pager.startPage - 1)}
      >
        이전
      </button>

      {pageNumbers.map((p) => {
        const isCurrent = p === pager.currentPage;
        return (
          <button
            key={p}
            type="button"
            className={`${classPrefix}-page-btn ${isCurrent ? 'active' : ''}`}
            // 현재 페이지는 class 외에 aria로도 알려준다(CSS를 걷어내도 상태가 남도록)
            aria-current={isCurrent ? 'page' : undefined}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        );
      })}

      <button
        type="button"
        className={`${classPrefix}-page-btn`}
        disabled={!pager.hasNext}
        onClick={() => onPageChange(pager.endPage + 1)}
      >
        다음
      </button>
    </nav>
  );
}

export default Pagination;
