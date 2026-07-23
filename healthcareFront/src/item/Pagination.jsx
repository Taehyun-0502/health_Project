import './Itempage.css';
import Pagination from '../components/Pagination';

// 물품 스타일(item-*)을 입힌 공용 서버 페이징 래퍼.
// 동작은 components/Pagination 하나에만 있고 여기서는 CSS 클래스 접두사만 지정한다.
function ItemPagination({ pager, onPageChange }) {
  return <Pagination pager={pager} onPageChange={onPageChange} classPrefix="item" />;
}

export default ItemPagination;
