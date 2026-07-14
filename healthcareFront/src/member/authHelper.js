// 엑세스 토큰 만료(401) 시 Silent Refresh를 자동으로 수행해주는 공통 fetch 래퍼 유틸리티 (JSDoc 한글 주석 준수)
export const fetchWithToken = async (url, options = {}) => {
  // 1. 로컬스토리지에서 엑세스 토큰 추출
  let accessToken = localStorage.getItem('accessToken');
  
  // 2. 기본 헤더 및 Authorization Bearer 토큰 셋업
  options.headers = {
    ...options.headers,
    'Content-Type': 'application/json',
    Authorization: accessToken ? `Bearer ${accessToken}` : ''
  };

  // 3. 1차 API 호출 시도
  let response = await fetch(url, options);

  // 4. 만약 엑세스 토큰이 만료되어 401 Unauthorized가 발생한 경우 자동 갱신 트리거
  if (response.status === 401) {
    const refreshToken = localStorage.getItem('refreshToken');
    
    // 리프레쉬 토큰이 로컬에 보관되어 있다면 재발급 프로세스 개시
    if (refreshToken) {
      try {
        const refreshResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/member/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });

        // 갱신 API 성공 시 신규 토큰 세팅 후 재시도
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          const newAccessToken = refreshData.accessToken;
          
          // 신규 엑세스 토큰 로컬스토리지 갱신 적재
          localStorage.setItem('accessToken', newAccessToken);
          
          // Authorization 헤더를 새 토큰으로 대치하여 원래 요청 2차 재발송
          options.headers['Authorization'] = `Bearer ${newAccessToken}`;
          response = await fetch(url, options);
        } else {
          // 리프레쉬 토큰까지 만료된 경우 세션 만료 로그아웃 처리
          handleSessionExpired();
        }
      } catch (err) {
        console.error('Silent Refresh 통신 실패:', err);
        handleSessionExpired();
      }
    } else {
      // 리프레쉬 토큰 자체가 없는 비로그인 유저 또는 만료 세션
      handleSessionExpired();
    }
  }

  return response;
};

// 로그인 세션 강제 만료 처리 메서드
const handleSessionExpired = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  alert('로그인 세션이 만료되었습니다. 다시 로그인해 주세요.');
  window.location.href = '/';
};
