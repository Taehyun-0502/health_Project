import { useState, useEffect } from 'react';

// B2C 일반 회원 마이페이지용 순수 캘린더 기반 출석 기록 조회 컴포넌트
function B2cCheckIn() {
  const [checkInList, setCheckInList] = useState([]);
  const [ptSchedules, setPtSchedules] = useState([]); // 다가오는 PT 일정 (트레이너가 등록, 조회 전용)
  const [currentDate, setCurrentDate] = useState(new Date()); // 현재 달력의 조회 기준일 상태
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // 본인 출석 기록 전체 조회 (캘린더 연동)
  const fetchCheckIn = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/checkin/list`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setCheckInList(data);
      } else {
        const errorText = await response.text();
        console.error('출석 기록 로드 실패:', errorText);
      }
    } catch (error) {
      console.error('출석 기록 조회 실패:', error);
    }
  };

  // 본인의 다가오는 PT 일정 조회 (담당 트레이너가 등록한 예정 수업)
  const fetchPtSchedules = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/fitc/attendance/schedule`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPtSchedules(data);
      } else {
        const errorText = await response.text();
        console.error('PT 일정 로드 실패:', errorText);
      }
    } catch (error) {
      console.error('PT 일정 조회 실패:', error);
    }
  };

  useEffect(() => {
    fetchCheckIn();
    fetchPtSchedules();
  }, []);

  // 조회 기준일의 연도와 월 획득
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 이전 달 및 다음 달 이동 핸들러
  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // 달력 그리드 연산을 위한 1일 요일 및 월 총 일수 계산
  const firstDay = new Date(year, month, 1).getDay(); // 1일의 요일 (0:일 ~ 6:토)
  const totalDays = new Date(year, month + 1, 0).getDate(); // 해당 월의 총 일수 (28~31)

  // 빈 칸 및 날짜 배열 조립
  const blanks = Array(firstDay).fill(null);
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);
  const calendarCells = [...blanks, ...days];

  // DB 출석일자를 비교용 YYYY-MM-DD 문자열 집합(Set)으로 가공
  const attendedDates = new Set(
    checkInList
      .filter((item) => item.checkIn)
      .map((item) => item.checkIn.substring(0, 10))
  );

  return (
    <div style={{ padding: '16px 16px 32px' }}>
      <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--gray-900)' }}>출석 일지 (달력 보기)</h3>
      <p style={{ fontSize: '13px', color: 'var(--gray-600)', marginBottom: '15px' }}>최근 30일 이내에 출석 완료된 날짜에 체크 표시가 찍힙니다.</p>

      {/* 다가오는 PT 일정 안내 (담당 트레이너가 등록한 예정 수업, 조회 전용) */}
      {ptSchedules.length > 0 && (
        <div style={{ marginBottom: '20px', padding: '12px', border: '1px solid var(--b2c-lime-line)', borderRadius: '12px', backgroundColor: 'var(--b2c-lime-bg)' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--b2c-accent)' }}>🗓️ 다가오는 PT 일정</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {ptSchedules.map((schedule) => (
              <li key={schedule.scheduleId} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 4px', borderBottom: '1px solid var(--b2c-lime-line)', fontSize: '13px' }}>
                <span>
                  <b>{schedule.scheduleAt ? `${schedule.scheduleAt.substring(0, 10).replaceAll('-', '.')} ${schedule.scheduleAt.substring(11, 16)}` : '-'}</b>
                  {schedule.memo && <span style={{ color: 'var(--gray-400)' }}> — {schedule.memo}</span>}
                </span>
                <span style={{ color: 'var(--gray-600)' }}>{schedule.trainerName ? `${schedule.trainerName} 트레이너` : ''}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 달력 컨트롤러 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <button onClick={handlePrevMonth} style={{ padding: '10px 14px', cursor: 'pointer', border: '1px solid var(--gray-300)', borderRadius: '10px', backgroundColor: 'var(--white)', color: 'var(--gray-700)', fontWeight: '600' }}>&lt; 이전달</button>
        <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--gray-900)' }}>{year}년 {month + 1}월</span>
        <button onClick={handleNextMonth} style={{ padding: '10px 14px', cursor: 'pointer', border: '1px solid var(--gray-300)', borderRadius: '10px', backgroundColor: 'var(--white)', color: 'var(--gray-700)', fontWeight: '600' }}>다음달 &gt;</button>
      </div>

      {/* 요일 구분 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px', marginBottom: '10px' }}>
        <div style={{ color: 'var(--danger-solid)' }}>일</div>
        <div>월</div>
        <div>화</div>
        <div>수</div>
        <div>목</div>
        <div>금</div>
        <div style={{ color: 'var(--b2c-accent)' }}>토</div>
      </div>

      {/* 캘린더 날짜 바둑판 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
        {calendarCells.map((day, idx) => {
          if (day === null) {
            return <div key={`blank-${idx}`} style={{ minHeight: '50px' }} />;
          }

          // 해당 일자의 날짜 문자열 완성 (포맷팅: YYYY-MM-DD)
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isAttended = attendedDates.has(dateStr); // 해당 일자에 출석 기록이 있는지 판단

          // 오늘 날짜 표시용 비교 (시각 표현 전용)
          const now = new Date();
          const isToday =
            now.getFullYear() === year && now.getMonth() === month && now.getDate() === day;

          return (
            <div
              key={`day-${day}`}
              style={{
                minHeight: '50px',
                border: '1px solid var(--gray-200)',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isAttended ? 'var(--b2c-lime-bg)' : 'var(--gray-50)', // 출석한 날은 라임 하이라이트 처리
                outline: isToday ? '2px solid var(--b2c-accent)' : 'none',
                outlineOffset: isToday ? '-2px' : undefined,
                transition: 'all 0.2s',
                position: 'relative'
              }}
            >
              {/* 날짜 숫자 표시 (출석일은 라임 도장 원형) */}
              <span style={{
                fontSize: '12px',
                fontWeight: isAttended ? 'bold' : 'normal',
                color: isAttended ? 'var(--white)' : 'var(--gray-900)',
                backgroundColor: isAttended ? 'var(--b2c-accent)' : 'transparent',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {day}
              </span>

              {/* 출석 도장 뱃지 */}
              {isAttended && (
                <span style={{
                  fontSize: '9px',
                  color: 'var(--b2c-accent)',
                  padding: '2px 4px',
                  borderRadius: '999px',
                  marginTop: '2px',
                  fontWeight: 'bold'
                }}>
                  출석
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default B2cCheckIn;
