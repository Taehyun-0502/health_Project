import { useState } from 'react';
import { Link } from 'react-router-dom';
import B2bPromotion from './promotion/B2bPromotion.jsx';

// 사장님/트레이너 전용 메인 포털 컴포넌트
function AdminMain() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const user = JSON.parse(localStorage.getItem('user') || '{}');


  // 관리 대시보드 4대 메뉴 상수 정의
  const tabs = [
    { id: 'dashboard', label: '대시보드', title: '운영 현황 대시보드', desc: '오늘의 운영 현황을 간편하게 모니터링합니다.' },
    { id: 'settlement', label: '정산관리', title: '매출 및 정산 통계', desc: '이용권 결제 내역 분석 및 정산 자료입니다.' },
    { id: 'inventory', label: '물품관리', title: '라커룸 및 기자재 인벤토리', desc: '센터 내부 물품 재고 수량을 기록 관리합니다.' },
    { id: 'promotion', label: '프로모션', title: '이벤트 및 쿠폰 발행', desc: '할인 프로모션 생성 및 이벤트 업무를 수행합니다.' }
  ];

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
