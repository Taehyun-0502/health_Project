import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Pagination from '../settle/Pagination';
import './Contract.css';

// 트레이너 급여(Salary) 탭
// 백엔드에 트레이너 전용 급여 API가 없어, 기존 지출(settle) 패키지의
// GET /fitb/settle/expense(소속 gym_id 기준 지출 리스트)를 그대로 읽기 전용으로 호출한다.
// (백엔드 계약/DTO는 변경하지 않는다 — 응답은 지점 전체 지출이며 트레이너 개인 필터는 없음)
function SalaryPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem('accessToken');

  const [expenses, setExpenses] = useState([]);
  const [pager, setPager] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState('');
  const [needLogin, setNeedLogin] = useState(false);

  const currentYear = new Date().getFullYear();
  const filterMonths = Array.from({ length: 12 }, (_, i) => {
    const monthStr = (i + 1).toString().padStart(2, '0');
    return { value: `${currentYear}-${monthStr}`, label: `${currentYear}년 ${monthStr}월` };
  });

  // 지출(급여) 내역을 "페이지 + 조회월" 조건으로 페이징 조회
  const fetchExpenses = async (targetPage, month) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    setLoading(true);
    setErrorInfo('');
    try {
      const query = new URLSearchParams({ page: targetPage, pageSize: 10 });
      if (month && month !== 'ALL') query.set('month', month);
      const response = await fetch(`${backendUrl}/fitb/settle/expense?${query.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.status === 401) {
        setNeedLogin(true);
        setExpenses([]);
        setPager(null);
        setTotalCount(0);
        setTotalAmount(0);
        return;
      }
      if (!response.ok) {
        throw new Error('급여 내역 조회 실패');
      }

      const data = await response.json();
      setExpenses(data.items || []);
      setPager(data.pager || null);
      setTotalCount(data.totalCount || 0);
      setTotalAmount(data.totalAmount || 0);
    } catch (err) {
      console.warn('급여 내역 조회 실패:', err.message);
      setErrorInfo('급여 내역을 불러오지 못했습니다.');
      setExpenses([]);
      setPager(null);
      setTotalCount(0);
      setTotalAmount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses(1, monthFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthFilter, token]);

  const handlePageChange = (targetPage) => {
    fetchExpenses(targetPage, monthFilter);
  };

  const formatWon = (value) =>
    new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value ?? 0);

  if (needLogin) {
    return (
      <div className="contract-placeholder">
        <p className="contract-placeholder__title">로그인이 필요합니다</p>
        <p className="contract-placeholder__desc">
          급여 내역을 확인하려면 다시 로그인해 주세요.
        </p>
        <button type="button" className="contract-btn-primary" onClick={() => navigate('/login')}>
          로그인 화면으로 이동
        </button>
      </div>
    );
  }

  return (
    <div className="salary-page">
      <div className="salary-page__head">
        <h2 className="salary-page__title">급여 내역</h2>
        <p className="salary-page__desc">
          소속 체육관의 지출 내역이에요. 지출 등록·삭제는 사장님 정산 화면에서 처리해요.
        </p>
      </div>

      {errorInfo && <p className="contract-message">{errorInfo}</p>}

      <div className="salary-page__filter">
        <select
          className="salary-page__select"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
        >
          <option value="ALL">전체 월</option>
          {filterMonths.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <span className="salary-page__summary">
          총 <strong>{totalCount}</strong>건 · 합계 <strong>{formatWon(totalAmount)}</strong>
        </span>
      </div>

      <div className="contract-table-card">
        <table className="contract-table">
          <thead>
            <tr>
              <th>지출 ID</th>
              <th>지출 항목명</th>
              <th>일자</th>
              <th>금액</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan="4" className="contract-table__muted">불러오는 중...</td>
              </tr>
            )}
            {!loading && expenses.length === 0 && (
              <tr>
                <td colSpan="4" className="contract-table__muted">조건에 해당하는 급여 내역이 없어요.</td>
              </tr>
            )}
            {!loading && expenses.map((e) => (
              <tr key={e.expenseId}>
                <td>#{e.expenseId}</td>
                <td className="contract-table__name">{e.expenseName}</td>
                <td>{e.expenseDate}</td>
                <td>{formatWon(e.expensePrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination pager={pager} onPageChange={handlePageChange} />
    </div>
  );
}

export default SalaryPage;
