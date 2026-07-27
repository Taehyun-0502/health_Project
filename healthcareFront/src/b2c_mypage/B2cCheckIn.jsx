import { useState, useEffect } from 'react';
import NavIcon from '../components/uiIcons.jsx';
import './B2cPages.css';

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
    <div className="b2c-page">
      <header className="b2c-page__header">
        <h2 className="b2c-page__title">출석 일지 (달력 보기)</h2>
        <p className="b2c-page__description">최근 30일 이내에 출석 완료된 날짜에 체크 표시가 찍힙니다.</p>
      </header>

      {/* 다가오는 PT 일정 안내 (담당 트레이너가 등록한 예정 수업, 조회 전용) */}
      {ptSchedules.length > 0 && (
        <section className="b2c-pt-card">
          <h3 className="b2c-pt-card__title">
            <NavIcon id="calendar" size={17} className="ui-icon" /> 다가오는 PT 일정
          </h3>
          <ul className="b2c-pt-card__list">
            {ptSchedules.map((schedule) => (
              <li key={schedule.scheduleId} className="b2c-pt-card__item">
                <span>
                  <b>{schedule.scheduleAt ? `${schedule.scheduleAt.substring(0, 10).replaceAll('-', '.')} ${schedule.scheduleAt.substring(11, 16)}` : '-'}</b>
                  {schedule.memo && <span className="b2c-pt-card__memo"> — {schedule.memo}</span>}
                </span>
                <span className="b2c-pt-card__trainer">{schedule.trainerName ? `${schedule.trainerName} 트레이너` : ''}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 달력 컨트롤러 헤더 */}
      <div className="b2c-calendar__header">
        <button onClick={handlePrevMonth} className="b2c-calendar__nav">&lt; 이전달</button>
        <span className="b2c-calendar__month">{year}년 {month + 1}월</span>
        <button onClick={handleNextMonth} className="b2c-calendar__nav">다음달 &gt;</button>
      </div>

      {/* 요일 구분 그리드 */}
      <div className="b2c-calendar__week">
        <div className="b2c-calendar__week--sun">일</div>
        <div>월</div>
        <div>화</div>
        <div>수</div>
        <div>목</div>
        <div>금</div>
        <div className="b2c-calendar__week--sat">토</div>
      </div>

      {/* 캘린더 날짜 바둑판 그리드 */}
      <div className="b2c-calendar__grid">
        {calendarCells.map((day, idx) => {
          if (day === null) {
            return <div key={`blank-${idx}`} className="b2c-calendar__blank" />;
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
              className={`b2c-calendar__day${isAttended ? ' is-attended' : ''}${isToday ? ' is-today' : ''}`}
            >
              {/* 날짜 숫자 표시 (출석일은 라임 도장 원형) */}
              <span className="b2c-calendar__date">
                {day}
              </span>

              {/* 출석 도장 뱃지 */}
              {isAttended && (
                <span className="b2c-calendar__stamp">
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
