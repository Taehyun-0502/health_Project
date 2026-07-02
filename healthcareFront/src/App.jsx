import { Routes, Route } from 'react-router-dom';
import Dashboard from './Dashboard.jsx';
import MemberMain from './MemberMain.jsx';
import AdminMain from './AdminMain.jsx';
import Login from './member/Login.jsx';
import Join from './member/Join.jsx';
import './App.css';

// 메인 애플리케이션 컴포넌트
function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/join" element={<Join />} />
      <Route path="/main" element={<Dashboard />} />
      <Route path="/fit/c" element={<MemberMain />} />
      <Route path="/fit/b" element={<AdminMain />} />
    </Routes>
  );
}

export default App;
