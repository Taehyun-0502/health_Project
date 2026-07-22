import { useState, useEffect, useRef } from 'react';

// 트레이너 전용 PT 출석/일정 관리 컴포넌트 (AdminMain 회원/직원 관리 탭에 내장)
// 1) 당일 미확인 PT 출석 확인(확인 시 잔여횟수 1회 차감)
// 2) PT 캘린더: 일정 칸에 진행 결과가 채워지는 구조
//    - 일정과 확인된 출석을 "같은 날짜 + 같은 회원"으로 매칭해 예정/완료/미수행 상태로 표시
function AttendanceConfirm() {
  const [pendingList, setPendingList] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  const [scheduleList, setScheduleList] = useState([]);
  const [myMembers, setMyMembers] = useState([]); // 일정 등록 폼의 담당 회원 선택 목록
  const [memberStatus, setMemberStatus] = useState([]); // 담당 회원 현황 (계약별 총/사용/잔여)
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date()); // 캘린더 조회 기준일
  const [selectedDate, setSelectedDate] = useState(null); // 클릭으로 선택한 날짜 (YYYY-MM-DD)
  const [selectedMember, setSelectedMember] = useState(null); // 현황에서 클릭한 회원 (드릴다운용, username 문자열)
  const [activeTab, setActiveTab] = useState('members'); // members(담당 회원) | schedule(일정 관리)
  const scheduleFormRef = useRef(null);

  const token = localStorage.getItem('accessToken');

  // 공통 GET 헬퍼 (실패 시 콘솔 로그만)
  const fetchJson = async (path, setter, label) => {
    if (!token) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setter(await response.json());
      } else {
        console.error(`${label} 로드 실패:`, await response.text());
      }
    } catch (error) {
      console.error(`${label} 조회 실패:`, error);
    }
  };

  const fetchPending = () => fetchJson('/fitb/attendance/pending', setPendingList, '대기 목록');
  const fetchHistory = () => fetchJson('/fitb/attendance/history', setHistoryList, '수업 이력');
  const fetchSchedule = () => fetchJson('/fitb/attendance/schedule', setScheduleList, '일정 목록');
  const fetchMyMembers = () => fetchJson('/fitb/attendance/members', setMyMembers, '담당 회원');
  const fetchMemberStatus = () => fetchJson('/fitb/attendance/members/status', setMemberStatus, '회원 현황');

  const fetchAll = () => {
    fetchPending();
    fetchHistory();
    fetchSchedule();
    fetchMemberStatus(); // 출석 확인 시 잔여횟수가 변하므로 현황도 함께 갱신
  };

  useEffect(() => {
    fetchAll();
    fetchMyMembers();
  }, []);

  // 출석 확인 처리 핸들러 - 성공 시 잔여횟수 안내 후 목록 일괄 갱신 (일정 칸도 완료로 채워짐)
  const handleConfirm = async (row) => {
    if (loading) return;
    if (!window.confirm(`${row.memberName || row.username}님의 PT 출석을 확인하시겠습니까?\n확인 시 잔여 횟수가 1회 차감됩니다.`)) return;

    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/fitb/attendance/confirm/${row.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        alert(`출석 확인 완료! 잔여 PT 횟수: ${data.remainingCount}회`);
      } else {
        alert((await response.text()) || '출석 확인에 실패했습니다.');
      }
    } catch (error) {
      console.error('출석 확인 오류:', error);
      alert('서버와의 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      fetchAll();
    }
  };

  // 일정 등록 핸들러 - 선택한 날짜 + 폼의 회원/시간/메모로 등록
  const handleScheduleAdd = async (e) => {
    e.preventDefault();
    if (loading || !selectedDate) return;

    const formData = new FormData(scheduleFormRef.current);
    const data = Object.fromEntries(formData.entries());
    if (!data.username || !data.time) {
      alert('회원과 시간을 선택해 주세요.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/fitb/attendance/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          username: parseInt(data.username, 10),
          scheduleAt: `${selectedDate}T${data.time}:00`,
          memo: data.memo || null,
        }),
      });
      if (response.ok) {
        alert('일정이 등록되었습니다.');
        scheduleFormRef.current.reset();
        fetchSchedule();
      } else {
        alert((await response.text()) || '일정 등록에 실패했습니다.');
      }
    } catch (error) {
      console.error('일정 등록 오류:', error);
      alert('서버와의 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 일정 삭제 핸들러
  const handleScheduleDelete = async (schedule) => {
    if (loading) return;
    if (!window.confirm(`${schedule.memberName || schedule.username}님의 ${schedule.scheduleAt?.substring(11, 16)} 일정을 삭제하시겠습니까?`)) return;

    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/fitb/attendance/schedule/${schedule.scheduleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        fetchSchedule();
      } else {
        alert((await response.text()) || '일정 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('일정 삭제 오류:', error);
      alert('서버와의 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // ===== 캘린더 연산 (B2cCheckIn 캘린더와 동일 방식) =====
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => { setCurrentDate(new Date(year, month - 1, 1)); setSelectedDate(null); };
  const handleNextMonth = () => { setCurrentDate(new Date(year, month + 1, 1)); setSelectedDate(null); };

  const firstDay = new Date(year, month, 1).getDay(); // 1일의 요일 (0:일 ~ 6:토)
  const totalDays = new Date(year, month + 1, 0).getDate(); // 해당 월의 총 일수
  const blanks = Array(firstDay).fill(null);
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);
  const calendarCells = [...blanks, ...days];

  // 오늘 날짜 문자열 (미수행 판정 기준)
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // 날짜(YYYY-MM-DD)별 그룹핑 - 완료 수업 / 일정
  const groupByDate = (list, dateField) => list.reduce((acc, item) => {
    if (!item[dateField]) return acc;
    const dateStr = item[dateField].substring(0, 10);
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(item);
    return acc;
  }, {});

  const sessionsByDate = groupByDate(historyList, 'checkIn');
  const schedulesByDate = groupByDate(scheduleList, 'scheduleAt');

  // 특정 날짜의 일정-출석 매칭 결과 계산
  // 일정마다: 같은 날 같은 회원의 확인된 출석이 있으면 '완료', 없으면 미래='예정' / 과거='미수행'
  // 어떤 일정과도 매칭되지 않은 출석은 '일정 외 진행 수업'으로 분리
  const matchDay = (dateStr) => {
    const sessions = sessionsByDate[dateStr] || [];
    const schedules = schedulesByDate[dateStr] || [];

    const items = schedules.map((schedule) => {
      const session = sessions.find((s) => String(s.username) === String(schedule.username));
      const status = session ? 'done' : (dateStr < todayStr ? 'missed' : 'planned');
      return { schedule, session, status };
    });

    const matchedUsernames = new Set(items.filter((i) => i.session).map((i) => String(i.schedule.username)));
    const walkIns = sessions.filter((s) => !matchedUsernames.has(String(s.username)));

    return { items, walkIns };
  };

  const selected = selectedDate ? matchDay(selectedDate) : null;

  // ===== 1단계 부가 지표 연산 (전부 이미 로드된 목록에서 파생 - 추가 API 없음) =====

  // 회원별 마지막 수업일 (본인이 확인 완료한 수업 기준)
  const lastSessionByMember = historyList.reduce((acc, session) => {
    if (!session.checkIn) return acc;
    const key = String(session.username);
    if (!acc[key] || session.checkIn > acc[key]) acc[key] = session.checkIn;
    return acc;
  }, {});

  // 마지막 수업으로부터 경과일 계산
  const daysSince = (dateTimeStr) => Math.floor((new Date(todayStr) - new Date(dateTimeStr.substring(0, 10))) / 86400000);

  // 특정 일정이 미수행(날짜 경과 + 매칭 출석 없음)인지 판정
  const isMissedSchedule = (schedule) => {
    if (!schedule.scheduleAt) return false;
    const dateStr = schedule.scheduleAt.substring(0, 10);
    if (dateStr >= todayStr) return false;
    const sessions = sessionsByDate[dateStr] || [];
    return !sessions.some((s) => String(s.username) === String(schedule.username));
  };

  // 캘린더 표시 월 기준 실적 집계 (수업 건수 / 미수행 / 수행률 / 전월 대비)
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const prevMonthDate = new Date(year, month - 1, 1);
  const prevMonthPrefix = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

  const monthDone = historyList.filter((s) => s.checkIn && s.checkIn.startsWith(monthPrefix)).length;
  const prevMonthDone = historyList.filter((s) => s.checkIn && s.checkIn.startsWith(prevMonthPrefix)).length;
  const monthMissed = scheduleList.filter((sc) => sc.scheduleAt && sc.scheduleAt.startsWith(monthPrefix) && isMissedSchedule(sc)).length;
  const performRate = monthDone + monthMissed > 0 ? Math.round((monthDone / (monthDone + monthMissed)) * 100) : null;
  const diffFromPrev = monthDone - prevMonthDone;

  // 드릴다운 대상 회원의 데이터 모음
  const drill = selectedMember ? {
    contracts: memberStatus.filter((r) => String(r.username) === selectedMember),
    sessions: historyList.filter((s) => String(s.username) === selectedMember),
    upcoming: scheduleList
      .filter((sc) => String(sc.username) === selectedMember && sc.scheduleAt && sc.scheduleAt.substring(0, 10) >= todayStr)
      .sort((a, b) => (a.scheduleAt > b.scheduleAt ? 1 : -1)),
    missed: scheduleList.filter((sc) => String(sc.username) === selectedMember && isMissedSchedule(sc)),
  } : null;
  const drillName = drill
    ? (drill.contracts[0]?.memberName || drill.sessions[0]?.memberName || selectedMember)
    : null;

  // 일정 상태별 표기 상수
  const statusMeta = {
    done: { label: '✅ 완료', color: '#6d28d9', bg: '#f3e8ff', border: '#e9d5ff' },
    planned: { label: '🕒 예정', color: '#15803d', bg: '#f0fdf4', border: '#dcfce7' },
    missed: { label: '❌ 미수행', color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
  };

  const tabs = [
    { key: 'members', label: '담당 회원' },
    { key: 'schedule', label: '일정 관리' },
  ];

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '20px' }}>

      {/* ===== 탭바 ===== */}
      <div role="tablist" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '7px 16px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer',
              borderRadius: '999px', border: '1px solid ' + (activeTab === tab.key ? '#171717' : '#d4d4d4'),
              backgroundColor: activeTab === tab.key ? '#171717' : '#fff',
              color: activeTab === tab.key ? '#fff' : '#525252',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== 담당 회원 탭 (담당 회원 현황) ===== */}
      {activeTab === 'members' && (
      <div role="tabpanel">

      {/* ===== 담당 회원 현황 섹션 - 유효 PT 계약별 총/사용/잔여, 잔여 적은 순 ===== */}
      <h3>👥 담당 회원 현황</h3>
      <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>
        담당 중인 유효 PT 계약별 잔여 횟수입니다. 잔여가 적은 회원이 위로 정렬되며, 3회 이하는 재등록 제안 대상으로 표시됩니다.
      </p>

      {memberStatus.length === 0 ? (
        <p style={{ padding: '30px', textAlign: 'center', color: '#999', border: '1px dashed #ddd', borderRadius: '8px' }}>
          담당 중인 유효 PT 계약이 없습니다.
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>회원명</th>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>전화번호</th>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>진행 현황</th>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>잔여</th>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>최근 수업</th>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>계약 기간</th>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>상태</th>
            </tr>
          </thead>
          <tbody>
            {memberStatus.map((row) => {
              const total = row.totalCount || 0;
              const used = row.usedCount || 0;
              const remaining = row.remainingCount != null ? row.remainingCount : total - used;
              const percent = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
              const isLow = remaining > 0 && remaining <= 3; // 재등록 제안 대상
              const isDone = remaining <= 0; // 전부 소진 (계약 중지 대기)

              // 최근 수업일 및 경과일 - 14일 이상이면 관리 필요 회원으로 강조
              const lastSession = lastSessionByMember[String(row.username)];
              const elapsed = lastSession ? daysSince(lastSession) : null;
              const needCare = !isDone && (elapsed == null ? false : elapsed >= 14);

              return (
                <tr key={row.dataId}>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                    {/* 회원명 클릭 시 하단에 상세 드릴다운 패널 표시 */}
                    <button
                      onClick={() => setSelectedMember(selectedMember === String(row.username) ? null : String(row.username))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', color: '#2563eb', textDecoration: 'underline', padding: 0 }}>
                      {row.memberName || '-'}
                    </button>
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{row.username}</td>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb' }}>
                    {/* 사용/총 진행 바 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${percent}%`, height: '100%', backgroundColor: isDone ? '#9ca3af' : isLow ? '#f59e0b' : '#7c3aed', transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ fontSize: '12px', color: '#666', whiteSpace: 'nowrap' }}>{used} / {total}회</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center', fontWeight: 'bold', color: isDone ? '#9ca3af' : isLow ? '#d97706' : '#6d28d9' }}>
                    {remaining}회
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center', fontSize: '12px', color: needCare ? '#b91c1c' : '#666' }}>
                    {lastSession ? (
                      <>
                        {lastSession.substring(0, 10)}<br />
                        <b>({elapsed === 0 ? '오늘' : `${elapsed}일 전`})</b>
                        {needCare && (
                          <span style={{ display: 'inline-block', marginLeft: '4px', fontSize: '10px', backgroundColor: '#dc2626', color: '#fff', padding: '1px 6px', borderRadius: '8px', fontWeight: 'bold' }}>
                            관리 필요
                          </span>
                        )}
                      </>
                    ) : (
                      <span style={{ color: '#999' }}>수업 이력 없음</span>
                    )}
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center', fontSize: '12px', color: '#666' }}>
                    {row.startDate || '-'} ~ {row.endDate || '무기한'}
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                    {isDone ? (
                      <span style={{ fontSize: '11px', backgroundColor: '#6b7280', color: '#fff', padding: '3px 8px', borderRadius: '10px', fontWeight: 'bold' }}>소진 완료</span>
                    ) : isLow ? (
                      <span style={{ fontSize: '11px', backgroundColor: '#f59e0b', color: '#fff', padding: '3px 8px', borderRadius: '10px', fontWeight: 'bold' }}>재등록 제안</span>
                    ) : (
                      <span style={{ fontSize: '11px', backgroundColor: '#e5e7eb', color: '#374151', padding: '3px 8px', borderRadius: '10px' }}>진행 중</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* 회원 상세 드릴다운 패널 - 현황에서 회원명 클릭 시 표시 */}
      {drill && (
        <div style={{ marginTop: '15px', padding: '15px', border: '2px solid #bfdbfe', borderRadius: '8px', backgroundColor: '#eff6ff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, color: '#1d4ed8' }}>🔍 {drillName}님 상세</h4>
            <button onClick={() => setSelectedMember(null)}
              style={{ padding: '3px 10px', fontSize: '12px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fff' }}>
              닫기 ✕
            </button>
          </div>

          {/* 계약별 진행 현황 */}
          <div style={{ marginBottom: '12px' }}>
            <h5 style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#374151' }}>📋 계약 진행</h5>
            {drill.contracts.map((contract) => {
              const total = contract.totalCount || 0;
              const used = contract.usedCount || 0;
              return (
                <p key={contract.dataId} style={{ margin: '2px 0', fontSize: '13px', color: '#444' }}>
                  계약 #{contract.dataId} — {used} / {total}회 사용, <b>잔여 {contract.remainingCount}회</b>
                  <span style={{ color: '#888', fontSize: '12px' }}> ({contract.startDate || '-'} ~ {contract.endDate || '무기한'})</span>
                </p>
              );
            })}
          </div>

          {/* 예정 일정 */}
          <div style={{ marginBottom: '12px' }}>
            <h5 style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#15803d' }}>🕒 예정 일정 ({drill.upcoming.length}건)</h5>
            {drill.upcoming.length === 0 ? (
              <p style={{ margin: 0, fontSize: '13px', color: '#999' }}>예정된 일정이 없습니다. 캘린더에서 다음 수업을 잡아주세요.</p>
            ) : (
              drill.upcoming.map((schedule) => (
                <p key={schedule.scheduleId} style={{ margin: '2px 0', fontSize: '13px', color: '#444' }}>
                  {schedule.scheduleAt.substring(0, 10).replaceAll('-', '.')} {schedule.scheduleAt.substring(11, 16)}
                  {schedule.memo && <span style={{ color: '#888', fontSize: '12px' }}> — {schedule.memo}</span>}
                </p>
              ))
            )}
          </div>

          {/* 노쇼(미수행) 이력 */}
          {drill.missed.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <h5 style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#b91c1c' }}>❌ 미수행 일정 ({drill.missed.length}건)</h5>
              {drill.missed.map((schedule) => (
                <p key={schedule.scheduleId} style={{ margin: '2px 0', fontSize: '13px', color: '#b91c1c' }}>
                  {schedule.scheduleAt.substring(0, 10).replaceAll('-', '.')} {schedule.scheduleAt.substring(11, 16)}
                  {schedule.memo && <span style={{ fontSize: '12px' }}> — {schedule.memo}</span>}
                </p>
              ))}
            </div>
          )}

          {/* 수업 이력 타임라인 (최근 10건) */}
          <div>
            <h5 style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#6d28d9' }}>✅ 수업 이력 (최근 {Math.min(drill.sessions.length, 10)}건 / 총 {drill.sessions.length}건)</h5>
            {drill.sessions.length === 0 ? (
              <p style={{ margin: 0, fontSize: '13px', color: '#999' }}>아직 진행한 수업이 없습니다.</p>
            ) : (
              drill.sessions.slice(0, 10).map((session) => (
                <p key={session.id} style={{ margin: '2px 0', fontSize: '13px', color: '#444' }}>
                  {session.checkIn.substring(0, 10).replaceAll('-', '.')} — 출석 {session.checkIn.substring(11, 16)}
                  {session.trainerConfirm ? ` / 확인 ${session.trainerConfirm.substring(11, 16)}` : ''}
                </p>
              ))
            )}
          </div>
        </div>
      )}

      </div>
      )}

      {/* ===== 일정 관리 탭 (PT 출석 확인 + PT 캘린더 = 일정 + 수행 결과 통합) ===== */}
      {activeTab === 'schedule' && (
      <div role="tabpanel">

      {/* ===== 당일 PT 출석 확인 섹션 ===== */}
      <h3>🤝 PT 출석 확인</h3>
      <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>
        오늘 접수된 담당 회원의 PT 출석 목록입니다. 확인 버튼을 누르면 해당 회원의 잔여 PT 횟수가 1회 차감되고, 그날 일정이 있으면 완료로 채워집니다.
      </p>

      <button onClick={fetchAll} style={{ marginBottom: '15px', padding: '6px 14px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fff' }}>
        🔄 새로고침
      </button>

      {pendingList.length === 0 ? (
        <p style={{ padding: '30px', textAlign: 'center', color: '#999', border: '1px dashed #ddd', borderRadius: '8px' }}>
          확인 대기 중인 PT 출석이 없습니다.
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>회원명</th>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>전화번호</th>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>출석 시간</th>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>잔여 횟수</th>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>처리</th>
            </tr>
          </thead>
          <tbody>
            {pendingList.map((row) => (
              <tr key={row.id}>
                <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{row.memberName || '-'}</td>
                <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{row.username}</td>
                <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                  {row.checkIn ? row.checkIn.substring(11, 16) : '-'}
                </td>
                <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                  {row.remainingCount != null ? `${row.remainingCount}회` : '-'}
                </td>
                <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                  <button onClick={() => handleConfirm(row)} disabled={loading}
                    style={{ padding: '6px 14px', cursor: 'pointer', border: 'none', borderRadius: '4px', backgroundColor: '#7c3aed', color: '#fff', fontWeight: 'bold' }}>
                    출석 확인
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ===== 내 PT 캘린더 섹션 ===== */}
      <hr style={{ margin: '30px 0', border: 'none', borderTop: '1px solid #eee' }} />
      <h3>📅 내 PT 캘린더</h3>
      <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>
        등록한 일정이 수행되면 <span style={{ color: '#6d28d9', fontWeight: 'bold' }}>완료</span>로 채워집니다.
        지나간 일정에 출석이 없으면 <span style={{ color: '#b91c1c', fontWeight: 'bold' }}>미수행</span>으로 표시됩니다.
        날짜를 클릭하면 상세 확인 및 일정 등록이 가능합니다.
      </p>

      {/* 월간 실적 요약 카드 - 캘린더 표시 월 기준 (달 이동 시 함께 갱신) */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <div style={{ flex: 1, padding: '12px', border: '1px solid #e9d5ff', borderRadius: '8px', backgroundColor: '#faf5ff', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#6d28d9', fontWeight: 'bold' }}>이번 달 수업</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#6d28d9' }}>{monthDone}건</div>
          <div style={{ fontSize: '11px', color: diffFromPrev > 0 ? '#15803d' : diffFromPrev < 0 ? '#b91c1c' : '#888' }}>
            지난달 대비 {diffFromPrev > 0 ? `+${diffFromPrev}` : diffFromPrev}건
          </div>
        </div>
        <div style={{ flex: 1, padding: '12px', border: '1px solid #bbf7d0', borderRadius: '8px', backgroundColor: '#f0fdf4', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#15803d', fontWeight: 'bold' }}>수행률</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#15803d' }}>{performRate != null ? `${performRate}%` : '-'}</div>
          <div style={{ fontSize: '11px', color: '#888' }}>완료 {monthDone} / 미수행 {monthMissed}</div>
        </div>
        <div style={{ flex: 1, padding: '12px', border: '1px solid #dbeafe', borderRadius: '8px', backgroundColor: '#eff6ff', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: 'bold' }}>담당 회원</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#1d4ed8' }}>{myMembers.length}명</div>
          <div style={{ fontSize: '11px', color: '#888' }}>유효 계약 {memberStatus.length}건</div>
        </div>
      </div>

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

      {/* 캘린더 날짜 그리드 - 모든 날짜 클릭 가능 (빈 날도 일정 등록을 위해) */}
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
          const hasAny = doneCount + plannedCount + missedCount > 0;

          return (
            <div
              key={`day-${day}`}
              onClick={() => setSelectedDate(isSelected ? null : dateStr)}
              style={{
                minHeight: '62px',
                border: isSelected ? '2px solid #7c3aed' : '1px solid #eee',
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
              <span style={{ fontSize: '12px', fontWeight: hasAny ? 'bold' : 'normal', color: '#333' }}>
                {day}
              </span>

              {doneCount > 0 && (
                <span style={{ fontSize: '9px', backgroundColor: '#7c3aed', color: '#fff', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>
                  완료 {doneCount}
                </span>
              )}
              {plannedCount > 0 && (
                <span style={{ fontSize: '9px', backgroundColor: '#16a34a', color: '#fff', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>
                  예정 {plannedCount}
                </span>
              )}
              {missedCount > 0 && (
                <span style={{ fontSize: '9px', backgroundColor: '#dc2626', color: '#fff', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>
                  미수행 {missedCount}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* 선택한 날짜의 상세 패널 - 일정 칸에 수행 결과가 채워진 통합 목록 + 일정 등록 폼 */}
      {selectedDate && selected && (
        <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fcfcfc' }}>
          <h4 style={{ margin: '0 0 12px 0' }}>{selectedDate.replaceAll('-', '.')}</h4>

          {/* 일정 목록 (수행 결과 포함) */}
          {selected.items.length > 0 && (
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 15px 0' }}>
              {selected.items.map(({ schedule, session, status }) => {
                const meta = statusMeta[status];
                return (
                  <li key={`p-${schedule.scheduleId}`}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 10px', marginBottom: '6px', border: `1px solid ${meta.border}`, borderRadius: '6px', backgroundColor: meta.bg, fontSize: '14px' }}>
                    <span>
                      <span style={{ fontWeight: 'bold', color: meta.color, marginRight: '8px' }}>{meta.label}</span>
                      <b>{schedule.scheduleAt ? schedule.scheduleAt.substring(11, 16) : '-'}</b>{' '}
                      {schedule.memberName || schedule.username}
                      {schedule.memo && <span style={{ color: '#888', fontSize: '12px' }}> — {schedule.memo}</span>}
                      {/* 수행된 일정 칸에는 실제 출석/확인 시각이 채워진다 */}
                      {session && (
                        <span style={{ color: '#6d28d9', fontSize: '12px', marginLeft: '8px' }}>
                          (출석 {session.checkIn ? session.checkIn.substring(11, 16) : '-'}
                          {session.trainerConfirm ? ` / 확인 ${session.trainerConfirm.substring(11, 16)}` : ''})
                        </span>
                      )}
                    </span>
                    {/* 완료된 일정은 기록 보존을 위해 삭제 버튼 미노출 */}
                    {status !== 'done' && (
                      <button onClick={() => handleScheduleDelete(schedule)} disabled={loading}
                        style={{ padding: '3px 10px', fontSize: '12px', cursor: 'pointer', border: '1px solid #fca5a5', borderRadius: '4px', backgroundColor: '#fff', color: '#dc2626', flexShrink: 0 }}>
                        삭제
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {/* 일정 없이 진행된 수업 (키오스크 워크인) */}
          {selected.walkIns.length > 0 && (
            <div style={{ marginBottom: '15px' }}>
              <h5 style={{ margin: '0 0 6px 0', color: '#6d28d9' }}>📌 일정 외 진행 수업 ({selected.walkIns.length}건)</h5>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {selected.walkIns.map((session) => (
                  <li key={`s-${session.id}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 4px', borderBottom: '1px solid #f3e8ff', fontSize: '14px' }}>
                    <span style={{ fontWeight: 'bold' }}>{session.memberName || session.username}</span>
                    <span style={{ color: '#666' }}>
                      출석 {session.checkIn ? session.checkIn.substring(11, 16) : '-'}
                      {session.trainerConfirm ? ` / 확인 ${session.trainerConfirm.substring(11, 16)}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {selected.items.length === 0 && selected.walkIns.length === 0 && (
            <p style={{ fontSize: '13px', color: '#999', margin: '0 0 15px 0' }}>이 날짜에는 수업/일정이 없습니다.</p>
          )}

          {/* 일정 등록 폼 */}
          <div style={{ padding: '12px', border: '1px solid #bbf7d0', borderRadius: '8px', backgroundColor: '#f0fdf4' }}>
            <h5 style={{ margin: '0 0 8px 0', color: '#15803d' }}>➕ 이 날짜에 일정 등록</h5>
            <form ref={scheduleFormRef} onSubmit={handleScheduleAdd} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <select name="username" required style={{ padding: '7px', fontSize: '13px' }}>
                <option value="">담당 회원 선택</option>
                {myMembers.map((member) => (
                  <option key={member.username} value={member.username}>{member.name} ({member.username})</option>
                ))}
              </select>
              <input type="time" name="time" required style={{ padding: '6px', fontSize: '13px' }} />
              <input type="text" name="memo" placeholder="메모 (선택)" maxLength={100} style={{ padding: '7px', fontSize: '13px', flex: 1, minWidth: '120px' }} />
              <button type="submit" disabled={loading}
                style={{ padding: '7px 16px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', border: 'none', borderRadius: '4px', backgroundColor: '#16a34a', color: '#fff' }}>
                등록
              </button>
            </form>
          </div>
        </div>
      )}

      </div>
      )}
    </div>
  );
}

export default AttendanceConfirm;
