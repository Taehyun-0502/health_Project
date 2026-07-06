import { Routes, Route } from 'react-router-dom';
import AdminMain from './AdminMain.jsx';
import Login from './member/Login.jsx';
import Join from './member/Join.jsx';
import MemberMain from './MemberMain.jsx';
import './App.css';
import B2cMain from './b2c_mypage/B2cMain.jsx';
import B2cComplaint from './b2c_mypage/B2cComplaint.jsx';
import Membership from './b2c_mypage/Membership.jsx'; // 멤버십 컴포넌트 임포트
import ContractNew from './user/ContractNew.jsx';
import ContractDetail from './user/ContractDetail.jsx';
import Itempage from './item/Itempage.jsx';
import Userpage from './user/Userpage.jsx';
import B2bComplaint from './b2b_mypage/B2bComplaint.jsx';
import B2bMain from './b2b_mypage/B2bMain.jsx';

// import Settlepage from './settle/Settlepage';
// import ContractDetail from './user/ContractDetail.jsx';

// 메인 애플리케이션 컴포넌트
function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/join" element={<Join />} />
      <Route path="/fitc" element={<MemberMain />} />
      <Route path="/fitc/mypage" element={<B2cMain />}/>
      <Route path="/fitc/mypage/b2ccomplaint" element={<B2cComplaint />} />
      <Route path="/fitc/mypage/membership" element={<Membership />} /> {/* 자식 경로로 멤버십 안착 */}
      <Route path="/fitb" element={<AdminMain />} />
      <Route path="/fitb/contract/new" element={<ContractNew />} />
      <Route path="/fitb/contract/:dataId" element={<ContractDetail />} />
      <Route path="/fitb/itempage" element={<Itempage />} />
      <Route path="/fitb/userpage" element={<Userpage />} />
      <Route path="/fitb/b2bmypage" element={<B2bMain />}/>
      <Route path="/fitb/b2bmypage/b2bcomplaint" element={<B2bComplaint />} />

      {/* <Route path="/fitb/contract/:dataId" element={<ContractDetail />} />
      <Route path="/fitb/settlepage" element={<Settlepage />} /> */}
    </Routes>
  );
}

export default App;
