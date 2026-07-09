import './Itempage.css';

// 백엔드 Pager 응답(startPage/endPage/currentPage/hasPrev/hasNext)을 받아
// 페이지 번호 버튼 블록 + 이전/다음 블록 이동 버튼을 그려주는 페이지네이션 컴포넌트
function Pagination({ pager, onPageChange }) {
  if (!pager || !pager.startPage || !pager.endPage || pager.endPage < 1) {
    return null;
  }

  const pageNumbers = [];
  for (let p = pager.startPage; p <= pager.endPage; p++) {
    pageNumbers.push(p);
  }

  return (
    <div className="item-pagination">
      <button
        type="button"
        className="item-page-btn"
        disabled={!pager.hasPrev}
        onClick={() => onPageChange(pager.startPage - 1)}
      >
        이전
      </button>

      {pageNumbers.map((p) => (
        <button
          key={p}
          type="button"
          className={`item-page-btn ${p === pager.currentPage ? 'active' : ''}`}
          onClick={() => onPageChange(p)}
        >
          {p}
        </button>
      ))}

      <button
        type="button"
        className="item-page-btn"
        disabled={!pager.hasNext}
        onClick={() => onPageChange(pager.endPage + 1)}
      >
        다음
      </button>
    </div>
  );
}

export default Pagination;
