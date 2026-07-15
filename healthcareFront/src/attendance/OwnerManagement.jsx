import { useState, useEffect } from 'react';

// 사장님 전용 지점 회원·직원 관리 컴포넌트 (AdminMain 회원/직원 관리 탭에 내장)
// 1) 트레이너별 성과 보드  2) 재등록 임박 리스트(PT+이용권)  3) 지점 PT 일정 캘린더(읽기 전용)
// gymId prop이 있으면 해당 매장을 조회(총괄 관리자의 매장 드릴다운용), 없으면 본인 지점
function OwnerManagement({ onGoPromotion, gymId }) {
  const [trainers, setTrainers] = useState([]);
  const [rebooks, setRebooks] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date()); // 캘린더 조회 기준일
  const [selectedDate, setSelectedDate] = useState(null); // 클릭으로 선택한 날짜 (YYYY-MM-DD)

  // 지점 관리 현황 통합 조회 (트레이너 성과 / 재등록 / 일정 / 수업 이력)
  // gymId prop이 있으면(총괄 관리자 드릴다운) 해당 매장 지정 조회
  const fetchOverview = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      const query = gymId ? `?gymId=${gymId}` : '';
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/fitb/attendance/owner/overview${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setTrainers(data.trainers || []);
        setRebooks(data.rebooks || []);
        setSchedules(data.schedules || []);
        setSessions(data.sessions || []);
      } else {
        console.error('지점 현황 로드 실패:', await response.text());
      }
    } catch (error) {
      console.error('지점 현황 조회 실패:', error);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [gymId]); // 드릴다운 대상 매장이 바뀌면 재조회

  // ===== 캘린더 연산 (트레이너 캘린더와 동일 방식) =====
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => { setCurrentDate(new Date(year, month - 1, 1)); setSelectedDate(null); };
  const handleNextMonth = () => { setCurrentDate(new Date(year, month + 1, 1)); setSelectedDate(null); };

  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const calendarCells = [...Array(firstDay).fill(null), ...Array.from({ length: totalDays }, (_, i) => i + 1)];

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const groupByDate = (list, dateField) => list.reduce((acc, item) => {
    if (!item[dateField]) return acc;
    const dateStr = item[dateField].substring(0, 10);
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(item);
    return acc;
  }, {});

  const sessionsByDate = groupByDate(sessions, 'checkIn');
  const schedulesByDate = groupByDate(schedules, 'scheduleAt');

  // 일정-출석 매칭 (같은 날짜 + 같은 회원, 트레이너 화면과 동일 규칙)
  const matchDay = (dateStr) => {
    const daySessions = sessionsByDate[dateStr] || [];
    const daySchedules = schedulesByDate[dateStr] || [];

    const items = daySchedules.map((schedule) => {
      const session = daySessions.find((s) => String(s.username) === String(schedule.username));
      const status = session ? 'done' : (dateStr < todayStr ? 'missed' : 'planned');
      return { schedule, session, status };
    });

    const matchedUsernames = new Set(items.filter((i) => i.session).map((i) => String(i.schedule.username)));
    const walkIns = daySessions.filter((s) => !matchedUsernames.has(String(s.username)));

    return { items, walkIns };
  };

  const selected = selectedDate ? matchDay(selectedDate) : null;

  const statusMeta = {
    done: { label: '✅ 완료', color: '#6d28d9' },
    planned: { label: '🕒 예정', color: '#15803d' },
    missed: { label: '❌ 미수행', color: '#b91c1c' },
  };

  return (
    <div style={{ maxWidth: '750px', margin: '0 auto', padding: '20px' }}>

      {/* ===== 1. 트레이너별 성과 보드 ===== */}
      <h3>🏋️ 트레이너별 성과</h3>
      <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>
        우리 지점 트레이너의 담당 회원 수와 이번 달 수업 실적입니다. 수행률 = 완료 / (완료 + 미수행).
      </p>

      <button onClick={fetchOverview} style={{ marginBottom: '15px', padding: '6px 14px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fff' }}>
        🔄 새로고침
      </button>

      {trainers.length === 0 ? (
        <p style={{ padding: '30px', textAlign: 'center', color: '#999', border: '1px dashed #ddd', borderRadius: '8px' }}>
          지점에 소속된 트레이너가 없습니다.
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>트레이너</th>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>담당 회원</th>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>이번 달 수업</th>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>수행률</th>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>재등록 임박</th>
            </tr>
          </thead>
          <tbody>
            {trainers.map((trainer) => {
              const done = trainer.monthDone || 0;
              const missed = trainer.monthMissed || 0;
              const rate = done + missed > 0 ? Math.round((done / (done + missed)) * 100) : null;
              return (
                <tr key={trainer.username}>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center', fontWeight: 'bold' }}>
                    {trainer.name}<br /><span style={{ fontSize: '11px', fontWeight: 'normal', color: '#888' }}>{trainer.username}</span>
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{trainer.memberCount || 0}명</td>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                    {done}건{missed > 0 && <span style={{ fontSize: '11px', color: '#b91c1c' }}> (미수행 {missed})</span>}
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center', fontWeight: 'bold', color: rate == null ? '#999' : rate >= 90 ? '#15803d' : rate >= 70 ? '#d97706' : '#b91c1c' }}>
                    {rate != null ? `${rate}%` : '-'}
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                    {(trainer.rebookCount || 0) > 0 ? (
                      <span style={{ fontSize: '11px', backgroundColor: '#f59e0b', color: '#fff', padding: '3px 8px', borderRadius: '10px', fontWeight: 'bold' }}>{trainer.rebookCount}명</span>
                    ) : (
                      <span style={{ color: '#999' }}>-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* ===== 2. 재등록 임박 리스트 (PT + 이용권) ===== */}
      <hr style={{ margin: '30px 0', border: 'none', borderTop: '1px solid #eee' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>⏰ 재등록 임박 회원</h3>
        <button onClick={() => onGoPromotion && onGoPromotion()}
          style={{ padding: '7px 14px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', border: 'none', borderRadius: '4px', backgroundColor: '#f59e0b', color: '#fff' }}>
          🎟️ 프로모션(쿠폰) 발행하러 가기
        </button>
      </div>
      <p style={{ fontSize: '13px', color: '#666', margin: '8px 0 15px 0' }}>
        PT 잔여 3회 이하 또는 이용권 종료 7일 이내인 회원입니다. 쿠폰 발행으로 재등록을 유도해 보세요.
      </p>

      {rebooks.length === 0 ? (
        <p style={{ padding: '30px', textAlign: 'center', color: '#999', border: '1px dashed #ddd', borderRadius: '8px' }}>
          재등록 임박 회원이 없습니다.
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>구분</th>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>회원명</th>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>전화번호</th>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>담당 트레이너</th>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>남은 상태</th>
            </tr>
          </thead>
          <tbody>
            {rebooks.map((rebook) => {
              const isPt = rebook.category === 'PT';
              // 이용권은 종료일까지 남은 일수(D-day) 계산
              const dday = rebook.endDate ? Math.ceil((new Date(rebook.endDate) - new Date(todayStr)) / 86400000) : null;
              return (
                <tr key={`${rebook.category}-${rebook.dataId}`}>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', backgroundColor: isPt ? '#7c3aed' : '#0284c7', color: '#fff', padding: '3px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                      {rebook.category}
                    </span>
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center', fontWeight: 'bold' }}>{rebook.memberName || '-'}</td>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{rebook.username}</td>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{rebook.trainerName || '-'}</td>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center', fontWeight: 'bold', color: '#d97706' }}>
                    {isPt
                      ? `잔여 ${rebook.remainingCount}회`
                      : `종료 ${rebook.endDate} (D-${dday})`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* ===== 3. 지점 PT 일정 캘린더 (읽기 전용) ===== */}
      <hr style={{ margin: '30px 0', border: 'none', borderTop: '1px solid #eee' }} />
      <h3>📅 지점 PT 일정 (전체 트레이너)</h3>
      <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>
        지점의 모든 트레이너 일정과 수행 결과를 열람합니다. 등록/삭제는 각 트레이너가 직접 합니다.
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <button onClick={handlePrevMonth} style={{ padding: '6px 12px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fff' }}>&lt; 이전달</button>
        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{year}년 {month + 1}월</span>
        <button onClick={handleNextMonth} style={{ padding: '6px 12px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fff' }}>다음달 &gt;</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px', marginBottom: '10px' }}>
        <div style={{ color: 'red' }}>일</div>
        <div>월</div>
        <div>화</div>
        <div>수</div>
        <div>목</div>
        <div>금</div>
        <div style={{ color: 'blue' }}>토</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
        {calendarCells.map((day, idx) => {
          if (day === null) {
            return <div key={`blank-${idx}`} style={{ minHeight: '62px' }} />;
          }

          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const { items, walkIns } = matchDay(dateStr);
          const doneCount = items.filter((i) => i.status === 'done').length + walkIns.length;
          const plannedCount = items.filter((i) => i.status === 'planned').length;
          const missedCount = items.filter((i) => i.status === 'missed').length;
          const isSelected = selectedDate === dateStr;

          return (
            <div
              key={`day-${day}`}
              onClick={() => setSelectedDate(isSelected ? null : dateStr)}
              style={{
                minHeight: '62px',
                border: isSelected ? '2px solid #0284c7' : '1px solid #eee',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                backgroundColor: doneCount > 0 ? '#f3e8ff' : plannedCount > 0 ? '#f0fdf4' : missedCount > 0 ? '#fef2f2' : '#fafafa',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: doneCount + plannedCount + missedCount > 0 ? 'bold' : 'normal', color: '#333' }}>{day}</span>
              {doneCount > 0 && <span style={{ fontSize: '9px', backgroundColor: '#7c3aed', color: '#fff', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>완료 {doneCount}</span>}
              {plannedCount > 0 && <span style={{ fontSize: '9px', backgroundColor: '#16a34a', color: '#fff', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>예정 {plannedCount}</span>}
              {missedCount > 0 && <span style={{ fontSize: '9px', backgroundColor: '#dc2626', color: '#fff', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>미수행 {missedCount}</span>}
            </div>
          );
        })}
      </div>

      {/* 선택한 날짜의 상세 (트레이너 이름 포함, 열람 전용) */}
      {selectedDate && selected && (
        <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fcfcfc' }}>
          <h4 style={{ margin: '0 0 12px 0' }}>{selectedDate.replaceAll('-', '.')}</h4>

          {selected.items.length === 0 && selected.walkIns.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>이 날짜에는 수업/일정이 없습니다.</p>
          ) : (
            <>
              {selected.items.map(({ schedule, session, status }) => (
                <p key={`p-${schedule.scheduleId}`} style={{ margin: '4px 0', fontSize: '14px', color: '#444' }}>
                  <span style={{ fontWeight: 'bold', color: statusMeta[status].color, marginRight: '8px' }}>{statusMeta[status].label}</span>
                  <b>{schedule.scheduleAt ? schedule.scheduleAt.substring(11, 16) : '-'}</b>{' '}
                  {schedule.memberName || schedule.username}
                  <span style={{ color: '#0284c7', fontSize: '12px' }}> — {schedule.trainerName || schedule.trainerId} 트레이너</span>
                  {session && (
                    <span style={{ color: '#6d28d9', fontSize: '12px' }}> (출석 {session.checkIn.substring(11, 16)}{session.trainerConfirm ? ` / 확인 ${session.trainerConfirm.substring(11, 16)}` : ''})</span>
                  )}
                </p>
              ))}
              {selected.walkIns.map((session) => (
                <p key={`s-${session.id}`} style={{ margin: '4px 0', fontSize: '14px', color: '#444' }}>
                  <span style={{ fontWeight: 'bold', color: '#6d28d9', marginRight: '8px' }}>📌 일정 외</span>
                  <b>{session.checkIn.substring(11, 16)}</b>{' '}
                  {session.memberName || session.username}
                  <span style={{ color: '#0284c7', fontSize: '12px' }}> — {session.trainerName || session.trainerId} 트레이너</span>
                </p>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default OwnerManagement;
