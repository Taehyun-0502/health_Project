import { useState, useEffect } from 'react';

// (ADMIN) 구직 트레이너 리스트 페이지 (GET /contract/jobseekers, 디자인 제외 Plain 버전)
// 임금 계약(2) 해지·해고로 유효 계약이 없는(role=TRAINER & status=이탈) 트레이너 풀 조회
// 탈퇴 회원이므로 이름·전화번호(아이디) 등 최소 정보만 표시 - 관계사 관여는 소개(연락처 제공)까지,
// 이후 접촉·채용·임금계약(2) 재발행은 사장님이 기존 계약 흐름으로 직접 진행
function JobSeekerPage() {
  const [trainers, setTrainers] = useState([]);
  const [message, setMessage] = useState('');

  const loginUser = JSON.parse(localStorage.getItem('user') || 'null');

  // 진입 시 구직 트레이너 풀 자동 조회 (ADMIN 전용 - 그 외 역할은 403)
  useEffect(() => {
    const loadJobSeekers = async () => {
      setMessage('');

      const token = localStorage.getItem('accessToken');
      if (!token) {
        setMessage('로그인이 필요합니다. 먼저 로그인해 주세요.');
        return;
      }

      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/contract/jobseekers`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const result = await response.json();
          setTrainers(result);
          setMessage(`조회 성공: ${result.length}명`);
        } else {
          // 401(미로그인/토큰만료), 403(ADMIN 외 접근 차단)
          setMessage(`조회 실패(${response.status}): ${await response.text()}`);
        }
      } catch (error) {
        console.error('구직 트레이너 조회 오류:', error);
        setMessage('서버와의 통신 중 오류가 발생했습니다.');
      }
    };

    loadJobSeekers();
  }, []);

  return (
    <div>
      <h1>구직 트레이너 리스트 (구인구직 풀)</h1>
      <p>
        로그인 사용자: {loginUser ? `${loginUser.name} (${loginUser.role})` : '없음'}
      </p>
      <p>
        유효한 임금 계약이 없는(이탈) 트레이너 명단입니다. 사장님에게는 아래 연락처만
        소개(제공)하며, 이후 접촉·채용은 사장님이 직접 진행합니다.
      </p>
      <p>{message}</p>

      <table border="1">
        <thead>
          <tr>
            <th>이름</th>
            <th>전화번호(아이디)</th>
          </tr>
        </thead>
        <tbody>
          {trainers.map((trainer) => (
            <tr key={trainer.username}>
              <td>{trainer.name}</td>
              <td>{trainer.username}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default JobSeekerPage;
