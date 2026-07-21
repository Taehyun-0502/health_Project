import { useNavigate } from 'react-router-dom';

function useLogout() {
  const navigate = useNavigate();

  return async () => {
    const token = localStorage.getItem('accessToken');

    try {
      if (token) {
        await fetch(`${import.meta.env.VITE_BACKEND_URL}/member/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (error) {
      console.error('서버 로그아웃 세션 파괴 실패:', error);
    } finally {
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      alert('로그아웃되었습니다.');
      navigate('/');
    }
  };
}

export default useLogout;
