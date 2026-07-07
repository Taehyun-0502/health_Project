import { Routes, Route } from 'react-router-dom';
import AdminMain from './AdminMain.jsx';
import Login from './member/Login.jsx';
import Join from './member/Join.jsx';
import MemberMain from './MemberMain.jsx';
import './App.css';
import B2cMain from './b2c_mypage/B2cMain.jsx';
import B2cComplaint from './b2c_mypage/B2cComplaint.jsx';
import Membership from './b2c_mypage/Membership.jsx';
import B2cNotification from './b2c_mypage/B2cNotification.jsx'; // 알림 컴포넌트 임포트
import B2cCoupon from './b2c_mypage/B2cCoupon.jsx';             // 쿠폰 컴포넌트 임포트
import B2cAttendance from './b2c_mypage/B2cAttendance.jsx';     // 출석 컴포넌트 임포트
import ContractNew from './user/ContractNew.jsx';
import Itempage from './item/Itempage.jsx';
import Userpage from './user/Userpage.jsx';

// 메인 애플리케이션 컴포넌트
function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/join" element={<Join />} />
      <Route path="/fitc" element={<MemberMain />} />
      
      {/* 일반 회원 마이페이지 하위 중첩 탭 전체 매핑 */}
      <Route path="/fitc/mypage" element={<B2cMain />}>
        <Route path="membership" element={<Membership />} />
        <Route path="notification" element={<B2cNotification />} />
        <Route path="coupon" element={<B2cCoupon />} />
        <Route path="attendance" element={<B2cAttendance />} />
        <Route path="b2ccomplaint" element={<B2cComplaint />} />
      </Route>

      {/* 사장님 포털 화면 */}
      <Route path="/fitb" element={<AdminMain />} />

      <Route path="/fitb/contract/new" element={<ContractNew />} />
      <Route path="/fitb/itempage" element={<Itempage />} />
      <Route path="/fitb/userpage" element={<Userpage />} />
    </Routes>
  );
}

export default App;
