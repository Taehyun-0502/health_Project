import { Routes, Route } from 'react-router-dom';
import AdminMain from './AdminMain.jsx';
import Login from './member/Login.jsx';
import Join from './member/Join.jsx';
import MemberMain from './MemberMain.jsx';
import './App.css';
import B2cMain from './b2c_mypage/B2cMain.jsx';
import B2cComplaint from './b2c_mypage/B2cComplaint.jsx';
import Membership from './b2c_mypage/Membership.jsx';
import B2cCoupon from './b2c_mypage/B2cCoupon.jsx';             // 쿠폰 컴포넌트 임포트
import B2cCheckIn from './b2c_mypage/B2cCheckIn.jsx';
import B2cAccount from './b2c_mypage/B2cAccount.jsx';           // 계정수정 컴포넌트 임포트
import ContractNew from './contract/ContractNew.jsx';
import ContractDetail from './contract/ContractDetail.jsx';
import Itempage from './item/Itempage.jsx';
import B2bAccount from './b2b_mypage/B2bAccount.jsx';
import Contractpage from './contract/Contractpage.jsx';
import ContractLayout from './contract/ContractLayout.jsx';
import TrialTargetPage from './contract/TrialTargetPage.jsx';
import RosterPage from './contract/RosterPage.jsx';
import JobSeekerPage from './contract/JobSeekerPage.jsx';
import Payment from './payment/Payment.jsx';
import Attendance from './attendance/Attendance.jsx';               // 출석 키오스크 (무로그인)


import Settlepage from './settle/settlepage.jsx'
import B2bMain from './b2b_mypage/B2bMain.jsx';
import B2bComplaint from './b2b_mypage/B2bComplaint.jsx';
import B2bNotification from './b2b_mypage/B2bNotification.jsx';
import Dashboard from './dashboard/dashboard.jsx';
import B2bList from './b2b_mypage/B2bList.jsx';
import B2bCoupon from './b2b_mypage/B2bCoupon.jsx';
import B2cSurvey from './b2c_mypage/B2cSurvey.jsx';
import FitcLayout from './components/FitcLayout.jsx'; // ◀ 일반회원 레이아웃 임포트
import FitbLayout from './components/FitbLayout.jsx'; // ◀ 사장님 레이아웃 임포트 



// 메인 애플리케이션 컴포넌트
function App() {
  return (
    <Routes>
      {/* 로그인 및 기본 인증 영역 */}
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/join" element={<Join />} />

      {/* 출석 키오스크 - 헬스장 입구 공용 태블릿 용도라 로그인 헤더(FitcLayout) 없이 단독 노출 */}
      <Route path="/fitc/attendance" element={<Attendance />} />




      {/* 일반 회원 포털 영역 (FitcLayout 래핑으로 전역 헤더 상시 적용) */}
      <Route path="/fitc" element={<FitcLayout />}>
        <Route index element={<MemberMain />} />
        {/* 일반 회원 마이페이지 하위 중첩 탭 전체 매핑 */}
        <Route path="mypage" element={<B2cMain />}>
          <Route path="membership" element={<Membership />} />
          <Route path="coupon" element={<B2cCoupon />} />
          <Route path="checkin" element={<B2cCheckIn />} />
          <Route path="b2ccomplaint" element={<B2cComplaint />} />
          <Route path="account" element={<B2cAccount />} />
          <Route path="survey" element={<B2cSurvey />} />
        </Route>
      </Route>

      {/* 사장님 포털 화면 */}




      {/* 계약 패키지 2Depth 메뉴 - Contract(계약서 리스트) / Member(역할별 로스터) / 구직 트레이너(ADMIN) */}
      <Route path="/fitb" element={<FitbLayout />}>
        <Route index element={<AdminMain />} />
        <Route path="b2bmypage" element={<B2bMain />} />
        <Route path="b2bmypage/account" element={<B2bAccount />} />
        <Route path="b2bmypage/b2bcomplaint" element={<B2bComplaint />} />
        <Route path="b2bmypage/notification" element={<B2bNotification />} />
        <Route path="b2bmypage/b2blist" element={<B2bList />} />
        <Route path="b2bmypage/b2bcoupon" element={<B2bCoupon />} />
        <Route path="contract/new" element={<ContractNew />} />
        <Route path="contract/:dataId" element={<ContractDetail />} />
        <Route path="payment/:dataId" element={<Payment />} />
        <Route path="itempage" element={<Itempage />} />
        <Route path="/fitb/contractpage" element={<ContractLayout />}>
          <Route index element={<Contractpage />} />
          <Route path="member" element={<RosterPage />} />
          <Route path="jobseekers" element={<JobSeekerPage />} />
          {/* 체험권 계약 대상 목록 (OWNER 전용) - PT 체험(5) 발행폼 진입 */}
          <Route path="trial" element={<TrialTargetPage />} />
        </Route>

        <Route path="Settlepage" element={<Settlepage />} />
        <Route path="dashboard" element={<Dashboard />} />
        {/* PT 출석 트레이너 확인은 AdminMain의 회원/직원 관리 탭에 내장 (별도 라우트 없음) */}
      </Route>



    </Routes>
  );
}

export default App;
