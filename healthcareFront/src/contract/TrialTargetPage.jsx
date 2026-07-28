import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavIcon from '../components/uiIcons.jsx';
import './Contract.css';

// 체험권 계약 대상 목록 페이지 (OWNER 전용, 디자인 제외 Plain 버전)
// 본인이 발급한 미사용·미만료 체험권의 동일 지점 MEMBER 목록 - 선택 시 PT 체험(5) 발행폼으로 이동
function TrialTargetPage() {
  const navigate = useNavigate();
  const [targets, setTargets] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchTargets = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setMessage('로그인이 필요합니다.');
        return;
      }
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/contract/trial-targets`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const result = await response.json();
          setTargets(result);
          setMessage(`발행 가능한 체험권 대상: ${result.length}건`);
        } else {
          setMessage(`조회 실패(${response.status}): ${await response.text()}`);
        }
      } catch (error) {
        console.error('체험권 대상 목록 조회 오류:', error);
        setMessage('서버와의 통신 중 오류가 발생했습니다.');
      }
    };

    fetchTargets();
  }, []);

  return (
    <div>
      <h1 className="contract-page-title">체험권 계약 대상 목록</h1>
      <p className="contract-page-desc">발행 가능한 체험권(미사용·미만료)을 보유한 우리 지점 회원만 표시됩니다.</p>
      {message && <p className="contract-page-desc">{message}</p>}

      <div className="contract-table-card">
        <table className="contract-table">
          <thead>
            <tr>
              <th>이름</th>
              <th>회원 아이디</th>
              <th>이메일</th>
              <th>생년월일</th>
              <th>체험 PT 횟수</th>
              <th>기존 계약</th>
              <th>발행</th>
            </tr>
          </thead>
          <tbody>
            {targets.length === 0 ? (
              <tr>
                <td colSpan={7} className="contract-table__muted">발행 가능한 체험권 대상이 없어요.</td>
              </tr>
            ) : (
              targets.map((target) => (
                <tr key={target.couponId}>
                  <td className="contract-table__name">{target.member?.name}</td>
                  <td className="contract-table__muted">{target.member?.username}</td>
                  <td className="contract-table__muted">{target.member?.email}</td>
                  <td className="contract-table__muted">{target.member?.birth}</td>
                  <td>{target.couponCount}회</td>
                  <td className="contract-table__muted">
                    {target.baseDataId
                      ? `${target.baseContract === 3 ? '이용권' : 'PT'} #${target.baseDataId}`
                      : '없음'}
                  </td>
                  <td>
                    {/* 선택한 대상 정보를 state로 넘겨 PT 체험(5) 발행폼에 자동 입력 */}
                    <button
                      className="contract-btn-primary contract-btn-sm"
                      onClick={() => navigate('/fitb/contract/new?contract=5', { state: { target } })}
                    >
                      PT 체험 계약서 발행
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="contract-form-actions">
        <button className="contract-btn-secondary" onClick={() => navigate('/fitb/contractpage')}>
          <NavIcon id="arrow" size={16} className="ui-icon ui-icon--left" /> 계약서 리스트로
        </button>
      </div>
    </div>
  );
}

export default TrialTargetPage;
