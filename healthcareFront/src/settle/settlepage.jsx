import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import NavIcon from '../components/uiIcons.jsx';
import './settlepage.css';
import Pagination from './Pagination';
import useHeaderAction from '../hooks/useHeaderAction.js';

const UNPAID_CONTRACTS_PER_PAGE = 5;
const UNPAID_CONTRACT_PAGE_BLOCK_SIZE = 5;
const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const formatLocalMonth = (date) => formatLocalDate(date).slice(0, 7);

function Settlepage() {
  const navigate = useNavigate();

  // 로그인 유저 정보 및 토큰 조회
  const loginUser = JSON.parse(localStorage.getItem('user') || 'null');
  const token = localStorage.getItem('accessToken');

  // 현재 활성화된 역할 확인
  const activeRole = (loginUser?.role || '').toUpperCase();

  // 데이터 상태 관리
  const [commissions, setCommissions] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [pays, setPays] = useState([]);
  const [unpaidContracts, setUnpaidContracts] = useState([]);
  const [unpaidExpenses, setUnpaidExpenses] = useState([]);
  const [unpaidExpenseTotalCount, setUnpaidExpenseTotalCount] = useState(0);
  const [unpaidCommissions, setUnpaidCommissions] = useState([]);
  const [selectedExpenseContractId, setSelectedExpenseContractId] = useState('');
  const [selectedSettlementId, setSelectedSettlementId] = useState('');

  // 페이징 상태 관리 (결재/매출 내역, 지출 내역, 지출 정산 대기 계약서)
  const [payPager, setPayPager] = useState(null);
  const [payTotalCount, setPayTotalCount] = useState(0);
  const [payTotalAmount, setPayTotalAmount] = useState(0);

  const [expensePage, setExpensePage] = useState(1);
  const [expensePager, setExpensePager] = useState(null);
  const [expenseTotalCount, setExpenseTotalCount] = useState(0);
  const [expenseTotalAmount, setExpenseTotalAmount] = useState(0);

  const [contractPage, setContractPage] = useState(1);
  const [contractPager, setContractPager] = useState(null);

  const [commissionPager, setCommissionPager] = useState(null);
  const [commissionTotalCount, setCommissionTotalCount] = useState(0);
  const [commissionStats, setCommissionStats] = useState({ totalPaidAmount: 0, unpaidCount: 0, avgCommissionRate: 0 });
  const [ownerSummary, setOwnerSummary] = useState(null);

  // UI 상태 관리
  const [loading, setLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState('');
  
  // 사장님 뷰 서브 탭
  const [ownerTab, setOwnerTab] = useState('sales'); // 'sales', 'expenses'
  const [expenseDrawerOpen, setExpenseDrawerOpen] = useState(false);
  const expenseDrawerTriggerRef = useRef(null);
  const expenseDrawerRef = useRef(null);

  // 필터 상태
  const [adminStatusFilter, setAdminStatusFilter] = useState('ALL');
  const [adminMonthFilter, setAdminMonthFilter] = useState('ALL');
  const [ownerMonthFilter, setOwnerMonthFilter] = useState('ALL');
  const [ownerSearchQuery, setOwnerSearchQuery] = useState('');
  const [unpaidContractType, setUnpaidContractType] = useState('ALL');
  const [unpaidContractPage, setUnpaidContractPage] = useState(1);

  // 정렬 옵션 상태 ('' = 기본(최신순)). 매출/지출 탭은 동일한 옵션 체계를 공유
  const [ownerSortOption, setOwnerSortOption] = useState('');
  const [adminSortOption, setAdminSortOption] = useState('');

  // 커미션 수동 집계 생성 대상 월 (YYYY-MM, 기본값은 완료된 전월)
  const [generateMonth, setGenerateMonth] = useState(() => {
    const previousMonth = new Date();
    previousMonth.setDate(1);
    previousMonth.setMonth(previousMonth.getMonth() - 1);
    return formatLocalMonth(previousMonth);
  });

  // 1월부터 12월까지의 연월 리스트 생성 (2026년 기준)
  const filterMonths = Array.from({ length: 12 }, (_, i) => {
    const monthStr = (i + 1).toString().padStart(2, '0');
    return {
      value: `2026-${monthStr}`,
      label: `2026년 ${monthStr}월`
    };
  });

  // 지출 등록 폼 상태
  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpensePrice, setNewExpensePrice] = useState('');
  const [newExpenseDate, setNewExpenseDate] = useState('');
  const [newExpenseRate, setNewExpenseRate] = useState('0');
  const [expenseSubmitting, setExpenseSubmitting] = useState(false);

  // 미결제 계약은 유형 필터를 먼저 적용한 뒤 5건씩 페이지로 나눠 표시
  const filteredUnpaidContracts = unpaidContracts.filter((contract) => (
    unpaidContractType === 'ALL' || String(contract.contract) === unpaidContractType
  ));
  const unpaidContractTotalPages = Math.ceil(filteredUnpaidContracts.length / UNPAID_CONTRACTS_PER_PAGE);
  const currentUnpaidContractPage = unpaidContractTotalPages > 0
    ? Math.min(unpaidContractPage, unpaidContractTotalPages)
    : 1;
  const unpaidContractStartPage = Math.floor(
    (currentUnpaidContractPage - 1) / UNPAID_CONTRACT_PAGE_BLOCK_SIZE
  ) * UNPAID_CONTRACT_PAGE_BLOCK_SIZE + 1;
  const unpaidContractEndPage = Math.min(
    unpaidContractStartPage + UNPAID_CONTRACT_PAGE_BLOCK_SIZE - 1,
    unpaidContractTotalPages
  );
  const unpaidContractPager = unpaidContractTotalPages > 0 ? {
    currentPage: currentUnpaidContractPage,
    startPage: unpaidContractStartPage,
    endPage: unpaidContractEndPage,
    hasPrev: unpaidContractStartPage > 1,
    hasNext: unpaidContractEndPage < unpaidContractTotalPages,
  } : null;
  const pagedUnpaidContracts = filteredUnpaidContracts.slice(
    (currentUnpaidContractPage - 1) * UNPAID_CONTRACTS_PER_PAGE,
    currentUnpaidContractPage * UNPAID_CONTRACTS_PER_PAGE
  );

  const handleUnpaidContractTypeChange = (e) => {
    setUnpaidContractType(e.target.value);
    setUnpaidContractPage(1);
  };

  // 관리자 권한용 커미션 내역을 "페이지 + 지급상태 + 조회월 + 정렬" 조건으로 페이징 조회 (실패 시 목업 데이터로 폴백)
  const fetchCommissions = async (targetPage, status, month, sort) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const query = new URLSearchParams({ page: targetPage, pageSize: 10 });
      if (status && status !== 'ALL') query.set('status', status);
      if (month && month !== 'ALL') query.set('month', month);
      if (sort) query.set('sort', sort);
      const response = await fetch(`${backendUrl}/fitb/settle/commission?${query.toString()}`, { headers });
      if (response.ok) {
        const data = await response.json();
        setCommissions(data.items || []);
        setCommissionPager(data.pager || null);
        setCommissionTotalCount(data.totalCount || 0);
      } else {
        throw new Error('커미션 조회 실패');
      }
    } catch (err) {
      console.warn('관리자 커미션 API 조회 실패:', err.message);
      setErrorInfo('커미션 내역을 불러오지 못했습니다.');
      setCommissions([]);
      setCommissionPager(null);
      setCommissionTotalCount(0);
    }
  };

  // 관리자 권한용 커미션 대시보드 요약 통계 조회 (필터/페이지와 무관한 전체 집계)
  const fetchCommissionStats = async () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const response = await fetch(`${backendUrl}/fitb/settle/commission/stats`, { headers });
      if (response.ok) {
        setCommissionStats(await response.json());
      } else {
        throw new Error('커미션 통계 조회 실패');
      }
    } catch (err) {
      console.warn('관리자 커미션 통계 API 조회 실패:', err.message);
      setErrorInfo('커미션 요약 통계를 불러오지 못했습니다.');
      setCommissionStats({ totalPaidAmount: 0, unpaidCount: 0, avgCommissionRate: 0 });
    }
  };

  // OWNER 본인 사업장의 월별 정산 요약 조회
  const fetchOwnerSummary = async (month) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const query = month ? `?month=${month}` : '';
      const response = await fetch(`${backendUrl}/fitb/settle/owner-summary${query}`, { headers });
      if (!response.ok) throw new Error('요약 조회 실패');
      setOwnerSummary(await response.json());
    } catch (err) {
      console.warn('사장님 정산 요약 API 조회 실패:', err.message);
      setOwnerSummary(null);
    }
  };

  const currentMonthKey = formatLocalMonth(new Date());
  const summaryMonth = ownerMonthFilter !== 'ALL' ? ownerMonthFilter : null;

  useEffect(() => {
    if (activeRole === 'OWNER') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchOwnerSummary(summaryMonth);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRole, summaryMonth]);

  useEffect(() => {
    if (!expenseDrawerOpen) return undefined;

    const drawer = expenseDrawerRef.current;
    const drawerTrigger = expenseDrawerTriggerRef.current;
    const focusableSelector = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');
    const getFocusableElements = () => (
      drawer ? Array.from(drawer.querySelectorAll(focusableSelector)) : []
    );
    const focusFrame = window.requestAnimationFrame(() => {
      getFocusableElements()[0]?.focus();
    });

    const handleDrawerKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setExpenseDrawerOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };
    window.addEventListener('keydown', handleDrawerKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener('keydown', handleDrawerKeyDown);
      drawerTrigger?.focus();
    };
  }, [expenseDrawerOpen]);

  const formatManwon = (won) => `${Math.round((won || 0) / 10000).toLocaleString()}만`;

  const renderSummaryRail = () => {
    const summary = ownerSummary || {};
    const salesTotal = summary.salesTotal || 0;
    const expenseTotal = summary.expenseTotal || 0;
    const railTitle = !summaryMonth
      ? '전체 요약'
      : (summaryMonth === currentMonthKey ? '이번 달 요약' : `${summaryMonth} 요약`);

    return (
      <aside className="settle-summary-rail">
        <div className="settle-summary-rail__title">{railTitle}</div>
        <div className="summary-hero">
          <div className="summary-hero__label">순이익</div>
          <div className="summary-hero__value">{formatWon(salesTotal - expenseTotal)}</div>
          <div className="summary-hero__sub">
            <span><span className="summary-hero__sub-key">매출</span> <b className="summary-hero__sub-sales">{formatManwon(salesTotal)}</b></span>
            <span><span className="summary-hero__sub-key">지출</span> <b>{formatManwon(expenseTotal)}</b></span>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card__head">
            <span className="summary-card__label">커미션 지급</span>
            <span className={`summary-badge ${(summary.commissionPending || 0) > 0 ? 'summary-badge--pending' : 'summary-badge--done'}`}>
              {(summary.commissionPending || 0) > 0 ? `${summary.commissionPending}건 대기` : '완료'}
            </span>
          </div>
          <div className="summary-card__value">{formatWon(summary.commissionPaid || 0)}</div>
        </div>
        <div className="summary-card summary-card--filtered">
          <div className="summary-card__head">
            <span className="summary-card__label">현재 필터 매출</span>
            <span className="summary-badge summary-badge--done">{payTotalCount}건</span>
          </div>
          <div className="summary-card__value">{formatWon(payTotalAmount)}</div>
        </div>
      </aside>
    );
  };

  // 커미션 내역 페이지네이션 클릭 핸들러
  const handleCommissionPageChange = (targetPage) => {
    fetchCommissions(targetPage, adminStatusFilter, adminMonthFilter, adminSortOption);
  };

  // 사장님 권한용 매출(결제) 내역을 "페이지 + 검색어 + 조회월 + 정렬" 조건으로 페이징 조회 (실패 시 목업 데이터로 폴백)
  const fetchPays = async (targetPage, keyword, month, sort) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const query = new URLSearchParams({ page: targetPage, pageSize: 10, keyword: keyword || '' });
      if (month && month !== 'ALL') query.set('month', month);
      if (sort) query.set('sort', sort);
      const response = await fetch(`${backendUrl}/fitb/payment/paylist?${query.toString()}`, { headers });
      if (response.ok) {
        const data = await response.json();
        setPays(data.items || []);
        setPayPager(data.pager || null);
        setPayTotalCount(data.totalCount || 0);
        setPayTotalAmount(data.totalAmount || 0);
      } else {
        throw new Error('매출 내역 조회 실패');
      }
    } catch (err) {
      console.warn('사장님 매출 API 조회 실패:', err.message);
      setErrorInfo('매출 내역을 불러오지 못했습니다.');
      setPays([]);
      setPayPager(null);
      setPayTotalCount(0);
      setPayTotalAmount(0);
    }
  };

  // 사장님 권한용 지출 내역을 "페이지 + 검색어 + 조회월 + 정렬" 조건으로 페이징 조회
  const fetchExpenses = async (targetPage, keyword, month, sort) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const query = new URLSearchParams({ page: targetPage, pageSize: 10, keyword: keyword || '' });
      if (month && month !== 'ALL') query.set('month', month);
      if (sort) query.set('sort', sort);
      const response = await fetch(`${backendUrl}/fitb/settle/expense?${query.toString()}`, { headers });
      if (response.ok) {
        const data = await response.json();
        setExpenses(data.items || []);
        setExpensePager(data.pager || null);
        setExpenseTotalCount(data.totalCount || 0);
        setExpenseTotalAmount(data.totalAmount || 0);
      } else {
        throw new Error('지출 내역 조회 실패');
      }
    } catch (err) {
      console.warn('사장님 지출 API 조회 실패:', err.message);
      setErrorInfo('지출 내역을 불러오지 못했습니다.');
      setExpenses([]);
      setExpensePager(null);
      setExpenseTotalCount(0);
      setExpenseTotalAmount(0);
    }
  };

  // 사장님 권한용 미결제 계약서 목록 조회 (매출 등록 폼 드롭다운용, 페이징 없음)
  const fetchUnpaidContracts = async () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const response = await fetch(`${backendUrl}/fitb/payment/unpaid-contracts`, { headers });
      if (response.ok) {
        setUnpaidContracts(await response.json());
      } else {
        throw new Error('미결제 계약 목록 조회 실패');
      }
    } catch (err) {
      console.warn('미결제 계약 API 조회 실패:', err.message);
      setErrorInfo('미결제 계약서 목록을 불러오지 못했습니다.');
      setUnpaidContracts([]);
    }
  };

  // 사장님 권한용 미결제 지출 계약서(임금/제휴 수수료) 목록을 페이지 조건으로 페이징 조회
  const fetchUnpaidExpenses = async (targetPage) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const query = new URLSearchParams({ page: targetPage, pageSize: 5 });
      const response = await fetch(`${backendUrl}/fitb/settle/unpaid-expenses?${query.toString()}`, { headers });
      if (response.ok) {
        const data = await response.json();
        setUnpaidExpenses(data.items || []);
        setUnpaidExpenseTotalCount(data.totalCount || 0);
        setContractPager(data.pager || null);
      } else {
        throw new Error('지출 계약 목록 조회 실패');
      }
    } catch (err) {
      console.warn('지출 계약 API 조회 실패:', err.message);
      setErrorInfo('지출 정산 대기 계약서 목록을 불러오지 못했습니다.');
      setUnpaidExpenses([]);
      setUnpaidExpenseTotalCount(0);
      setContractPager(null);
    }
  };

  const fetchUnpaidCommissions = async () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const response = await fetch(`${backendUrl}/fitb/settle/owner-commissions/unpaid`, { headers });
      if (!response.ok) throw new Error(await response.text() || '미지급 커미션 조회 실패');
      setUnpaidCommissions(await response.json());
    } catch (err) {
      console.warn('미지급 커미션 API 조회 실패:', err.message);
      setErrorInfo('미지급 커미션 목록을 불러오지 못했습니다.');
      setUnpaidCommissions([]);
    }
  };

  // 결재(매출) 내역 페이지네이션 클릭 핸들러
  const handlePayPageChange = (targetPage) => {
    fetchPays(targetPage, ownerSearchQuery, ownerMonthFilter, ownerSortOption);
  };

  // 지출 내역 페이지네이션 클릭 핸들러
  const handleExpensePageChange = (targetPage) => {
    setExpensePage(targetPage);
    fetchExpenses(targetPage, ownerSearchQuery, ownerMonthFilter, ownerSortOption);
  };

  // 정렬 옵션 변경 시 1페이지로 이동해서 즉시 재조회 (state 갱신은 비동기라 새 값을 직접 넘겨줌)
  const handleOwnerSortChange = (e) => {
    const newSort = e.target.value;
    setOwnerSortOption(newSort);
    if (ownerTab === 'sales') {
      fetchPays(1, ownerSearchQuery, ownerMonthFilter, newSort);
    } else {
      setExpensePage(1);
      fetchExpenses(1, ownerSearchQuery, ownerMonthFilter, newSort);
    }
  };

  // 커미션 정렬 옵션 변경 시 1페이지로 이동해서 즉시 재조회
  const handleAdminSortChange = (e) => {
    const newSort = e.target.value;
    setAdminSortOption(newSort);
    fetchCommissions(1, adminStatusFilter, adminMonthFilter, newSort);
  };

  // 지출 정산 대기 계약서 페이지네이션 클릭 핸들러
  const handleContractPageChange = (targetPage) => {
    setContractPage(targetPage);
    fetchUnpaidExpenses(targetPage);
  };

  // 백엔드 연동 데이터 최초 조회
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      setErrorInfo('');

      if (activeRole === 'ADMIN') {
        await Promise.all([
          fetchCommissions(1, 'ALL', 'ALL', ''),
          fetchCommissionStats(),
        ]);
      } else if (activeRole === 'OWNER') {
        await Promise.all([
          fetchPays(1, '', 'ALL', ''),
          fetchExpenses(1, '', 'ALL', ''),
          fetchUnpaidContracts(),
          fetchUnpaidExpenses(1),
          fetchUnpaidCommissions(),
        ]);
      }

      setLoading(false);
    };

    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // 검색어/조회월/탭이 바뀔 때마다 300ms 디바운스 후 현재 활성 탭의 1페이지부터 재조회
  useEffect(() => {
    if (activeRole !== 'OWNER') return undefined;
    const timer = setTimeout(() => {
      if (ownerTab === 'sales') {
        fetchPays(1, ownerSearchQuery, ownerMonthFilter, ownerSortOption);
      } else if (ownerTab === 'expenses') {
        setExpensePage(1);
        fetchExpenses(1, ownerSearchQuery, ownerMonthFilter, ownerSortOption);
      }
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerSearchQuery, ownerMonthFilter, ownerTab]);

  // 커미션 지급상태/조회월 필터가 바뀔 때마다 300ms 디바운스 후 1페이지부터 재조회
  useEffect(() => {
    if (activeRole !== 'ADMIN') return undefined;
    const timer = setTimeout(() => {
      fetchCommissions(1, adminStatusFilter, adminMonthFilter, adminSortOption);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminStatusFilter, adminMonthFilter]);

  // 커미션 수동 집계 생성 핸들러 (ADMIN 기능) - 이미 생성된 가맹점/월 조합은 서버에서 자동으로 건너뜀 (중복 생성 안전)
  const handleGenerateCommissions = async () => {
    if (!generateMonth) {
      alert('집계할 정산 대상 월을 선택해 주세요.');
      return;
    }
    if (!window.confirm(`${generateMonth} 월 정산 커미션을 수동으로 집계하시겠습니까?\n이미 집계된 가맹점은 자동으로 건너뜁니다.`)) return;

    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    try {
      const response = await fetch(`${backendUrl}/fitb/settle/commission/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ settleMonth: `${generateMonth}-01` })
      });
      const message = await response.text();
      if (!response.ok) {
        throw new Error(message || '정산 생성 실패');
      }
      alert(message);
    } catch (err) {
      console.warn('커미션 수동 집계 생성 실패:', err.message);
      alert('정산 생성에 실패했습니다.');
      return;
    }

    // 새로 생성된 커미션을 확인할 수 있도록 목록과 요약 통계를 재조회
    fetchCommissions(1, adminStatusFilter, adminMonthFilter, adminSortOption);
    fetchCommissionStats();
  };

  // 지출 등록 핸들러 (OWNER 기능)
  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (expenseSubmitting) return;
    if (!newExpenseName || !newExpensePrice || !newExpenseDate) {
      alert('모든 지출 정보를 올바르게 입력해 주세요.');
      return;
    }

    const newExpenseObj = {
      dataId: selectedExpenseContractId ? parseInt(selectedExpenseContractId, 10) : null,
      settlementId: selectedSettlementId ? parseInt(selectedSettlementId, 10) : null,
      expenseName: newExpenseName,
      expenseDate: newExpenseDate,
      expensePrice: parseInt(newExpensePrice, 10),
      expenseRate: parseFloat(newExpenseRate) || 0.0,
    };

    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
    setExpenseSubmitting(true);
    try {
      const response = await fetch(`${backendUrl}/fitb/settle/expense`, {
        method: 'POST',
        headers,
        body: JSON.stringify(newExpenseObj)
      });
      if (!response.ok) throw new Error(await response.text() || '서버 등록 실패');
    } catch (err) {
      console.warn('백엔드 지출 저장 실패:', err.message);
      alert(err.message || '지출 등록에 실패했습니다.');
      return;
    } finally {
      setExpenseSubmitting(false);
    }

    setNewExpenseName('');
    setNewExpensePrice('');
    setNewExpenseDate('');
    setNewExpenseRate('0');
    setSelectedExpenseContractId('');
    setSelectedSettlementId('');
    setExpenseDrawerOpen(false);
    setOwnerSearchQuery('');
    setOwnerMonthFilter('ALL');
    setOwnerSortOption('');
    setExpensePage(1);
    setContractPage(1);
    await Promise.all([
      fetchExpenses(1, '', 'ALL', ''),
      fetchUnpaidExpenses(1),
      fetchUnpaidCommissions(),
      fetchOwnerSummary(null),
    ]);
    alert('지출이 확정되어 지출 내역에 반영되었습니다.');
  };

  // 직원(트레이너) 인센티브 추가금 계산 헬퍼 함수
  const getIncentiveAmount = (c) => {
    if (!c || c.contract !== 2 || !c.contractRate) return 0;
    let rate = parseFloat(c.contractRate);
    if (rate >= 1) {
      rate = rate / 100; // 데이터베이스에 10.0 또는 15.0 형식으로 저장된 경우 대응
    }
    return Math.floor(c.amount * rate);
  };

  const renderExpenseSummaryRail = () => {
    const commissionPendingTotal = unpaidCommissions.reduce(
      (total, commission) => total + Number(commission.commission || 0),
      0,
    );
    const railTitle = !summaryMonth ? '전체 지출 요약' : `${summaryMonth} 지출 요약`;

    return (
      <aside className="settle-summary-rail">
        <div className="settle-summary-rail__title">{railTitle}</div>
        <div className="summary-hero summary-hero--expense">
          <div className="summary-hero__label">현재 필터 지출</div>
          <div className="summary-hero__value">{formatWon(expenseTotalAmount)}</div>
          <div className="summary-hero__sub summary-hero__sub--single">
            <span><span className="summary-hero__sub-key">등록 건수</span> <b>{expenseTotalCount}건</b></span>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-card__head">
            <span className="summary-card__label">커미션 결제 대기</span>
            <span className={`summary-badge ${unpaidCommissions.length > 0 ? 'summary-badge--pending' : 'summary-badge--done'}`}>
              {unpaidCommissions.length > 0 ? `전체 ${unpaidCommissions.length}건` : '전체 완료'}
            </span>
          </div>
          <div className="summary-card__value">{formatWon(commissionPendingTotal)}</div>
        </div>
      </aside>
    );
  };

  // 사장님용 지출 대기 계약서 클릭 핸들러
  const handleSelectExpenseContract = (contract) => {
    setSelectedSettlementId('');
    setSelectedExpenseContractId(contract.dataId.toString());
    const labelName = '임금';
    const otherParty = `${contract.receiverName} 트레이너`;
    const name = `[계약 #${contract.dataId}] ${labelName} - ${otherParty}`;
    setNewExpenseName(name);

    // 금액 설정: 임금의 경우 기본급 + 인센티브 합산액으로 자동 계산
    const incentive = getIncentiveAmount(contract);
    const totalPrice = contract.amount + incentive;
    setNewExpensePrice(totalPrice.toString());

    setNewExpenseDate(formatLocalDate(new Date()));
    
    // contractRate 값 포맷 정리 (예: 10 또는 0.1 -> 0.10, 0 -> 0)
    let rateStr = '0';
    if (contract.contractRate) {
      let rateNum = parseFloat(contract.contractRate);
      if (rateNum >= 1) {
        rateNum = rateNum / 100;
      }
      if (rateNum > 0) {
        rateStr = rateNum.toFixed(2); // 0.1 -> "0.10"
      }
    }
    setNewExpenseRate(rateStr);
  };

  const handleSelectCommission = (commission) => {
    setSelectedExpenseContractId('');
    setSelectedSettlementId(commission.settlementId.toString());
    setNewExpenseName(`[${commission.settleMonth}] 플랫폼 커미션`);
    setNewExpensePrice(String(commission.commission));
    setNewExpenseDate(formatLocalDate(new Date()));
    setNewExpenseRate(String(commission.commissionRate));
  };

  // 지출 삭제 핸들러 (OWNER 기능)
  const handleDeleteExpense = async (expense) => {
    const isCommissionExpense = Boolean(expense.settlementId);
    const confirmMessage = isCommissionExpense
      ? '해당 커미션 지출을 삭제하시겠습니까? 삭제하면 커미션이 미지급 상태로 돌아가 다시 확정할 수 있습니다.'
      : '해당 지출 내역을 삭제하시겠습니까?';
    if (!window.confirm(confirmMessage)) return;

    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const response = await fetch(`${backendUrl}/fitb/settle/expense/${expense.expenseId}`, {
        method: 'DELETE',
        headers,
      });
      if (!response.ok) {
        const message = await response.text();
        alert(message || '지출 삭제에 실패했습니다.');
        return;
      }
    } catch (err) {
      console.warn('백엔드 지출 삭제 실패:', err.message);
      alert('지출 삭제에 실패했습니다.');
      return;
    }

    await Promise.all([
      fetchExpenses(expensePage, ownerSearchQuery, ownerMonthFilter, ownerSortOption),
      fetchUnpaidExpenses(contractPage),
      fetchUnpaidCommissions(),
      fetchOwnerSummary(summaryMonth),
    ]);
  };

  // 매출 삭제 핸들러 (OWNER 기능) - 삭제 시 해당 월 커미션이 미지급 상태면 서버에서 자동 재계산됨
  const handleDeletePay = async (payId) => {
    if (!window.confirm('정말로 이 매출 내역을 삭제하시겠습니까? 이미 정산(커미션)에 반영된 경우 미지급 상태라면 금액이 자동으로 재계산됩니다.')) return;

    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const response = await fetch(`${backendUrl}/fitb/payment/pay/${payId}`, {
        method: 'DELETE',
        headers,
      });
      if (response.ok) {
        const data = await response.json();
        if (data.alreadyPaidWarning) {
          alert('매출이 삭제되었습니다. 다만 이미 지급 완료된 정산 금액이라 자동으로 반영되지 않았습니다 — 관리자 확인이 필요합니다.');
        }
      } else {
        throw new Error('매출 삭제 실패');
      }
    } catch (err) {
      console.warn('백엔드 매출 삭제 실패:', err.message);
      alert('매출 삭제에 실패했습니다.');
      return;
    }

    // 삭제 결과가 목록·미결제 계약·요약에 즉시 반영되도록 관련 데이터를 함께 갱신
    await Promise.all([
      fetchPays(payPager?.currentPage || 1, ownerSearchQuery, ownerMonthFilter, ownerSortOption),
      fetchUnpaidContracts(),
      fetchOwnerSummary(summaryMonth),
    ]);
  };

  // 금액 포맷 함수
  const formatWon = (value) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value);
  };

  // 날짜 연월(YYYY-MM) 파싱 함수
  const getYearMonth = (dateStr) => {
    if (!dateStr) return '';
    return dateStr.substring(0, 7);
  };

  // CSV 필드값에 쉼표/줄바꿈/큰따옴표가 섞여 있어도 깨지지 않도록 이스케이프
  const escapeCsvField = (value) => {
    const str = String(value ?? '');
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // CSV 파일 다운로드 공통 헬퍼: UTF-8 BOM을 붙여 엑셀에서 한글이 깨지지 않도록 처리
  const downloadCsv = (filename, header, rows) => {
    const csvContent = [header, ...rows].map((row) => row.map(escapeCsvField).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 매출 내역 CSV 내보내기: 현재 검색어/조회월 조건을 반영한 전체 목록을 서버에서 받아와 다운로드 (페이징 무시)
  const handleExportPaysCsv = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const query = new URLSearchParams({ keyword: ownerSearchQuery || '' });
      if (ownerMonthFilter !== 'ALL') query.set('month', ownerMonthFilter);
      const response = await fetch(`${backendUrl}/fitb/payment/paylist/export?${query.toString()}`, { headers });
      if (!response.ok) {
        alert('내보내기에 실패했습니다.');
        return;
      }
      const allPays = await response.json();
      if (allPays.length === 0) {
        alert('내보낼 매출 내역이 없습니다.');
        return;
      }
      const header = ['결제ID', '회원연락처', '결제항목', '결제금액', '사용쿠폰', '할인금액', '할부', '결제일'];
      const rows = allPays.map((p) => [
        p.payId ?? '',
        p.username ?? '',
        p.payName,
        p.payPrice,
        p.couponId ? p.couponName : '미사용',
        p.couponId ? p.discountAmount : 0,
        p.installment === 0 ? '일시불' : `${p.installment}개월`,
        p.payDate,
      ]);
      downloadCsv(`매출내역_${new Date().toISOString().split('T')[0]}.csv`, header, rows);
    } catch (error) {
      console.error('Failed to export pay CSV:', error);
      alert('내보내기 중 오류가 발생했습니다.');
    }
  };

  // 지출 내역 CSV 내보내기: 현재 검색어/조회월 조건을 반영한 전체 목록을 서버에서 받아와 다운로드 (페이징 무시)
  const handleExportExpensesCsv = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const query = new URLSearchParams({ keyword: ownerSearchQuery || '' });
      if (ownerMonthFilter !== 'ALL') query.set('month', ownerMonthFilter);
      const response = await fetch(`${backendUrl}/fitb/settle/expense/export?${query.toString()}`, { headers });
      if (!response.ok) {
        alert('내보내기에 실패했습니다.');
        return;
      }
      const allExpenses = await response.json();
      if (allExpenses.length === 0) {
        alert('내보낼 지출 내역이 없습니다.');
        return;
      }
      const header = ['지출ID', '지출항목명', '지출금액', '결제일', '수수료/인센비율'];
      const rows = allExpenses.map((e) => [
        e.expenseId,
        e.expenseName,
        e.expensePrice,
        e.expenseDate,
        e.expenseRate > 0 ? `${(e.expenseRate * 100).toFixed(0)}%` : '없음',
      ]);
      downloadCsv(`지출내역_${new Date().toISOString().split('T')[0]}.csv`, header, rows);
    } catch (error) {
      console.error('Failed to export expense CSV:', error);
      alert('내보내기 중 오류가 발생했습니다.');
    }
  };

  // 커미션 내역 CSV 내보내기 (ADMIN용): 현재 지급상태/조회월 조건을 반영한 전체 목록을 서버에서 받아와 다운로드 (페이징 무시)
  const handleExportCommissionsCsv = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const query = new URLSearchParams();
      if (adminStatusFilter !== 'ALL') query.set('status', adminStatusFilter);
      if (adminMonthFilter !== 'ALL') query.set('month', adminMonthFilter);
      const response = await fetch(`${backendUrl}/fitb/settle/commission/export?${query.toString()}`, { headers });
      if (!response.ok) {
        alert('내보내기에 실패했습니다.');
        return;
      }
      const allCommissions = await response.json();
      if (allCommissions.length === 0) {
        alert('내보낼 커미션 내역이 없습니다.');
        return;
      }
      const header = ['정산ID', '사업장', '대상월', '커미션금액', '커미션율', '상태', '지급일'];
      const rows = allCommissions.map((c) => [
        c.settlementId,
        c.gymName || `사업장 ID: ${c.gymId}`,
        getYearMonth(c.settleMonth),
        c.commission,
        `${(c.commissionRate * 100).toFixed(0)}%`,
        c.status,
        c.settledAt || '-',
      ]);
      downloadCsv(`커미션내역_${new Date().toISOString().split('T')[0]}.csv`, header, rows);
    } catch (error) {
      console.error('Failed to export commission CSV:', error);
      alert('내보내기 중 오류가 발생했습니다.');
    }
  };

  // 상단 유틸리티 바(알림 종 왼쪽)에 현재 화면 조건 기준 CSV 내보내기 버튼을 등록한다.
  // ADMIN=커미션 내역 / OWNER=현재 활성 탭(매출·지출) 기준. 권한 없음 화면에서는 등록하지 않는다.
  useHeaderAction(
    loading
      ? null
      : activeRole === 'ADMIN'
        ? { label: 'CSV 내보내기', onClick: handleExportCommissionsCsv }
        : activeRole === 'OWNER'
          ? { label: 'CSV 내보내기', onClick: ownerTab === 'sales' ? handleExportPaysCsv : handleExportExpensesCsv }
          : null
  );

  // --- 권한별 화면 렌더링 분기 ---

  // 1. 권한 없음 / 비로그인 화면
  if (activeRole !== 'ADMIN' && activeRole !== 'OWNER') {
    return (
      <div className="settle-container">
        <div className="card-premium unauth-card">
          <div className="unauth-icon"><NavIcon id="warning" size={40} /></div>
          <h2 className="unauth-title">정산 페이지 접근 제한</h2>
          <p className="unauth-desc">
            이 페이지는 <strong>관리자(ADMIN)</strong> 또는 <strong>사장님(OWNER)</strong> 권한이 있는 사용자만 접근할 수 있습니다.<br />
            로그인을 진행해 주세요.
          </p>
          <button className="btn-premium btn-back-login" onClick={() => navigate('/login')}>
            로그인 화면으로 이동
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="settle-container">
      {/* 페이지 헤더 (제목 + 안내 문구 + 주요 액션) — 리포트 페이지와 동일 시각 규격 */}
      <header className="settle-list-head">
        <div className="settle-list-head__main">
          <h2 className="settle-list-head__title">정산 매출</h2>
          <p className="settle-list-head__desc">매출과 지출 내역을 확인하고 기간별 정산 업무를 관리합니다.</p>
        </div>
        <div className="settle-list-head__actions">
          {/* ADMIN 전용 - 정산 커미션 수동 집계 (매달 1일 자동 스케줄러와 별개로 즉시 집계) */}
          {activeRole === 'ADMIN' && (
            <>
              <input
                type="month"
                className="select-premium"
                value={generateMonth}
                onChange={(e) => setGenerateMonth(e.target.value)}
              />
              <button type="button" className="btn-export-premium" onClick={handleGenerateCommissions}>
                수동 집계 실행
              </button>
            </>
          )}

          {/* OWNER 전용 - 지출 관리 탭에서만 노출되는 지출 확정 버튼 */}
          {activeRole === 'OWNER' && ownerTab === 'expenses' && (
            <button
              type="button"
              className="btn-premium expense-confirm-open"
              ref={expenseDrawerTriggerRef}
              onClick={() => setExpenseDrawerOpen(true)}
            >
              지출 확정하기
              {(unpaidCommissions.length + unpaidExpenseTotalCount) > 0 && (
                <span className="expense-confirm-count">
                  {unpaidCommissions.length + unpaidExpenseTotalCount}
                </span>
              )}
            </button>
          )}
        </div>
      </header>

      {errorInfo && (
        <div className="settle-error-banner">
          <span><NavIcon id="warning" size={16} className="ui-icon" /> {errorInfo}</span>
          <button type="button" onClick={() => setErrorInfo('')}>닫기</button>
        </div>
      )}

      {loading && <div className="settle-loading">데이터 로드 중...</div>}

      {/* ======================================================== */}
      {/* 2. 관리자 (ADMIN) 뷰 구현                                */}
      {/* ======================================================== */}
      {!loading && activeRole === 'ADMIN' && (
        <div>
          {/* 주요 지표 요약 카드 */}
          <section className="settle-stats">
            <div className="stat-card">
              <div className="stat-card-title">누적 수수료 수익</div>
              <div className="stat-card-value is-accent">
                {formatWon(commissionStats.totalPaidAmount)}
              </div>
              <div className="stat-card-desc">지급 완료 기준 총 정산 금액</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-title">미지급 정산 대기</div>
              <div className="stat-card-value is-warning">
                {commissionStats.unpaidCount} 건
              </div>
              <div className="stat-card-desc">신속한 확인 및 지급 처리가 필요합니다.</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-title">평균 커미션 수수료율</div>
              <div className="stat-card-value">
                {(commissionStats.avgCommissionRate * 100).toFixed(1)}%
              </div>
              <div className="stat-card-desc">등록된 전체 사업장 기준 평균</div>
            </div>
          </section>

          {/* 커미션 수동 집계 안내: 실행 버튼과 대상 월 선택은 페이지 헤더로 이동(주요 액션 배치 규칙) */}
          <div className="settle-panel generate-commission-card">
            <h3><NavIcon id="mypage" size={18} className="ui-icon" /> 정산 커미션 수동 집계</h3>
            <p>
              매달 1일 자동으로 전월 정산이 생성되지만, 필요 시 상단의 대상 월과 &quot;수동 집계 실행&quot; 버튼으로 특정 월을 즉시 강제 집계할 수 있습니다. 이미 집계된 가맹점/월 조합은 자동으로 건너뜁니다.
            </p>
          </div>

          {/* 테이블 필터링 제어 영역 */}
          <div className="filter-row">
            <div className="filter-left">
              <select
                className="select-premium"
                value={adminStatusFilter}
                onChange={(e) => setAdminStatusFilter(e.target.value)}
              >
                <option value="ALL">정산 상태: 전체</option>
                <option value="지급">지급 완료</option>
                <option value="미지급">미지급 대기</option>
              </select>

              <select
                className="select-premium"
                value={adminMonthFilter}
                onChange={(e) => setAdminMonthFilter(e.target.value)}
              >
                <option value="ALL">정산 대상 월: 전체</option>
                {filterMonths.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>

              <select className="select-premium" value={adminSortOption} onChange={handleAdminSortChange}>
                <option value="">기본순 (최신월순)</option>
                <option value="amount_desc">금액 높은순</option>
                <option value="amount_asc">금액 낮은순</option>
                <option value="month_asc">대상월 오래된순</option>
              </select>
            </div>
            <div className="filter-right">
              <span className="filter-count">
                총 <strong>{commissionTotalCount}</strong>건 검색됨
              </span>
            </div>
          </div>

          {/* 커미션 정산 내역 목록 테이블 */}
          <div className="settle-table-container">
            <table className="settle-table">
              <thead>
                <tr>
                  <th>정산 ID</th>
                  <th>사업장 (Gym)</th>
                  <th>대상 월</th>
                  <th>정산 커미션 금액</th>
                  <th>커미션율</th>
                  <th>상태</th>
                  <th>지급일(결제 완료일)</th>
                  <th>지급 경로</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map(c => (
                    <tr key={c.settlementId}>
                      <td>#{c.settlementId}</td>
                      <td>
                        <strong>{c.gymName || `사업장 ID: ${c.gymId}`}</strong>
                      </td>
                      <td>{getYearMonth(c.settleMonth)}</td>
                      <td className="cell-amount">{formatWon(c.commission)}</td>
                      <td>{(c.commissionRate * 100).toFixed(0)}%</td>
                      <td>
                        <span className={`status-badge ${c.status === '지급' ? 'paid' : 'pending'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td>{c.settledAt || '-'}</td>
                      <td>{c.status === '지급' ? '지출 등록 완료' : '사장님 지출 탭에서 결제'}</td>
                    </tr>
                  ))}
                {commissions.length === 0 && (
                  <tr>
                    <td colSpan="8" className="no-data-row">조건에 해당하는 정산 내역이 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination pager={commissionPager} onPageChange={handleCommissionPageChange} />
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. 사장님 (OWNER) 뷰 구현                                */}
      {/* ======================================================== */}
      {!loading && activeRole === 'OWNER' && (
        <div>
          {/* 사장님 뷰 서브 탭(좌) + 검색·정렬(우) — 칩 줄 오른쪽에 필터 배치 */}
          <div className="settle-tabs-row">
            <div className="settle-tabs">
              <button
                className={`settle-tab-btn ${ownerTab === 'sales' ? 'active' : ''}`}
                onClick={() => setOwnerTab('sales')}
              >
                <NavIcon id="chart" size={16} className="ui-icon" /> 매출 내역
              </button>
              <button
                className={`settle-tab-btn ${ownerTab === 'expenses' ? 'active' : ''}`}
                onClick={() => setOwnerTab('expenses')}
              >
                <NavIcon id="wallet" size={16} className="ui-icon" /> 지출 관리
              </button>
            </div>

            {ownerTab !== 'pnl' && (
              <div className="settle-tabs-row__right">
                <select
                  className="select-premium"
                  value={ownerMonthFilter}
                  onChange={(e) => setOwnerMonthFilter(e.target.value)}
                >
                  <option value="ALL">날짜 기준: 전체</option>
                  {filterMonths.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>

                <input
                  type="text"
                  className="input-search-premium"
                  placeholder={ownerTab === 'sales' ? "상품명 / 연락처 검색..." : "지출 항목명 검색..."}
                  value={ownerSearchQuery}
                  onChange={(e) => setOwnerSearchQuery(e.target.value)}
                />

                <select className="select-premium" value={ownerSortOption} onChange={handleOwnerSortChange}>
                  <option value="">기본순 (최신순)</option>
                  <option value="price_desc">금액 높은순</option>
                  <option value="price_asc">금액 낮은순</option>
                  <option value="date_asc">날짜 오래된순</option>
                </select>
              </div>
            )}
          </div>

          {/* 3.1 매출 내역 탭 */}
          {ownerTab === 'sales' && (
            <div className="settle-sales-layout">
              <div className="settle-sales-main">

              {/* 매출 테이블 */}
              <div className="settle-table-container is-spaced">
                <table className="settle-table">
                  <thead>
                    <tr>
                      <th>결제 ID</th>
                      <th>회원 연락처(ID)</th>
                      <th>결제 항목</th>
                      <th>결제 금액</th>
                      <th>쿠폰</th>
                      <th>결제 방법</th>
                      <th>결제일</th>
                      <th>작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pays.map((p, index) => (
                      // 행 클릭 = 우측 통합 드로어에 매출 탭 추가 (삭제 버튼은 stopPropagation으로 기존 동작 유지)
                      <tr
                        key={p.payId || p.dataId || index}
                        className="row-clickable"
                        onClick={() =>
                          window.dispatchEvent(new CustomEvent('b2b-drawer-open', {
                            detail: { kind: 'settle', id: p.payId ?? p.dataId ?? index, title: p.payName ?? p.username ?? '매출', data: p },
                          }))
                        }
                      >
                        <td>{p.payId ? `#${p.payId}` : `임시 (계약 #${p.dataId})`}</td>
                        <td>{p.username ?? '-'}</td>
                        <td><strong>{p.payName}</strong></td>
                        <td className="cell-amount">{formatWon(p.payPrice)}</td>
                        <td>
                          {p.couponId ? (
                            <span className="pay-coupon-used">
                              {p.couponName} (-{formatWon(p.discountAmount)})
                            </span>
                          ) : (
                            <span className="pay-coupon-unused">미사용</span>
                          )}
                        </td>
                        <td>{p.installment === 0 ? '일시불' : `${p.installment}개월 할부`}</td>
                        <td>{p.payDate}</td>
                        <td>
                          <button
                            className="btn-action btn-action-danger btn-xs"
                            onClick={(e) => { e.stopPropagation(); handleDeletePay(p.payId); }}
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                    ))}
                    {pays.length === 0 && (
                      <tr>
                        <td colSpan="8" className="no-data-row">조건에 해당하는 매출 내역이 없습니다.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination pager={payPager} onPageChange={handlePayPageChange} />

              {/* 미결제 계약 목록 (h_pay 연동, /fitb/payment 페이지로 이동) */}
              {unpaidContracts.length > 0 && (
                <div className="settle-panel expense-form-card">
                  <h3><NavIcon id="card" size={18} className="ui-icon" /> 미결제 리스트</h3>
                  <p className="settle-form-desc">
                    회원이 보유한 쿠폰을 확인하고 할인을 적용해 결제를 확정합니다.
                  </p>
                  <div className="unpaid-contract-filter">
                    <label htmlFor="unpaid-contract-type">계약 유형</label>
                    <select
                      id="unpaid-contract-type"
                      className="select-premium"
                      value={unpaidContractType}
                      onChange={handleUnpaidContractTypeChange}
                    >
                      <option value="ALL">전체 계약</option>
                      <option value="3">헬스 계약</option>
                      <option value="4">PT 계약</option>
                    </select>
                  </div>
                  <ul className="unpaid-contract-ul">
                    {pagedUnpaidContracts.map((c) => (
                      <li key={c.dataId} className="unpaid-contract-li">
                        <span>[{c.contract === 3 ? '이용권' : 'PT'}] {c.receiverName} (₩{c.amount?.toLocaleString()}) - #{c.dataId}</span>
                        <Link to={`/fitb/payment/${c.dataId}`} className="btn-premium">쿠폰 적용 결제하기</Link>
                      </li>
                    ))}
                    {pagedUnpaidContracts.length === 0 && (
                      <li className="no-data-row">선택한 유형의 미결제 계약이 없습니다.</li>
                    )}
                  </ul>
                  <Pagination pager={unpaidContractPager} onPageChange={setUnpaidContractPage} />
                </div>
              )}

              </div>
              {renderSummaryRail()}
            </div>
          )}

          {/* 3.2 지출 관리 탭 */}
          {ownerTab === 'expenses' && (
            <>
              <div className="settle-sales-layout settle-expense-layout">
                <div className="settle-sales-main">

              {/* 지출 리스트 테이블 */}
              <div className="settle-table-container">
                <table className="settle-table">
                  <thead>
                    <tr>
                      <th>지출 ID</th>
                      <th>지출 항목명</th>
                      <th>지출 금액</th>
                      <th>결제일</th>
                      <th>수수료/인센 비율</th>
                      <th>작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map(e => (
                        // 행 클릭 = 우측 통합 드로어에 지출 탭 추가 (삭제 버튼은 stopPropagation으로 기존 동작 유지)
                        <tr
                          key={e.expenseId}
                          className="row-clickable"
                          onClick={() =>
                            window.dispatchEvent(new CustomEvent('b2b-drawer-open', {
                              detail: { kind: 'expense', id: e.expenseId, title: e.expenseName ?? '지출', data: e },
                            }))
                          }
                        >
                          <td>#{e.expenseId}</td>
                          <td><strong>{e.expenseName}</strong></td>
                           <td className="cell-amount is-danger">
                             {(() => {
                               if (e.expenseRate > 0) {
                                 const base = Math.round(e.expensePrice / (1 + e.expenseRate));
                                 const incentive = e.expensePrice - base;
                                 return (
                                   <div>
                                     {formatWon(e.expensePrice)}
                                     <div className="expense-breakdown">
                                       {formatWon(base)}
                                       <span className="incentive-amount">
                                         + {formatWon(incentive)}
                                       </span>
                                     </div>
                                   </div>
                                 );
                               }
                               return formatWon(e.expensePrice);
                             })()}
                           </td>
                           <td>{e.expenseDate}</td>
                          <td>{e.expenseRate > 0 ? `${(e.expenseRate * 100).toFixed(0)}%` : '없음'}</td>
                          <td>
                            <button
                              className="btn-action btn-action-danger btn-xs"
                              onClick={(ev) => { ev.stopPropagation(); handleDeleteExpense(e); }}
                            >
                              삭제
                            </button>
                          </td>
                        </tr>
                      ))}
                    {expenses.length === 0 && (
                      <tr>
                        <td colSpan="6" className="no-data-row">등록된 지출 비용 데이터가 없습니다.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination pager={expensePager} onPageChange={handleExpensePageChange} />
                </div>
                {renderExpenseSummaryRail()}
              </div>

              {expenseDrawerOpen && (
                <div
                  className="expense-drawer-backdrop"
                  role="presentation"
                  onMouseDown={() => setExpenseDrawerOpen(false)}
                >
                  <aside
                    className="expense-drawer"
                    ref={expenseDrawerRef}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="expense-drawer-title"
                    onMouseDown={(event) => event.stopPropagation()}
                  >
                    <header className="expense-drawer__header">
                      <div>
                        <span className="expense-drawer__eyebrow">지출 관리</span>
                        <h2 id="expense-drawer-title">지출 확정</h2>
                        <p>결제 대상을 선택하거나 운영 지출을 직접 입력하세요.</p>
                      </div>
                      <button
                        type="button"
                        className="expense-drawer__close"
                        aria-label="지출 확정 패널 닫기"
                        onClick={() => setExpenseDrawerOpen(false)}
                      >
                        ×
                      </button>
                    </header>
                    <div className="expense-drawer__body">
              <div className="expense-dual-layout">
                
                {/* 왼쪽: 지출 대기 계약서 목록 */}
                <div className="settle-panel expense-contract-list-card">
                  <h3><NavIcon id="clipboard" size={18} className="ui-icon" /> 지출 정산 대기</h3>
                  <p className="settle-form-desc">
                    전달 매출로 확정된 월별 커미션과 서명 완료된 임금 계약입니다. 항목을 선택하면 우측 폼에 자동 입력됩니다.
                  </p>
                  
                  <div className="expense-contract-scroll-list">
                    {unpaidCommissions.map(c => (
                      <button
                        type="button"
                        key={`settlement-${c.settlementId}`}
                        className={`expense-contract-item ${selectedSettlementId === c.settlementId.toString() ? 'selected' : ''}`}
                        onClick={() => handleSelectCommission(c)}
                      >
                        <div className="expense-item-head">
                          <span className="expense-item-badge is-commission">월별 커미션</span>
                          <span className="expense-item-id">정산 #{c.settlementId}</span>
                        </div>
                        <div className="expense-item-target">{c.settleMonth?.slice(0, 7)} 매출 커미션</div>
                        <div className="expense-item-foot">
                          <span>금액: <strong>{formatWon(c.commission)}</strong></span>
                          <span>비율: {(Number(c.commissionRate) * 100).toFixed(0)}%</span>
                        </div>
                      </button>
                    ))}
                    {unpaidExpenses.map(c => (
                        <button
                          type="button"
                          key={c.dataId}
                          className={`expense-contract-item ${selectedExpenseContractId === c.dataId.toString() ? 'selected' : ''}`}
                          onClick={() => handleSelectExpenseContract(c)}
                        >
                          <div className="expense-item-head">
                            <span className="expense-item-badge is-wage">임금 계약</span>
                            <span className="expense-item-id">#{c.dataId}</span>
                          </div>
                          <div className="expense-item-target">
                            지출 대상: {c.receiverName} 트레이너
                          </div>
                          <div className="expense-item-foot">
                            <span>
                              금액: <strong>{formatWon(c.amount)}</strong>
                              {c.contract === 2 && getIncentiveAmount(c) > 0 && (
                                <span className="incentive-amount">
                                  + {formatWon(getIncentiveAmount(c))}
                                </span>
                              )}
                            </span>
                            {c.contractRate !== null && c.contractRate !== undefined && (
                              <span>
                                비율: {parseFloat(c.contractRate) >= 1 ? parseFloat(c.contractRate) : (parseFloat(c.contractRate) * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    {unpaidCommissions.length === 0 && unpaidExpenses.length === 0 && (
                      <div className="expense-empty">
                        지출 대기 중인 계약서가 없습니다.
                      </div>
                    )}
                  </div>
                  <Pagination pager={contractPager} onPageChange={handleContractPageChange} />
                </div>

                {/* 오른쪽: 지출 등록 폼 */}
                <div className="settle-panel expense-form-card">
                  <h3><NavIcon id="wallet" size={18} className="ui-icon" /> 신규 지출 항목 직접 등록</h3>
                  <p className="settle-form-desc">
                    좌측의 계약서를 선택하여 자동 입력하거나, 직접 지출 항목을 입력하여 등록할 수 있습니다.
                  </p>
                  <form onSubmit={handleAddExpense}>
                    <div className="expense-form-grid">
                      <div className="form-group">
                        <label className="form-label">지출 항목명</label>
                        <input 
                          type="text" 
                          className="form-input"
                          placeholder="예: 월세, 광고 마케팅비, 기구 보수 등"
                          required
                          value={newExpenseName}
                          onChange={(e) => setNewExpenseName(e.target.value)}
                          readOnly={Boolean(selectedSettlementId)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">지출 금액 (원)</label>
                        <input 
                          type="number" 
                          className="form-input"
                          placeholder="숫자만 입력"
                          required
                          value={newExpensePrice}
                          onChange={(e) => setNewExpensePrice(e.target.value)}
                          readOnly={Boolean(selectedSettlementId)}
                        />
                        {selectedExpenseContractId && unpaidExpenses.find(c => c.dataId.toString() === selectedExpenseContractId)?.contract === 2 && (
                          <div className="expense-base-note">
                            기본급: {formatWon(unpaidExpenses.find(c => c.dataId.toString() === selectedExpenseContractId).amount)}
                            <span className="incentive-amount">
                              + 인센티브: {formatWon(getIncentiveAmount(unpaidExpenses.find(c => c.dataId.toString() === selectedExpenseContractId)))}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="form-group">
                        <label className="form-label">지출일 (결제일)</label>
                        <input 
                          type="date" 
                          className="form-input"
                          required
                          value={newExpenseDate}
                          onChange={(e) => setNewExpenseDate(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">인센티브 비율 (선택)</label>
                        <select 
                          className="form-input"
                          value={newExpenseRate}
                          onChange={(e) => setNewExpenseRate(e.target.value)}
                          disabled={Boolean(selectedSettlementId)}
                        >
                          {selectedSettlementId && !['0', '0.05', '0.10', '0.15', '0.20'].includes(newExpenseRate) && (
                            <option value={newExpenseRate}>{(Number(newExpenseRate) * 100).toFixed(2)}%</option>
                          )}
                          <option value="0">비율 없음 (0%)</option>
                          <option value="0.05">5%</option>
                          <option value="0.10">10%</option>
                          <option value="0.15">15%</option>
                          <option value="0.20">20%</option>
                        </select>
                      </div>
                    </div>

                    {selectedExpenseContractId && (
                      <div className="expense-linked-banner">
                        <span>연동 계약서 ID: <strong>#{selectedExpenseContractId}</strong></span>
                        <button
                          type="button"
                          className="btn-unlink"
                          onClick={() => {
                            setSelectedExpenseContractId('');
                            setNewExpenseName('');
                            setNewExpensePrice('');
                            setNewExpenseRate('0');
                          }}
                        >
                          선택 해제
                        </button>
                      </div>
                    )}

                    {selectedSettlementId && (
                      <div className="expense-linked-banner">
                        <span>연동 커미션 정산 ID: <strong>#{selectedSettlementId}</strong></span>
                        <button
                          type="button"
                          className="btn-unlink"
                          onClick={() => {
                            setSelectedSettlementId('');
                            setNewExpenseName('');
                            setNewExpensePrice('');
                            setNewExpenseRate('0');
                          }}
                        >
                          선택 해제
                        </button>
                      </div>
                    )}

                    <div className="btn-submit-container">
                      <button type="submit" className="btn-premium btn-submit-premium" disabled={expenseSubmitting}>
                        {expenseSubmitting ? '등록 중...' : '지출 등록하기'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
                    </div>
                  </aside>
                </div>
              )}
            </>
          )}

        </div>
      )}
    </div>
  );
}

export default Settlepage;
