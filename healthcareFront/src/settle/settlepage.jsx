import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './settlepage.css';
import Pagination from './Pagination';

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
  const [selectedExpenseContractId, setSelectedExpenseContractId] = useState('');

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

  // UI 상태 관리
  const [loading, setLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState('');
  
  // 사장님 뷰 서브 탭
  const [ownerTab, setOwnerTab] = useState('sales'); // 'sales', 'expenses'

  // 필터 상태
  const [adminStatusFilter, setAdminStatusFilter] = useState('ALL');
  const [adminMonthFilter, setAdminMonthFilter] = useState('ALL');
  const [ownerMonthFilter, setOwnerMonthFilter] = useState('ALL');
  const [ownerSearchQuery, setOwnerSearchQuery] = useState('');

  // 정렬 옵션 상태 ('' = 기본(최신순)). 매출/지출 탭은 동일한 옵션 체계를 공유
  const [ownerSortOption, setOwnerSortOption] = useState('');
  const [adminSortOption, setAdminSortOption] = useState('');

  // 커미션 수동 집계 생성 대상 월 (YYYY-MM, 기본값은 이번 달)
  const [generateMonth, setGenerateMonth] = useState(() => new Date().toISOString().split('T')[0].substring(0, 7));

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

  // 매출 등록 (계약 연동) 폼 상태
  const [selectedContractId, setSelectedContractId] = useState('');
  const [payInstallment, setPayInstallment] = useState('0');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);

  // 선택된 계약 정보 파생 변수
  const selectedContract = unpaidContracts.find(c => c.dataId === parseInt(selectedContractId, 10));
  const autoPayPrice = selectedContract ? selectedContract.amount : '';
  const autoPayUsername = selectedContract ? selectedContract.receiverId : '';
  const autoPayName = selectedContract 
    ? `[계약 #${selectedContract.dataId}] ${selectedContract.contract === 3 ? '이용권' : 'PT'} - ${selectedContract.receiverName}`
    : '';

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
        setContractPager(data.pager || null);
      } else {
        throw new Error('지출 계약 목록 조회 실패');
      }
    } catch (err) {
      console.warn('지출 계약 API 조회 실패:', err.message);
      setErrorInfo('지출 정산 대기 계약서 목록을 불러오지 못했습니다.');
      setUnpaidExpenses([]);
      setContractPager(null);
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

      await Promise.all([
        fetchCommissions(1, 'ALL', 'ALL', ''),
        fetchCommissionStats(),
        fetchPays(1, '', 'ALL', ''),
        fetchExpenses(1, '', 'ALL', ''),
        fetchUnpaidContracts(),
        fetchUnpaidExpenses(1),
      ]);

      setLoading(false);
    };

    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // 검색어/조회월/탭이 바뀔 때마다 300ms 디바운스 후 현재 활성 탭의 1페이지부터 재조회
  useEffect(() => {
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
    const timer = setTimeout(() => {
      fetchCommissions(1, adminStatusFilter, adminMonthFilter, adminSortOption);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminStatusFilter, adminMonthFilter]);

  // 커미션 지급 상태 토글 (ADMIN 기능)
  const handleToggleCommissionStatus = async (settlementId) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    try {
      const response = await fetch(`${backendUrl}/fitb/settle/commission/status`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ settlementId })
      });
      if (!response.ok) {
        throw new Error('상태 변경 실패');
      }
    } catch (err) {
      console.warn('백엔드 커미션 상태 변경 실패:', err.message);
      alert('상태 변경에 실패했습니다.');
      return;
    }

    // 상태 변경(필터 적용 시 목록에서 사라질 수도 있음)과 요약 통계를 함께 재조회
    fetchCommissions(commissionPager?.currentPage || 1, adminStatusFilter, adminMonthFilter, adminSortOption);
    fetchCommissionStats();
  };

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
    if (!newExpenseName || !newExpensePrice || !newExpenseDate) {
      alert('모든 지출 정보를 올바르게 입력해 주세요.');
      return;
    }

    const gymId = loginUser?.gymId || 101; // 사장님의 소속 gymId 사용
    const newExpenseObj = {
      gymId: parseInt(gymId, 10),
      dataId: selectedExpenseContractId ? parseInt(selectedExpenseContractId, 10) : null,
      expenseName: newExpenseName,
      expenseDate: newExpenseDate,
      expensePrice: parseInt(newExpensePrice, 10),
      expenseRate: parseFloat(newExpenseRate) || 0.0,
    };

    // 입력 폼 리셋
    setNewExpenseName('');
    setNewExpensePrice('');
    setNewExpenseDate('');
    setNewExpenseRate('0');
    setSelectedExpenseContractId('');

    // 백엔드 전송 시도
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
    try {
      const response = await fetch(`${backendUrl}/fitb/settle/expense`, {
        method: 'POST',
        headers,
        body: JSON.stringify(newExpenseObj)
      });
      if (response.ok) {
        alert('지출이 성공적으로 등록되었습니다.');
      } else {
        throw new Error('서버 등록 실패');
      }
    } catch (err) {
      console.warn('백엔드 지출 저장 실패:', err.message);
    }

    // 새로 등록된 지출을 확인할 수 있도록 지출/지출 대기 계약서 목록을 1페이지부터 재조회
    setExpensePage(1);
    setContractPage(1);
    fetchExpenses(1, ownerSearchQuery, ownerMonthFilter, ownerSortOption);
    fetchUnpaidExpenses(1);
  };

  // 직원(트레이너) 인센티브 추가금 계산 헬퍼 함수
  const getIncentiveAmount = (c) => {
    if (!c || c.contract !== 2 || !c.contractRate) return 0;
    let rate = parseFloat(c.contractRate);
    if (rate > 1) {
      rate = rate / 100; // 데이터베이스에 10.0 또는 15.0 형식으로 저장된 경우 대응
    }
    return Math.floor(c.amount * rate);
  };

  // 사장님용 지출 대기 계약서 클릭 핸들러
  const handleSelectExpenseContract = (contract) => {
    setSelectedExpenseContractId(contract.dataId.toString());
    const labelName = contract.contract === 2 ? '임금' : '제휴 수수료';
    const otherParty = contract.contract === 2 ? `${contract.receiverName} 트레이너` : '플랫폼';
    const name = `[계약 #${contract.dataId}] ${labelName} - ${otherParty}`;
    setNewExpenseName(name);

    // 금액 설정: 임금의 경우 기본급 + 인센티브 합산액으로 자동 계산
    const incentive = getIncentiveAmount(contract);
    const totalPrice = contract.amount + incentive;
    setNewExpensePrice(totalPrice.toString());

    setNewExpenseDate(new Date().toISOString().split('T')[0]);
    
    // contractRate 값 포맷 정리 (예: 10 또는 0.1 -> 0.10, 0 -> 0)
    let rateStr = '0';
    if (contract.contractRate) {
      let rateNum = parseFloat(contract.contractRate);
      if (rateNum > 1) {
        rateNum = rateNum / 100;
      }
      if (rateNum > 0) {
        rateStr = rateNum.toFixed(2); // 0.1 -> "0.10"
      }
    }
    setNewExpenseRate(rateStr);
  };

  // 지출 삭제 핸들러 (OWNER 기능)
  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('해당 지출 내역을 삭제하시겠습니까?')) return;

    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const response = await fetch(`${backendUrl}/fitb/settle/expense/${expenseId}`, {
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

    // 삭제 후 현재 보고 있던 지출 페이지와 지출 대기 계약서 목록을 재조회
    fetchExpenses(expensePage, ownerSearchQuery, ownerMonthFilter, ownerSortOption);
    fetchUnpaidExpenses(contractPage);
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

    // 삭제 후 현재 보고 있던 매출 페이지를 재조회하고, 해당 계약서가 다시 미결제 목록에 나타나도록 드롭다운도 갱신
    fetchPays(payPager?.currentPage || 1, ownerSearchQuery, ownerMonthFilter, ownerSortOption);
    fetchUnpaidContracts();
  };

  // 매출 등록 핸들러 (OWNER 기능 - 계약 연동)
  const handleAddPay = async (e) => {
    e.preventDefault();
    if (!selectedContract) {
      alert('연동할 계약서를 선택해 주세요.');
      return;
    }

    const gymId = loginUser?.gymId || selectedContract.gymId || 101;
    const newPayObj = {
      username: autoPayUsername,
      gymId: parseInt(gymId, 10),
      installment: parseInt(payInstallment, 10),
      payPrice: parseInt(autoPayPrice, 10),
      payDate: payDate,
      payName: autoPayName,
      dataId: selectedContract.dataId
    };

    // 입력 폼 리셋
    setSelectedContractId('');
    setPayInstallment('0');
    setPayDate(new Date().toISOString().split('T')[0]);

    // 백엔드 API 요청
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    try {
      const response = await fetch(`${backendUrl}/fitb/payment/payadd`, {
        method: 'POST',
        headers,
        body: JSON.stringify(newPayObj)
      });
      if (response.ok) {
        alert('매출이 성공적으로 등록되었습니다.');
      } else {
        throw new Error('서버 등록 실패');
      }
    } catch (err) {
      console.warn('백엔드 매출 등록 실패:', err.message);
    }

    // 새로 등록된 매출을 확인할 수 있도록 매출 목록을 1페이지부터 재조회하고, 계약서 드롭다운도 갱신
    fetchPays(1, ownerSearchQuery, ownerMonthFilter, ownerSortOption);
    fetchUnpaidContracts();
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

  // --- 권한별 화면 렌더링 분기 ---

  // 1. 권한 없음 / 비로그인 화면
  if (activeRole !== 'ADMIN' && activeRole !== 'OWNER') {
    return (
      <div className="settle-container">
        <div className="card-premium unauth-card">
          <div className="unauth-icon">⚠️</div>
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
      {/* 헤더 */}
      <header className="settle-header">
        <div className="settle-title-area">
          <h1 className="gradient-title" style={{ fontSize: '32px', marginBottom: '0' }}>정산 관리 시스템</h1>
          <span className="settle-subtitle">
            {activeRole === 'ADMIN' 
              ? '가맹점 계약에 따른 플랫폼 커미션 정산 관리 화면' 
              : '사업장 운영 매출 내역 및 지출 비용 손익 대시보드'}
          </span>
        </div>
        <div className="settle-user-info">
          <span>접속자: <span className="settle-user-name">{loginUser?.name || '사용자'}</span></span>
          <span className={`settle-role-badge ${activeRole.toLowerCase()}`}>{activeRole}</span>
          <Link to="/fitb" style={{ fontSize: '13px', color: 'var(--primary-accent)', textDecoration: 'none', marginLeft: '10px' }}>
            대시보드로 돌아가기
          </Link>
        </div>
      </header>

      {errorInfo && (
        <div className="settle-error-banner">
          <span>⚠️ {errorInfo}</span>
          <button type="button" onClick={() => setErrorInfo('')}>닫기</button>
        </div>
      )}

      {loading && <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-secondary)' }}>데이터 로드 중...</div>}

      {/* ======================================================== */}
      {/* 2. 관리자 (ADMIN) 뷰 구현                                */}
      {/* ======================================================== */}
      {!loading && activeRole === 'ADMIN' && (
        <div>
          {/* 주요 지표 요약 카드 */}
          <section className="settle-stats">
            <div className="card-premium stat-card">
              <div className="stat-card-title">누적 수수료 수익</div>
              <div className="stat-card-value" style={{ color: 'var(--primary-accent)' }}>
                {formatWon(commissionStats.totalPaidAmount)}
              </div>
              <div className="stat-card-desc">지급 완료 기준 총 정산 금액</div>
            </div>
            <div className="card-premium stat-card">
              <div className="stat-card-title">미지급 정산 대기</div>
              <div className="stat-card-value" style={{ color: '#f59e0b' }}>
                {commissionStats.unpaidCount} 건
              </div>
              <div className="stat-card-desc">신속한 확인 및 지급 처리가 필요합니다.</div>
            </div>
            <div className="card-premium stat-card">
              <div className="stat-card-title">평균 커미션 수수료율</div>
              <div className="stat-card-value">
                {(commissionStats.avgCommissionRate * 100).toFixed(1)}%
              </div>
              <div className="stat-card-desc">등록된 전체 사업장 기준 평균</div>
            </div>
          </section>

          {/* 커미션 수동 집계 생성 컨트롤: 매달 1일 자동 스케줄러와 별개로, 관리자가 특정 월을 즉시 강제 집계할 수 있음 */}
          <div className="card-premium generate-commission-card">
            <h3 style={{ margin: '0 0 6px 0', fontSize: '15px' }}>⚙️ 정산 커미션 수동 집계</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
              매달 1일 자동으로 전월 정산이 생성되지만, 필요 시 특정 월을 수동으로 즉시 집계할 수 있습니다. 이미 집계된 가맹점/월 조합은 자동으로 건너뜁니다.
            </p>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="month"
                className="select-premium"
                value={generateMonth}
                onChange={(e) => setGenerateMonth(e.target.value)}
              />
              <button type="button" className="btn-export-premium" onClick={handleGenerateCommissions}>
                수동 집계 실행
              </button>
            </div>
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
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                총 <strong>{commissionTotalCount}</strong>건 검색됨
              </span>
              <button type="button" className="btn-export-premium" onClick={handleExportCommissionsCsv}>
                CSV 내보내기
              </button>
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
                  <th>작업</th>
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
                      <td style={{ fontWeight: '600' }}>{formatWon(c.commission)}</td>
                      <td>{(c.commissionRate * 100).toFixed(0)}%</td>
                      <td>
                        <span className={`status-badge ${c.status === '지급' ? 'paid' : 'pending'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td>{c.settledAt || '-'}</td>
                      <td>
                        <button 
                          className={`btn-action btn-action-primary`}
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          onClick={() => handleToggleCommissionStatus(c.settlementId)}
                        >
                          {c.status === '지급' ? '미지급 처리' : '지급 완료 처리'}
                        </button>
                      </td>
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
          {/* 사장님 뷰 서브 탭 제어 */}
          <div className="settle-tabs">
            <button 
              className={`settle-tab-btn ${ownerTab === 'sales' ? 'active' : ''}`}
              onClick={() => setOwnerTab('sales')}
            >
              📊 매출 내역
            </button>
            <button 
              className={`settle-tab-btn ${ownerTab === 'expenses' ? 'active' : ''}`}
              onClick={() => setOwnerTab('expenses')}
            >
              💸 지출 관리
            </button>
          </div>

          {/* 공통 필터 영역 (매출 및 지출 목록용) */}
          {ownerTab !== 'pnl' && (
            <div className="filter-row">
              <div className="filter-left">
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
              <div className="filter-right">
                <button
                  type="button"
                  className="btn-export-premium"
                  onClick={ownerTab === 'sales' ? handleExportPaysCsv : handleExportExpensesCsv}
                >
                  CSV 내보내기
                </button>
              </div>
            </div>
          )}

          {/* 3.1 매출 내역 탭 */}
          {ownerTab === 'sales' && (
            <div>
              <div className="settle-stats">
                <div className="card-premium stat-card">
                  <div className="stat-card-title">총 매출 합계</div>
                  <div className="stat-card-value" style={{ color: 'var(--primary-accent)' }}>
                    {formatWon(payTotalAmount)}
                  </div>
                  <div className="stat-card-desc">검색 필터 기준 전체 매출 금액</div>
                </div>
                <div className="card-premium stat-card">
                  <div className="stat-card-title">결제 승인 건수</div>
                  <div className="stat-card-value">
                    {payTotalCount} 건
                  </div>
                  <div className="stat-card-desc">정상 결제 승인 완료 기준 건수</div>
                </div>
              </div>

              {/* 매출 테이블 */}
              <div className="settle-table-container" style={{ marginBottom: '30px' }}>
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
                      <tr key={p.payId || p.dataId || index}>
                        <td>{p.payId ? `#${p.payId}` : `임시 (계약 #${p.dataId})`}</td>
                        <td>{p.username ? (p.username.toString().startsWith('0') ? p.username : '0' + p.username) : '-'}</td>
                        <td><strong>{p.payName}</strong></td>
                        <td style={{ fontWeight: '600' }}>{formatWon(p.payPrice)}</td>
                        <td>
                          {p.couponId ? (
                            <span style={{ color: 'var(--accent-color, #2563eb)' }}>
                              {p.couponName} (-{formatWon(p.discountAmount)})
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-secondary, #999)' }}>미사용</span>
                          )}
                        </td>
                        <td>{p.installment === 0 ? '일시불' : `${p.installment}개월 할부`}</td>
                        <td>{p.payDate}</td>
                        <td>
                          <button
                            className="btn-action btn-action-danger"
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                            onClick={() => handleDeletePay(p.payId)}
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

              {/* 쿠폰 적용 현장 결제 (h_pay 연동, /fitb/payment 페이지로 이동) */}
              {unpaidContracts.length > 0 && (
                <div className="card-premium expense-form-card">
                  <h3>💳 쿠폰 적용 결제</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '15px' }}>
                    회원이 보유한 쿠폰을 확인하고 할인을 적용해 결제를 확정합니다.
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {unpaidContracts.map((c) => (
                      <li key={c.dataId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-color, #e5e7eb)' }}>
                        <span>[{c.contract === 3 ? '이용권' : 'PT'}] {c.receiverName} (₩{c.amount?.toLocaleString()}) - #{c.dataId}</span>
                        <Link to={`/fitb/payment/${c.dataId}`} className="btn-premium">쿠폰 적용 결제하기</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 매출 등록 폼 (계약 연동) */}
              <div className="card-premium expense-form-card">
                <h3>📊 계약 연동 신규 매출 등록</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '15px' }}>
                  서명 완료된 회원 계약서(이용권/PT) 정보를 불러와 결제 매출로 등록합니다. 이미 매출 등록된 계약은 선택 목록에 표시되지 않습니다.
                </p>
                <form onSubmit={handleAddPay}>
                  <div className="expense-form-grid">
                    <div className="form-group">
                      <label className="form-label">연동할 계약서 선택</label>
                      <select 
                        className="form-input"
                        required
                        value={selectedContractId}
                        onChange={(e) => setSelectedContractId(e.target.value)}
                      >
                        <option value="">-- 계약서를 선택해 주세요 --</option>
                        {unpaidContracts.map(c => (
                          <option key={c.dataId} value={c.dataId}>
                            [{c.contract === 3 ? '이용권' : 'PT'}] {c.receiverName} (₩{c.amount?.toLocaleString()}) - #{c.dataId}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">회원 연락처</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        readOnly 
                        placeholder="계약 선택 시 자동 입력"
                        value={autoPayUsername ? (autoPayUsername.toString().startsWith('0') ? autoPayUsername : '0' + autoPayUsername) : ''}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">결제 금액 (원)</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        readOnly 
                        placeholder="계약 선택 시 자동 입력"
                        value={autoPayPrice ? autoPayPrice.toLocaleString() + ' 원' : ''}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">결제 항목명</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        readOnly 
                        placeholder="계약 선택 시 자동 입력"
                        value={autoPayName}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">할부 구분 (선택)</label>
                      <select 
                        className="form-input"
                        value={payInstallment}
                        onChange={(e) => setPayInstallment(e.target.value)}
                      >
                        <option value="0">일시불</option>
                        <option value="3">3개월 할부</option>
                        <option value="6">6개월 할부</option>
                        <option value="12">12개월 할부</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">결제 완료일</label>
                      <input 
                        type="date" 
                        className="form-input" 
                        required
                        value={payDate}
                        onChange={(e) => setPayDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="btn-submit-container">
                    <button type="submit" className="btn-premium btn-submit-premium">
                      매출 등록하기
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 3.2 지출 관리 탭 */}
          {ownerTab === 'expenses' && (
            <div>
              <div className="settle-stats">
                <div className="card-premium stat-card">
                  <div className="stat-card-title">지출 총액</div>
                  <div className="stat-card-value" style={{ color: '#f43f5e' }}>
                    {formatWon(expenseTotalAmount)}
                  </div>
                  <div className="stat-card-desc">검색 필터 기준 사업장 총 운영 지출비</div>
                </div>
                <div className="card-premium stat-card">
                  <div className="stat-card-title">등록된 지출 건수</div>
                  <div className="stat-card-value">
                    {expenseTotalCount} 건
                  </div>
                  <div className="stat-card-desc">자체 관리 지출 내역 합산</div>
                </div>
              </div>

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
                        <tr key={e.expenseId}>
                          <td>#{e.expenseId}</td>
                          <td><strong>{e.expenseName}</strong></td>
                           <td style={{ fontWeight: '600', color: '#f43f5e' }}>
                             {(() => {
                               if (e.expenseRate > 0) {
                                 const base = Math.round(e.expensePrice / (1 + e.expenseRate));
                                 const incentive = e.expensePrice - base;
                                 return (
                                   <div>
                                     {formatWon(e.expensePrice)}
                                     <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'normal', marginTop: '2px' }}>
                                       {formatWon(base)} 
                                       <span style={{ color: '#ef4444', fontWeight: 'bold', marginLeft: '4px' }}>
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
                              className="btn-action btn-action-danger"
                              style={{ padding: '4px 10px', fontSize: '12px' }}
                              onClick={() => handleDeleteExpense(e.expenseId)}
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

              {/* 지출 등록 폼 (계약 연동 및 직접 등록 듀얼 레이아웃) */}
              <div className="expense-dual-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '30px' }}>
                
                {/* 왼쪽: 지출 대기 계약서 목록 */}
                <div className="card-premium expense-contract-list-card" style={{ padding: '24px' }}>
                  <h3 style={{ marginBottom: '10px' }}>📋 지출 정산 대기 계약서</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '15px' }}>
                    서명 완료된 임금 계약서(강사) 및 제휴 수수료 계약서(플랫폼) 중 아직 지출 등록되지 않은 내역입니다. 클릭 시 우측 폼에 자동 입력됩니다.
                  </p>
                  
                  <div className="expense-contract-scroll-list" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                    {unpaidExpenses.map(c => (
                        <div
                          key={c.dataId}
                          className={`expense-contract-item ${selectedExpenseContractId === c.dataId.toString() ? 'selected' : ''}`}
                          style={{
                            padding: '12px',
                            border: '1px solid var(--border-color, #e2e8f0)',
                            borderRadius: '8px',
                            marginBottom: '10px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            backgroundColor: selectedExpenseContractId === c.dataId.toString() ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                            borderColor: selectedExpenseContractId === c.dataId.toString() ? 'var(--primary-accent, #2563eb)' : 'var(--border-color, #e2e8f0)'
                          }}
                          onClick={() => handleSelectExpenseContract(c)}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: c.contract === 2 ? '#ef4444' : '#f59e0b', background: c.contract === 2 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                              {c.contract === 2 ? '임금 계약' : '제휴 수수료'}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>#{c.dataId}</span>
                          </div>
                          <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                            {c.contract === 2 ? `지출 대상: ${c.receiverName} 트레이너` : `지출 대상: 플랫폼 제휴 수수료`}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                            <span>
                              금액: <strong>{formatWon(c.amount)}</strong>
                              {c.contract === 2 && getIncentiveAmount(c) > 0 && (
                                <span style={{ color: '#ef4444', fontWeight: 'bold', marginLeft: '6px' }}>
                                  + {formatWon(getIncentiveAmount(c))}
                                </span>
                              )}
                            </span>
                            {c.contractRate !== null && c.contractRate !== undefined && (
                              <span>
                                비율: {parseFloat(c.contractRate) > 1 ? parseFloat(c.contractRate) : (parseFloat(c.contractRate) * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    {unpaidExpenses.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
                        지출 대기 중인 계약서가 없습니다.
                      </div>
                    )}
                  </div>
                  <Pagination pager={contractPager} onPageChange={handleContractPageChange} />
                </div>

                {/* 오른쪽: 지출 등록 폼 */}
                <div className="card-premium expense-form-card" style={{ padding: '24px' }}>
                  <h3>💸 신규 지출 항목 직접 등록</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '15px' }}>
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
                        />
                        {selectedExpenseContractId && unpaidExpenses.find(c => c.dataId.toString() === selectedExpenseContractId)?.contract === 2 && (
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            기본급: {formatWon(unpaidExpenses.find(c => c.dataId.toString() === selectedExpenseContractId).amount)}
                            <span style={{ color: '#ef4444', fontWeight: 'bold', marginLeft: '6px' }}>
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
                        >
                          <option value="0">비율 없음 (0%)</option>
                          <option value="0.05">5%</option>
                          <option value="0.10">10%</option>
                          <option value="0.15">15%</option>
                          <option value="0.20">20%</option>
                        </select>
                      </div>
                    </div>

                    {selectedExpenseContractId && (
                      <div style={{ marginTop: '15px', padding: '10px', background: 'rgba(37, 99, 235, 0.05)', borderRadius: '6px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>연동 계약서 ID: <strong>#{selectedExpenseContractId}</strong></span>
                        <button 
                          type="button" 
                          className="tester-btn" 
                          style={{ padding: '2px 6px', fontSize: '11px', background: 'transparent', border: '1px solid var(--border-color, #e2e8f0)', cursor: 'pointer' }}
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

                    <div className="btn-submit-container">
                      <button type="submit" className="btn-premium btn-submit-premium">
                        지출 등록하기
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}


        </div>
      )}
    </div>
  );
}

export default Settlepage;
