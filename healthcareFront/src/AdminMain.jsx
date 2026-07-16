import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import B2bPromotion from './promotion/B2bPromotion.jsx';
import AttendanceConfirm from './attendance/AttendanceConfirm.jsx';
import OwnerManagement from './attendance/OwnerManagement.jsx';
import AdminManagement from './attendance/AdminManagement.jsx';

const TAB_IDS = ['dashboard', 'settlement', 'inventory', 'promotion', 'management'];

// 사장님/트레이너 전용 메인 포털 컴포넌트
function AdminMain() {
  const [searchParams] = useSearchParams();
  // 다른 화면에서 ?tab=promotion 처럼 진입하면 해당 탭이 켜진 채로 시작 (예: 이탈통계 가격불만 → 쿠폰)
  const [activeTab, setActiveTab] = useState(() => {
    const t = searchParams.get('tab');
    return TAB_IDS.includes(t) ? t : 'dashboard';
  });
  const user = JSON.parse(localStorage.getItem('user') || '{}');


  // 관리 대시보드 전체 메뉴 상수 정의 (권한별 노출은 아래 filter에서 결정)
  const allTabs = [
    { id: 'dashboard', label: '대시보드', title: '운영 현황 대시보드', desc: '오늘의 운영 현황을 간편하게 모니터링합니다.' },
    { id: 'settlement', label: '정산관리', title: '매출 및 정산 통계', desc: '이용권 결제 내역 분석 및 정산 자료입니다.' },
    { id: 'inventory', label: '물품관리', title: '라커룸 및 기자재 인벤토리', desc: '센터 내부 물품 재고 수량을 기록 관리합니다.' },
    { id: 'promotion', label: '프로모션', title: '이벤트 및 쿠폰 발행', desc: '할인 프로모션 생성 및 이벤트 업무를 수행합니다.' },
    {
      id: 'management',
      label: user.role === 'admin' ? '헬스장 계약 관리' : '회원/직원 관리',
      title: user.role === 'admin' ? '헬스장 제휴 계약 관리' : '회원 및 직원 관리',
      desc: user.role === 'admin' ? '헬스장별 제휴 계약 기간과 만료 여부를 확인합니다.' : '역할에 따라 회원·직원 관리 업무를 수행합니다.',
    }
  ];

  // admin 권한일 경우 물품관리와 프로모션 탭 제외
  const tabs = allTabs.filter(tab => {
    if (user.role === 'admin' && (tab.id === 'inventory' || tab.id === 'promotion')) {
      return false;
    }
    return true;
  });

  return (
    <div style={{ padding: '20px', position: 'relative' }}>

      {/* 마이페이지 이동 및 회원 가입/추가 버튼 영역 */}
      <div style={{ margin: '20px 0', display: 'flex', gap: '15px', alignItems: 'center' }}>
        <Link to="/fitb/b2bmypage" style={{ padding: '8px 16px', backgroundColor: '#28a745', color: '#fff', textDecoration: 'none', borderRadius: '4px' }}>
          관리자 마이페이지 이동 (건의/계정)
        </Link>
        
        {/* [권한 제약] 오직 역할이 admin(총괄 관리자)인 계정에게만 회원 가입/추가 링크 버튼을 노출시킴 */}
        {user.role === 'admin' && (
          <Link to="/join" style={{ padding: '8px 16px', backgroundColor: '#17a2b8', color: '#fff', textDecoration: 'none', borderRadius: '4px' }}>
            신규 회원 가입/추가
          </Link>
        )}

        {/* [권한 제약] 사장님(owner) 전용 - 입구 태블릿에 띄울 출석 키오스크 새 창 열기 */}
        {user.role === 'owner' && (
          <a href="/fitc/attendance" target="_blank" rel="noreferrer" style={{ padding: '8px 16px', backgroundColor: '#0284c7', color: '#fff', textDecoration: 'none', borderRadius: '4px' }}>
            출석 키오스크 열기
          </a>
        )}
      </div>

      <hr />

      {/* 4대 관리 탭 메뉴 버튼 */}
      <div style={{ margin: '20px 0' }}>
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ marginRight: '10px', padding: '8px 16px', cursor: 'pointer' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 4대 관리 탭 활성 내용 노출 영역 */}
      <div style={{ border: '1px solid #ccc', padding: '20px', minHeight: '200px' }}>
        {tabs.map((tab) => {
          if (activeTab !== tab.id) return null;
          
          // 프로모션 탭일 경우 커스텀 쿠폰 발송 컴포넌트를 출력
          if (tab.id === 'promotion') {
            return <B2bPromotion key={tab.id} />;
          }

          // 회원/직원 관리 탭 - 접속 역할에 따라 내용 3분기
          // 트레이너: 담당 회원 PT 출석 확인/일정 관리
          // 사장님(owner): 지점 트레이너 성과·재등록 임박·지점 일정 열람
          // 총괄 관리자(admin): 헬스장별 제휴 계약 기간·만료 현황
          if (tab.id === 'management') {
            if (user.role === 'trainer') {
              return <AttendanceConfirm key={tab.id} />;
            }
            if (user.role === 'owner') {
              // 재등록 리스트에서 쿠폰 발행 동선을 위해 프로모션 탭 전환 콜백 전달
              return <OwnerManagement key={tab.id} onGoPromotion={() => setActiveTab('promotion')} />;
            }
            // 총괄 관리자(admin): 매장 상세 없이 제휴 계약 기간만 관리
            return <AdminManagement key={tab.id} />;
          }

          return (
            <div key={tab.id}>
              <h3>{tab.title}</h3>
              <p>{tab.desc}</p>
              <button onClick={() => alert(`${tab.title} 기능이 활성화됩니다.`)}>
                상세 정보 보기
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AdminMain;
