import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './settlepage.css';

// 사업장 ID와 지점 이름 매핑
const GYM_NAMES = {
  101: 'A 피트니스 강남점',
  102: 'B 필라테스 홍대점',
  103: 'C 크로스핏 역삼점',
};

// --- Mock Data 정의 (API 연동 실패 시 폴백 데이터로 사용) ---
const mockCommissions = [
  {
    settlementId: 1,
    gymId: 101,
    commission: 1500000,
    commissionRate: 0.10,
    settleMonth: '2026-06-01',
    settledAt: '2026-06-15',
    status: '지급',
    expenseId: null
  },
  {
    settlementId: 2,
    gymId: 102,
    commission: 2400000,
    commissionRate: 0.12,
    settleMonth: '2026-06-01',
    settledAt: '2026-06-15',
    status: '지급',
    expenseId: null
  },
  {
    settlementId: 3,
    gymId: 101,
    commission: 1850000,
    commissionRate: 0.10,
    settleMonth: '2026-07-01',
    settledAt: null,
    status: '미지급',
    expenseId: null
  },
  {
    settlementId: 4,
    gymId: 103,
    commission: 950000,
    commissionRate: 0.08,
    settleMonth: '2026-07-01',
    settledAt: null,
    status: '미지급',
    expenseId: null
  }
];

const mockExpenses = [
  {
    expenseId: 1,
    gymId: 101,
    dateId: 1001,
    expenseName: '헬스장 기구 유지 보수',
    expenseDate: '2026-06-10',
    expensePrice: 450000,
    expenseRate: 0.0
  },
  {
    expenseId: 2,
    gymId: 101,
    dateId: 1002,
    expenseName: '임대료 및 관리비',
    expenseDate: '2026-06-25',
    expensePrice: 3500000,
    expenseRate: 0.0
  },
  {
    expenseId: 3,
    gymId: 101,
    dateId: 1003,
    expenseName: '트레이너 인센티브 (김트레이너)',
    expenseDate: '2026-06-28',
    expensePrice: 1200000,
    expenseRate: 0.15
  },
  {
    expenseId: 4,
    gymId: 101,
    dateId: 1004,
    expenseName: '센터 소모품(수건/비누) 구매',
    expenseDate: '2026-07-02',
    expensePrice: 280000,
    expenseRate: 0.0
  }
];

const mockPays = [
  {
    payId: 1,
    username: 1012345678,
    gymId: 101,
    dataId: 2001,
    installment: 0,
    payPrice: 660000,
    payDate: '2026-06-02',
    payName: '정기 12개월 이용권'
  },
  {
    payId: 2,
    username: 1098765432,
    gymId: 101,
    dataId: 2002,
    installment: 3,
    payPrice: 1500000,
    payDate: '2026-06-12',
    payName: '1:1 개인 PT 20회'
  },
  {
    payId: 3,
    username: 1022223333,
    gymId: 101,
    dataId: 2003,
    installment: 0,
    payPrice: 120000,
    payDate: '2026-06-20',
    payName: '1개월 이용권'
  },
  {
    payId: 4,
    username: 1044445555,
    gymId: 101,
    dataId: 2004,
    installment: 6,
    payPrice: 2200000,
    payDate: '2026-07-01',
    payName: '1:1 개인 PT 30회 + 락커룸'
  },
  {
    payId: 5,
    username: 1012345678,
    gymId: 101,
    dataId: 2005,
    installment: 0,
    payPrice: 480000,
    payDate: '2026-07-04',
    payName: '기구 필라테스 10회'
  }
];

const mockUnpaidContracts = [
  {
    dataId: 2011,
    contract: 3,
    gymId: 101,
    senderId: 1012345678,
    receiverId: 1055556666,
    receiverName: '김철수',
    status: 'SIGNED',
    startDate: '2026-07-01',
    endDate: '2027-07-01',
    amount: 600000,
    quantity: null,
    issueDate: '2026-07-01',
    contractType: 'OWNER_MEMBER_MEMBERSHIP',
    contractName: '이용권 계약'
  },
  {
    dataId: 2012,
    contract: 4,
    gymId: 101,
    senderId: 1012345678,
    receiverId: 1077778888,
    receiverName: '이영희',
    status: 'SIGNED',
    startDate: '2026-07-05',
    endDate: '2026-09-05',
    amount: 1800000,
    quantity: 20,
    issueDate: '2026-07-05',
    contractType: 'OWNER_MEMBER_PT',
    contractName: 'PT 계약'
  }
];

