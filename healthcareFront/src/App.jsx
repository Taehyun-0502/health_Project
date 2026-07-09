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
import B2cCheckIn from './b2c_mypage/B2cCheckIn.jsx';
import B2cAccount from './b2c_mypage/B2cAccount.jsx';           // 계정수정 컴포넌트 임포트
import ContractNew from './contract/ContractNew.jsx';
import ContractDetail from './contract/ContractDetail.jsx';
import Itempage from './item/Itempage.jsx';
import B2bAccount from './b2b_mypage/B2bAccount.jsx';
import Contractpage from './contract/Contractpage.jsx';
import Settlepage from './settle/settlepage.jsx'
import B2bMain from './b2b_mypage/B2bMain.jsx';
import B2bComplaint from './b2b_mypage/B2bComplaint.jsx';
import B2bNotification from './b2b_mypage/B2bNotification.jsx';
import Dashboard from './dashboard/dashboard.jsx';
import B2bList from './b2b_mypage/B2bList.jsx';
//import B2cSurvey from './b2c_mypage/B2cSurvey.jsx'; 



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

        <Route path="coupon" element={<B2cCoupon />} />
        <Route path="checkin" element={<B2cCheckIn />} />
        <Route path="b2ccomplaint" element={<B2cComplaint />} />
        <Route path="account" element={<B2cAccount />} />
        {/* <Route path="survey" element={<B2cSurvey />} /> */}
      </Route>

      {/* 사장님 포털 화면 */}
      <Route path="/fitb" element={<AdminMain />} />
      <Route path="/fitb/b2bmypage/account" element={<B2bAccount />} />
      <Route path="/fitb/contract/new" element={<ContractNew />} />
      <Route path="/fitb/contract/:dataId" element={<ContractDetail />} />
      <Route path="/fitb/itempage" element={<Itempage />} />
      <Route path="/fitb/b2bmypage" element={<B2bMain />} />
      <Route path="/fitb/contractpage" element={<Contractpage />} />
      <Route path="/fitb/b2bmypage/b2bcomplaint" element={<B2bComplaint />} />
      <Route path="/fitb/b2bmypage/notification" element={<B2bNotification />} />
      <Route path="/fitb/Settlepage" element={<Settlepage />} />
      <Route path="/fitb/dashboard" element={<Dashboard />} />
      <Route path="/fitb/b2bmypage/b2blist" element={<B2bList />} />

    </Routes>
  );
}

export default App;
