import './settlepage.css';
import Pagination from '../components/Pagination';

// 정산 스타일(settle-*)을 입힌 공용 서버 페이징 래퍼.
// 동작은 components/Pagination 하나에만 있고 여기서는 CSS 클래스 접두사만 지정한다.
// (계약 리스트·임금 페이지도 이 경로를 import하고 있어 경로를 유지한다)
function SettlePagination({ pager, onPageChange }) {
  return <Pagination pager={pager} onPageChange={onPageChange} classPrefix="settle" />;
}

export default SettlePagination;