function Settlepage() {
  const navigate = useNavigate();

  // 로그인 유저 정보 및 토큰 조회
  const loginUser = JSON.parse(localStorage.getItem('user') || 'null');
  const token = localStorage.getItem('accessToken');

  // 개발 및 테스트를 위한 수동 역할 상태 (로그인 상태가 없거나 테스트 시 사용)
  const [testRole, setTestRole] = useState(null);

  // 현재 활성화된 역할 확인
  const activeRole = (testRole || loginUser?.role || '').toUpperCase();

  // 데이터 상태 관리
  const [commissions, setCommissions] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [pays, setPays] = useState([]);
  const [unpaidContracts, setUnpaidContracts] = useState([]);
  const [unpaidExpenses, setUnpaidExpenses] = useState([]);
  const [selectedExpenseContractId, setSelectedExpenseContractId] = useState('');
  
  // UI 상태 관리
  const [loading, setLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState('');
  
  // 사장님 뷰 서브 탭
  const [ownerTab, setOwnerTab] = useState('sales'); // 'sales', 'expenses', 'pnl'

  // 필터 상태
  const [adminStatusFilter, setAdminStatusFilter] = useState('ALL');
  const [adminMonthFilter, setAdminMonthFilter] = useState('ALL');
  const [ownerMonthFilter, setOwnerMonthFilter] = useState('ALL');
  const [ownerSearchQuery, setOwnerSearchQuery] = useState('');

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

  // 백엔드 연동 데이터 조회
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setErrorInfo('');

      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // 1. 관리자 권한용 커미션 내역 조회
      try {
        const response = await fetch(`${backendUrl}/fitb/settle/commission`, { headers });
        if (response.ok) {
          const data = await response.json();
          setCommissions(data);
        } else {
          throw new Error('커미션 조회 실패');
        }
      } catch (err) {
        console.warn('관리자 커미션 API 조회 실패 - 목업 데이터 사용:', err.message);
        setCommissions(mockCommissions);
      }

      // 2. 사장님 권한용 지출 내역 조회
      try {
        const response = await fetch(`${backendUrl}/fitb/settle/expense`, { headers });
        if (response.ok) {
          const data = await response.json();
          setExpenses(data);
        } else {
          throw new Error('지출 내역 조회 실패');
        }
      } catch (err) {
        console.warn('사장님 지출 API 조회 실패:', err.message);
        setExpenses([]);
      }

      // 3. 사장님 권한용 매출 내역 조회
      try {
        const response = await fetch(`${backendUrl}/fitb/settle/paylist`, { headers });
        if (response.ok) {
          const data = await response.json();
          setPays(data);
        } else {
          throw new Error('매출 내역 조회 실패');
        }
      } catch (err) {
        console.warn('사장님 매출 API 조회 실패 - 목업 데이터 사용:', err.message);
        setPays(mockPays);
      }

      // 4. 사장님 권한용 미결제 계약서 목록 조회
      try {
        const response = await fetch(`${backendUrl}/fitb/settle/unpaid-contracts`, { headers });
        if (response.ok) {
          const data = await response.json();
          setUnpaidContracts(data);
        } else {
          throw new Error('미결제 계약 목록 조회 실패');
        }
      } catch (err) {
        console.warn('미결제 계약 API 조회 실패 - 목업 데이터 사용:', err.message);
        setUnpaidContracts(mockUnpaidContracts);
      }

      // 5. 사장님 권한용 미결제 지출 계약서 목록 조회 (임금, 커미션 등)
      try {
        const response = await fetch(`${backendUrl}/fitb/settle/unpaid-expenses`, { headers });
        if (response.ok) {
          const data = await response.json();
          setUnpaidExpenses(data);
        } else {
          throw new Error('지출 계약 목록 조회 실패');
        }
      } catch (err) {
        console.warn('지출 계약 API 조회 실패:', err.message);
        setUnpaidExpenses([]);
      }

      setLoading(false);
    };

    fetchData();
  }, [token]);

  // 커미션 지급 상태 토글 (ADMIN 기능)
  const handleToggleCommissionStatus = async (settlementId) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    // 로컬 상태 변경 우선 수행 (인터랙티브 UX 제공)
    setCommissions(prev =>
      prev.map(c => {
        if (c.settlementId === settlementId) {
          const isPaid = c.status === '지급';
          return {
            ...c,
            status: isPaid ? '미지급' : '지급',
            settledAt: isPaid ? null : new Date().toISOString().split('T')[0],
          };
        }
        return c;
      })
    );

    // 백엔드로 상태 저장 요청 시도
    try {
      await fetch(`${backendUrl}/fitb/settle/commission/status`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ settlementId })
      });
    } catch (err) {
      console.warn('백엔드 업데이트 실패 - 로컬에서 상태 적용 완료:', err.message);
    }
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
      expenseId: Date.now(), // 고유 ID 임시 생성
      gymId: parseInt(gymId, 10),
      dataId: selectedExpenseContractId ? parseInt(selectedExpenseContractId, 10) : null,
      expenseName: newExpenseName,
      expenseDate: newExpenseDate,
      expensePrice: parseInt(newExpensePrice, 10),
      expenseRate: parseFloat(newExpenseRate) || 0.0,
    };

    // 로컬 상태 업데이트
    setExpenses(prev => [newExpenseObj, ...prev]);

    // 계약서 연동 지출인 경우 해당 계약서를 unpaidExpenses에서 제거
    if (selectedExpenseContractId) {
      setUnpaidExpenses(prev => prev.filter(c => c.dataId !== parseInt(selectedExpenseContractId, 10)));
    }

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
      console.warn('백엔드 지출 저장 실패 - 로컬 반영 완료:', err.message);
    }
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

    setExpenses(prev => prev.filter(exp => exp.expenseId !== expenseId));

    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      await fetch(`${backendUrl}/fitb/settle/expense/${expenseId}`, {
        method: 'DELETE',
        headers,
      });
    } catch (err) {
      console.warn('백엔드 지출 삭제 실패 - 로컬 반영 완료:', err.message);
    }
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

    // 로컬 상태 업데이트
    setPays(prev => [newPayObj, ...prev]);

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
      const response = await fetch(`${backendUrl}/fitb/settle/payadd`, {
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
      console.warn('백엔드 매출 등록 실패 - 로컬 반영 완료:', err.message);
      alert('로컬에 매출이 등록되었습니다.');
    }
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

  // --- 권한별 화면 렌더링 분기 ---

  // 1. 권한 없음 / 비로그인 화면 (테스트용 역할 선택기 포함)
  if (activeRole !== 'ADMIN' && activeRole !== 'OWNER') {
    return (
      <div className="settle-container">
        {/* 개발 테스트 바 */}
        <div className="tester-bar">
          <div className="tester-title">
            <span>⚙️ 역할 테스트 도구 (비로그인 상태)</span>
          </div>
          <div className="tester-actions">
            <button className="tester-btn" onClick={() => setTestRole('ADMIN')}>관리자(ADMIN) 뷰 보기</button>
            <button className="tester-btn" onClick={() => setTestRole('OWNER')}>사장님(OWNER) 뷰 보기</button>
          </div>
        </div>

        <div className="card-premium unauth-card">
          <div className="unauth-icon">⚠️</div>
          <h2 className="unauth-title">정산 페이지 접근 제한</h2>
          <p className="unauth-desc">
            이 페이지는 <strong>관리자(ADMIN)</strong> 또는 <strong>사장님(OWNER)</strong> 권한이 있는 사용자만 접근할 수 있습니다.<br />
            로그인을 진행하거나 상단의 테스트 도구를 이용하여 페이지 뷰를 전환해 보세요.
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
      {/* 개발자 도구 세션 토글 바 */}
      <div className="tester-bar">
        <div className="tester-title">
          <span>⚙️ 디버깅 역할 전환기</span>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '10px' }}>
            현재 역할: {activeRole === 'ADMIN' ? '관리자 (ADMIN)' : '사장님 (OWNER)'} {testRole && '(테스트 모드)'}
          </span>
        </div>
        <div className="tester-actions">
          <button 
            className={`tester-btn ${activeRole === 'ADMIN' ? 'active' : ''}`} 
            onClick={() => setTestRole('ADMIN')}
          >
            관리자(ADMIN) 뷰
          </button>
          <button 
            className={`tester-btn ${activeRole === 'OWNER' ? 'active' : ''}`} 
            onClick={() => setTestRole('OWNER')}
          >
            사장님(OWNER) 뷰
          </button>
          {testRole && (
            <button className="tester-btn" onClick={() => setTestRole(null)}>
              원래 계정 상태 복구
            </button>
          )}
        </div>
      </div>

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
          <span>접속자: <span className="settle-user-name">{loginUser?.name || '테스트 사용자'}</span></span>
          <span className={`settle-role-badge ${activeRole.toLowerCase()}`}>{activeRole}</span>
          <Link to="/fitb" style={{ fontSize: '13px', color: 'var(--primary-accent)', textDecoration: 'none', marginLeft: '10px' }}>
            대시보드로 돌아가기
          </Link>
        </div>
      </header>

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
                {formatWon(commissions.reduce((acc, curr) => acc + (curr.status === '지급' ? curr.commission : 0), 0))}
              </div>
              <div className="stat-card-desc">지급 완료 기준 총 정산 금액</div>
            </div>
            <div className="card-premium stat-card">
              <div className="stat-card-title">미지급 정산 대기</div>
              <div className="stat-card-value" style={{ color: '#f59e0b' }}>
                {commissions.filter(c => c.status === '미지급').length} 건
              </div>
              <div className="stat-card-desc">신속한 확인 및 지급 처리가 필요합니다.</div>
            </div>
            <div className="card-premium stat-card">
              <div className="stat-card-title">평균 커미션 수수료율</div>
              <div className="stat-card-value">
                {(commissions.reduce((acc, curr) => acc + curr.commissionRate, 0) / (commissions.length || 1) * 100).toFixed(1)}%
              </div>
              <div className="stat-card-desc">등록된 전체 사업장 기준 평균</div>
            </div>
          </section>

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
                <option value="2026-06">2026년 06월</option>
                <option value="2026-07">2026년 07월</option>
              </select>
            </div>
            <div className="filter-right">
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                총 <strong>{
                  commissions.filter(c => 
                    (adminStatusFilter === 'ALL' || c.status === adminStatusFilter) &&
                    (adminMonthFilter === 'ALL' || getYearMonth(c.settleMonth) === adminMonthFilter)
                  ).length
                }</strong>건 검색됨
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
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                {commissions
                  .filter(c => 
                    (adminStatusFilter === 'ALL' || c.status === adminStatusFilter) &&
                    (adminMonthFilter === 'ALL' || getYearMonth(c.settleMonth) === adminMonthFilter)
                  )
                  .map(c => (
                    <tr key={c.settlementId}>
                      <td>#{c.settlementId}</td>
                      <td>
                        <strong>{GYM_NAMES[c.gymId] || `사업장 ID: ${c.gymId}`}</strong>
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
                {commissions.filter(c => 
                  (adminStatusFilter === 'ALL' || c.status === adminStatusFilter) &&
                  (adminMonthFilter === 'ALL' || getYearMonth(c.settleMonth) === adminMonthFilter)
                ).length === 0 && (
                  <tr>
                    <td colSpan="8" className="no-data-row">조건에 해당하는 정산 내역이 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
            <button 
              className={`settle-tab-btn ${ownerTab === 'pnl' ? 'active' : ''}`}
              onClick={() => setOwnerTab('pnl')}
            >
              📈 손익 분석
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
                  <option value="2026-06">2026년 06월</option>
                  <option value="2026-07">2026년 07월</option>
                </select>

                <input 
                  type="text" 
                  className="input-search-premium"
                  placeholder={ownerTab === 'sales' ? "상품명 / 연락처 검색..." : "지출 항목명 검색..."}
                  value={ownerSearchQuery}
                  onChange={(e) => setOwnerSearchQuery(e.target.value)}
                />
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
                    {formatWon(
                      pays
                        .filter(p => 
                          (ownerMonthFilter === 'ALL' || getYearMonth(p.payDate) === ownerMonthFilter) &&
                          (p.payName.includes(ownerSearchQuery) || p.username.toString().includes(ownerSearchQuery))
                        )
                        .reduce((acc, curr) => acc + curr.payPrice, 0)
                    )}
                  </div>
                  <div className="stat-card-desc">검색 필터 기준 전체 매출 금액</div>
                </div>
                <div className="card-premium stat-card">
                  <div className="stat-card-title">결제 승인 건수</div>
                  <div className="stat-card-value">
                    {
                      pays.filter(p => 
                        (ownerMonthFilter === 'ALL' || getYearMonth(p.payDate) === ownerMonthFilter) &&
                        (p.payName.includes(ownerSearchQuery) || p.username.toString().includes(ownerSearchQuery))
                      ).length
                    } 건
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
                      <th>결제 방법</th>
                      <th>결제일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pays
                      .filter(p => 
                        (ownerMonthFilter === 'ALL' || getYearMonth(p.payDate) === ownerMonthFilter) &&
                        (p.payName.includes(ownerSearchQuery) || p.username.toString().includes(ownerSearchQuery))
                      )
                      .map((p, index) => (
                        <tr key={p.payId || p.dataId || index}>
                          <td>{p.payId ? `#${p.payId}` : `임시 (계약 #${p.dataId})`}</td>
                          <td>{p.username ? (p.username.toString().startsWith('0') ? p.username : '0' + p.username) : '-'}</td>
                          <td><strong>{p.payName}</strong></td>
                          <td style={{ fontWeight: '600' }}>{formatWon(p.payPrice)}</td>
                          <td>{p.installment === 0 ? '일시불' : `${p.installment}개월 할부`}</td>
                          <td>{p.payDate}</td>
                        </tr>
                      ))}
                    {pays.filter(p => 
                      (ownerMonthFilter === 'ALL' || getYearMonth(p.payDate) === ownerMonthFilter) &&
                      (p.payName.includes(ownerSearchQuery) || p.username.toString().includes(ownerSearchQuery))
                    ).length === 0 && (
                      <tr>
                        <td colSpan="6" className="no-data-row">조건에 해당하는 매출 내역이 없습니다.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

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
                        {unpaidContracts
                          .filter(c => !pays.some(p => p.dataId === c.dataId))
                          .map(c => (
                            <option key={c.dataId} value={c.dataId}>
                              [{c.contract === 3 ? '이용권' : 'PT'}] {c.receiverName} (₩{c.amount?.toLocaleString()}) - #{c.dataId}
                            </option>
                          ))
                        }
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
                    {formatWon(
                      expenses
                        .filter(e => 
                          (ownerMonthFilter === 'ALL' || getYearMonth(e.expenseDate) === ownerMonthFilter) &&
                          e.expenseName.includes(ownerSearchQuery)
                        )
                        .reduce((acc, curr) => acc + curr.expensePrice, 0)
                    )}
                  </div>
                  <div className="stat-card-desc">검색 필터 기준 사업장 총 운영 지출비</div>
                </div>
                <div className="card-premium stat-card">
                  <div className="stat-card-title">등록된 지출 건수</div>
                  <div className="stat-card-value">
                    {
                      expenses.filter(e => 
                        (ownerMonthFilter === 'ALL' || getYearMonth(e.expenseDate) === ownerMonthFilter) &&
                        e.expenseName.includes(ownerSearchQuery)
                      ).length
                    } 건
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
                    {expenses
                      .filter(e => 
                        (ownerMonthFilter === 'ALL' || getYearMonth(e.expenseDate) === ownerMonthFilter) &&
                        e.expenseName.includes(ownerSearchQuery)
                      )
                      .map(e => (
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
                    {expenses.filter(e => 
                      (ownerMonthFilter === 'ALL' || getYearMonth(e.expenseDate) === ownerMonthFilter) &&
                      e.expenseName.includes(ownerSearchQuery)
                    ).length === 0 && (
                      <tr>
                        <td colSpan="6" className="no-data-row">등록된 지출 비용 데이터가 없습니다.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* 지출 등록 폼 (계약 연동 및 직접 등록 듀얼 레이아웃) */}
              <div className="expense-dual-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '30px' }}>
                
                {/* 왼쪽: 지출 대기 계약서 목록 */}
                <div className="card-premium expense-contract-list-card" style={{ padding: '24px' }}>
                  <h3 style={{ marginBottom: '10px' }}>📋 지출 정산 대기 계약서</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '15px' }}>
                    서명 완료된 임금 계약서(강사) 및 제휴 수수료 계약서(플랫폼) 중 아직 지출 등록되지 않은 내역입니다. 클릭 시 우측 폼에 자동 입력됩니다.
                  </p>
                  
                  <div className="expense-contract-scroll-list" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                    {unpaidExpenses
                      .filter(c => !expenses.some(e => e.dataId === c.dataId))
                      .map(c => (
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
                      ))
                    }
                    {unpaidExpenses.filter(c => !expenses.some(e => e.dataId === c.dataId)).length === 0 && (
                      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
                        지출 대기 중인 계약서가 없습니다.
                      </div>
                    )}
                  </div>
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

          {/* 3.3 손익 분석 (Profit & Loss) 탭 */}
          {ownerTab === 'pnl' && (
            <div className="pnl-dashboard">
              {/* 수익/비용 분석 수치 연산 */}
              {(() => {
                const totalSales = pays.reduce((acc, curr) => acc + curr.payPrice, 0);
                const totalExpenses = expenses.reduce((acc, curr) => acc + curr.expensePrice, 0);
                // 10%의 수수료를 플랫폼 이용 커미션으로 가정 계산
                const estimatedCommission = totalSales * 0.10;
                const netProfit = totalSales - totalExpenses - estimatedCommission;

                // CSS 퍼센트 계산용 최대 한계치 계산
                const maxVal = Math.max(totalSales, totalExpenses + estimatedCommission, 1);
                const salesPercent = 100;
                const expensePercent = (totalExpenses / maxVal) * 100;
                const commissionPercent = (estimatedCommission / maxVal) * 100;
                const profitPercent = netProfit > 0 ? (netProfit / maxVal) * 100 : 0;

                return (
                  <>
                    <div className="card-premium pnl-chart-box">
                      <h3 className="chart-title">📊 누적 운영 매출 및 지출 비용 분석 (P&L Summary)</h3>
                      
                      <div className="pnl-bars-container">
                        <div className="pnl-bar-group">
                          <div className="pnl-bar-label-row">
                            <span>총 매출 (Gross Sales)</span>
                            <span className="value">{formatWon(totalSales)}</span>
                          </div>
                          <div className="pnl-progress-track">
                            <div className="pnl-progress-fill revenue" style={{ width: `${salesPercent}%` }}></div>
                          </div>
                        </div>

                        <div className="pnl-bar-group">
                          <div className="pnl-bar-label-row">
                            <span>총 지출 비용 (Operating Expenses)</span>
                            <span className="value" style={{ color: '#f43f5e' }}>{formatWon(totalExpenses)}</span>
                          </div>
                          <div className="pnl-progress-track">
                            <div className="pnl-progress-fill expense" style={{ width: `${expensePercent}%` }}></div>
                          </div>
                        </div>

                        <div className="pnl-bar-group">
                          <div className="pnl-bar-label-row">
                            <span>예상 플랫폼 수수료 (Est. Commission - 10%)</span>
                            <span className="value" style={{ color: '#f59e0b' }}>{formatWon(estimatedCommission)}</span>
                          </div>
                          <div className="pnl-progress-track">
                            <div className="pnl-progress-fill commission" style={{ width: `${commissionPercent}%` }}></div>
                          </div>
                        </div>

                        <div className="pnl-bar-group" style={{ marginTop: '10px' }}>
                          <div className="pnl-bar-label-row">
                            <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>순 마진 이익 (Net Operating Profit)</span>
                            <span className="value" style={{ color: netProfit >= 0 ? '#10b981' : '#ef4444', fontSize: '16px' }}>
                              {formatWon(netProfit)} ({totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : 0}%)
                            </span>
                          </div>
                          <div className="pnl-progress-track" style={{ height: '26px' }}>
                            <div className={`pnl-progress-fill profit`} style={{ width: `${profitPercent}%`, background: netProfit < 0 ? '#ef4444' : undefined }}></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pnl-comparison-cards">
                      <div className="card-premium" style={{ padding: '24px' }}>
                        <h4 style={{ marginBottom: '12px', fontSize: '15px' }}>📈 이익 극대화를 위한 분석 리포트</h4>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                          현재 매장의 총 매출 중 <strong>{totalSales > 0 ? ((totalExpenses / totalSales) * 100).toFixed(1) : 0}%</strong>가 기구 정비, 임대료 및 인센티브 비용으로 지출되고 있습니다.<br />
                          순 마진은 <strong>{totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : 0}%</strong>이며, 지출 최적화 및 추가 이용권 프로모션을 통해 이익률 개선이 가능합니다.
                        </p>
                      </div>
                      <div className="card-premium" style={{ padding: '24px' }}>
                        <h4 style={{ marginBottom: '12px', fontSize: '15px' }}>💡 수수료 정산 알림</h4>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                          플랫폼 수수료는 매월 초 전월 매출 합산 기준으로 정산 처리됩니다.<br />
                          현재 청구 대기 중인 예상 수수료는 <strong>{formatWon(estimatedCommission)}</strong> 입니다. 관리자의 승인에 맞춰 입금을 대기해 주세요.
                        </p>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Settlepage;
