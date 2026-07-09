import { useState, useEffect } from 'react';

// B2C 일반 회원 마이페이지용 순수 캘린더 기반 출석 기록 조회 컴포넌트
function B2cCheckIn() {
  const [checkInList, setCheckInList] = useState([]);
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

  useEffect(() => {
    fetchCheckIn();
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
    <div style={{ maxWidth: '450px', margin: '0 auto', padding: '10px' }}>
      <h3>출석 일지 (달력 보기)</h3>
      <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>최근 30일 이내에 출석 완료된 날짜에 체크 표시가 찍힙니다.</p>

      {/* 달력 컨트롤러 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <button onClick={handlePrevMonth} style={{ padding: '6px 12px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fff' }}>&lt; 이전달</button>
        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{year}년 {month + 1}월</span>
        <button onClick={handleNextMonth} style={{ padding: '6px 12px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fff' }}>다음달 &gt;</button>
      </div>

      {/* 요일 구분 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px', marginBottom: '10px' }}>
        <div style={{ color: 'red' }}>일</div>
        <div>월</div>
        <div>화</div>
        <div>수</div>
        <div>목</div>
        <div>금</div>
        <div style={{ color: 'blue' }}>토</div>
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

          return (
            <div
              key={`day-${day}`}
              style={{
                minHeight: '50px',
                border: '1px solid #eee',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isAttended ? '#e0f2fe' : '#fafafa', // 출석한 날은 이쁜 하늘색 처리
                transition: 'all 0.2s',
                position: 'relative'
              }}
            >
              {/* 날짜 숫자 표시 */}
              <span style={{ fontSize: '12px', fontWeight: isAttended ? 'bold' : 'normal', color: isAttended ? '#0369a1' : '#333' }}>
                {day}
              </span>

              {/* 출석 도장 뱃지 */}
              {isAttended && (
                <span style={{
                  fontSize: '9px',
                  backgroundColor: '#0284c7',
                  color: '#fff',
                  padding: '2px 4px',
                  borderRadius: '4px',
                  marginTop: '4px',
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
