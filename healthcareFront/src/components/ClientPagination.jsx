import './ClientPagination.css';

function ClientPagination({ currentPage, totalItems, pageSize, onPageChange, ariaLabel = '목록 페이지' }) {
  const totalPages = Math.ceil(totalItems / pageSize);

  if (totalPages <= 1) {
    return null;
  }

  const visiblePageCount = Math.min(5, totalPages);
  const maxStartPage = totalPages - visiblePageCount + 1;
  const startPage = Math.min(Math.max(currentPage - Math.floor(visiblePageCount / 2), 1), maxStartPage);
  const pageNumbers = Array.from({ length: visiblePageCount }, (_, index) => startPage + index);

  return (
    <nav className="client-pagination" aria-label={ariaLabel}>
      <button
        type="button"
        className="client-pagination__button"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="이전 페이지"
      >
        이전
      </button>

      {pageNumbers.map((page) => (
        <button
          key={page}
          type="button"
          // is-num: 숫자 버튼 표식 — 이전/다음 버튼과 색 규격이 달라 CSS에서 구분한다
          className={`client-pagination__button is-num${page === currentPage ? ' client-pagination__button--active' : ''}`}
          onClick={() => onPageChange(page)}
          aria-label={`${page}페이지`}
          aria-current={page === currentPage ? 'page' : undefined}
        >
          {page}
        </button>
      ))}

      <button
        type="button"
        className="client-pagination__button"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="다음 페이지"
      >
        다음
      </button>
    </nav>
  );
}

export default ClientPagination;
