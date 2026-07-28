import { useState, useEffect, useRef } from 'react';
import NavIcon from '../components/uiIcons.jsx';
import usePageHeaderAction from '../hooks/usePageHeaderAction.js';
import './AttendanceConfirm.css';

// PT형 계약 유형 라벨 (백엔드 h_contract_data.contract 코드 기준: 4=PT, 5=PT 체험)
// 체험 회원은 유료 PT 전환 제안 대상이라 트레이너 화면에서 구분해 표시한다.
const PT_TYPE_LABEL = { 4: 'PT', 5: 'PT 체험' };

// 일정 상태별 표기 라벨 (색상은 CSS .att-confirm__day-item--*/__day-status--*가 담당)
const STATUS_LABEL = { done: '완료', planned: '예정', missed: '미수행' };

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

  const tabs = [
    { key: 'members', label: '담당 회원' },
    { key: 'schedule', label: '일정 관리' },
  ];

  // 일정 관리 탭에서만 노출되는 새로고침 액션을 페이지 헤더(B2bManagementPage)에 등록한다.
  usePageHeaderAction(activeTab === 'schedule' ? { label: '새로고침', onClick: fetchAll } : null);

  return (
    <div className="att-confirm">

      {/* ===== 탭바 ===== */}
      <div className="att-confirm__tabs" role="tablist" aria-label="PT 출석·일정 관리">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`att-confirm__tab${activeTab === tab.key ? ' att-confirm__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== 담당 회원 탭 (담당 회원 현황) ===== */}
      {activeTab === 'members' && (
      <div role="tabpanel">

      {/* 담당 회원 현황 - 유효 PT 계약별 총/사용/잔여, 잔여 적은 순 (섹션 제목은 칩 라벨과 중복이라 제거) */}
      {memberStatus.length === 0 ? (
        <p className="att-confirm__empty">담당 중인 유효 PT 계약이 없어요.</p>
      ) : (
        <div className="att-confirm__table-wrap">
          <table className="att-confirm__table">
            <thead>
              <tr>
                <th>회원명</th>
                <th>전화번호</th>
                <th>진행 현황</th>
                <th>잔여</th>
                <th>최근 수업</th>
                <th>계약 기간</th>
                <th>상태</th>
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
                const fillMod = isDone ? ' att-confirm__progress-fill--done' : isLow ? ' att-confirm__progress-fill--low' : '';
                const remainMod = isDone ? ' att-confirm__remaining--done' : isLow ? ' att-confirm__remaining--low' : '';

                return (
                  <tr key={row.dataId}>
                    <td>
                      {/* 회원명 클릭 시 하단에 상세 드릴다운 패널 표시 */}
                      <button
                        type="button"
                        className="att-confirm__name-btn"
                        onClick={() => setSelectedMember(selectedMember === String(row.username) ? null : String(row.username))}
                      >
                        {row.memberName || '-'}
                      </button>
                      {row.contract === 5 && (
                        <span className="att-confirm__trial-tag">{PT_TYPE_LABEL[5]}</span>
                      )}
                    </td>
                    <td className="att-confirm__num">{row.username}</td>
                    <td>
                      {/* 사용/총 진행 바 */}
                      <div className="att-confirm__progress-cell">
                        <div className="att-confirm__progress">
                          <div className={`att-confirm__progress-fill${fillMod}`} style={{ width: `${percent}%` }} />
                        </div>
                        <span className="att-confirm__progress-label">{used} / {total}회</span>
                      </div>
                    </td>
                    <td className={`att-confirm__num att-confirm__remaining${remainMod}`}>
                      {remaining}회
                    </td>
                    <td className={`att-confirm__last${needCare ? ' att-confirm__last--care' : ''}`}>
                      {lastSession ? (
                        <>
                          {lastSession.substring(0, 10)}<br />
                          <b>({elapsed === 0 ? '오늘' : `${elapsed}일 전`})</b>
                          {needCare && <span className="att-confirm__care-badge">관리 필요</span>}
                        </>
                      ) : (
                        <span className="att-confirm__muted">수업 이력 없음</span>
                      )}
                    </td>
                    <td className="att-confirm__period">
                      {row.startDate || '-'} ~ {row.endDate || '무기한'}
                    </td>
                    <td>
                      {isDone ? (
                        <span className="att-confirm__badge att-confirm__badge--done">소진 완료</span>
                      ) : isLow ? (
                        <span className="att-confirm__badge att-confirm__badge--low">재등록 제안</span>
                      ) : (
                        <span className="att-confirm__badge att-confirm__badge--progress">진행 중</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 회원 상세 드릴다운 패널 - 현황에서 회원명 클릭 시 표시 */}
      {drill && (
        <div className="att-confirm__drill">
          <div className="att-confirm__drill-head">
            <h4 className="att-confirm__drill-title">{drillName}님 상세</h4>
            <button type="button" className="att-confirm__drill-close" onClick={() => setSelectedMember(null)}>
              닫기 <NavIcon id="close" size={15} />
            </button>
          </div>

          {/* 계약별 진행 현황 */}
          <div className="att-confirm__drill-section">
            <h5 className="att-confirm__drill-h att-confirm__drill-h--contract">계약 진행</h5>
            {drill.contracts.map((contract) => {
              const total = contract.totalCount || 0;
              const used = contract.usedCount || 0;
              return (
                <p key={contract.dataId} className="att-confirm__drill-line">
                  계약 #{contract.dataId} [{PT_TYPE_LABEL[contract.contract] ?? '-'}] — {used} / {total}회 사용, <b>잔여 {contract.remainingCount}회</b>
                  <span className="att-confirm__drill-sub"> ({contract.startDate || '-'} ~ {contract.endDate || '무기한'})</span>
                </p>
              );
            })}
          </div>

          {/* 예정 일정 */}
          <div className="att-confirm__drill-section">
            <h5 className="att-confirm__drill-h att-confirm__drill-h--upcoming">예정 일정 ({drill.upcoming.length}건)</h5>
            {drill.upcoming.length === 0 ? (
              <p className="att-confirm__drill-line--empty">예정된 일정이 없어요. 캘린더에서 다음 수업을 잡아주세요.</p>
            ) : (
              drill.upcoming.map((schedule) => (
                <p key={schedule.scheduleId} className="att-confirm__drill-line">
                  {schedule.scheduleAt.substring(0, 10).replaceAll('-', '.')} {schedule.scheduleAt.substring(11, 16)}
                  {schedule.memo && <span className="att-confirm__drill-sub"> — {schedule.memo}</span>}
                </p>
              ))
            )}
          </div>

          {/* 노쇼(미수행) 이력 */}
          {drill.missed.length > 0 && (
            <div className="att-confirm__drill-section">
              <h5 className="att-confirm__drill-h att-confirm__drill-h--missed">미수행 일정 ({drill.missed.length}건)</h5>
              {drill.missed.map((schedule) => (
                <p key={schedule.scheduleId} className="att-confirm__drill-line att-confirm__drill-line--missed">
                  {schedule.scheduleAt.substring(0, 10).replaceAll('-', '.')} {schedule.scheduleAt.substring(11, 16)}
                  {schedule.memo && <span className="att-confirm__drill-sub"> — {schedule.memo}</span>}
                </p>
              ))}
            </div>
          )}

          {/* 수업 이력 타임라인 (최근 10건) */}
          <div className="att-confirm__drill-section">
            <h5 className="att-confirm__drill-h att-confirm__drill-h--history">수업 이력 (최근 {Math.min(drill.sessions.length, 10)}건 / 총 {drill.sessions.length}건)</h5>
            {drill.sessions.length === 0 ? (
              <p className="att-confirm__drill-line--empty">아직 진행한 수업이 없어요.</p>
            ) : (
              drill.sessions.slice(0, 10).map((session) => (
                <p key={session.id} className="att-confirm__drill-line">
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

      {pendingList.length === 0 ? (
        <p className="att-confirm__empty">확인 대기 중인 PT 출석이 없어요.</p>
      ) : (
        <div className="att-confirm__table-wrap">
          <table className="att-confirm__table">
            <thead>
              <tr>
                <th>회원명</th>
                <th>전화번호</th>
                <th>출석 시간</th>
                <th>잔여 횟수</th>
                <th>처리</th>
              </tr>
            </thead>
            <tbody>
              {pendingList.map((row) => (
                <tr key={row.id}>
                  <td>{row.memberName || '-'}</td>
                  <td className="att-confirm__num">{row.username}</td>
                  <td className="att-confirm__num">
                    {row.checkIn ? row.checkIn.substring(11, 16) : '-'}
                  </td>
                  <td className="att-confirm__num">
                    {row.remainingCount != null ? `${row.remainingCount}회` : '-'}
                  </td>
                  <td>
                    <button type="button" className="att-confirm__confirm-btn" onClick={() => handleConfirm(row)} disabled={loading}>
                      출석 확인
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== 내 PT 캘린더 섹션 ===== */}
      <hr className="att-confirm__divider" />
      <h3 className="att-confirm__title">내 PT 캘린더</h3>
      <p className="att-confirm__desc">
        등록한 일정이 수행되면 <span className="att-confirm__accent">완료</span>로 채워집니다.
        지나간 일정에 출석이 없으면 <span className="att-confirm__danger">미수행</span>으로 표시됩니다.
        날짜를 클릭하면 상세 확인 및 일정 등록이 가능합니다.
      </p>

      {/* 월간 실적 요약 카드 - 캘린더 표시 월 기준 (달 이동 시 함께 갱신) */}
      <div className="att-confirm__stats">
        <div className="att-confirm__stat att-confirm__stat--pt">
          <div className="att-confirm__stat-label">이번 달 수업</div>
          <div className="att-confirm__stat-value">{monthDone}건</div>
          <div className={`att-confirm__stat-sub${diffFromPrev > 0 ? ' att-confirm__stat-sub--up' : diffFromPrev < 0 ? ' att-confirm__stat-sub--down' : ''}`}>
            지난달 대비 {diffFromPrev > 0 ? `+${diffFromPrev}` : diffFromPrev}건
          </div>
        </div>
        <div className="att-confirm__stat att-confirm__stat--success">
          <div className="att-confirm__stat-label">수행률</div>
          <div className="att-confirm__stat-value">{performRate != null ? `${performRate}%` : '-'}</div>
          <div className="att-confirm__stat-sub">완료 {monthDone} / 미수행 {monthMissed}</div>
        </div>
        <div className="att-confirm__stat att-confirm__stat--info">
          <div className="att-confirm__stat-label">담당 회원</div>
          <div className="att-confirm__stat-value">{myMembers.length}명</div>
          <div className="att-confirm__stat-sub">유효 계약 {memberStatus.length}건</div>
        </div>
      </div>

      {/* 달력 컨트롤러 헤더 */}
      <div className="att-confirm__cal-nav">
        <button type="button" className="att-confirm__cal-btn" onClick={handlePrevMonth}>&lt; 이전달</button>
        <span className="att-confirm__cal-title">{year}년 {month + 1}월</span>
        <button type="button" className="att-confirm__cal-btn" onClick={handleNextMonth}>다음달 &gt;</button>
      </div>

      {/* 요일 구분 그리드 */}
      <div className="att-confirm__weekdays">
        <div className="att-confirm__weekdays--sun">일</div>
        <div>월</div>
        <div>화</div>
        <div>수</div>
        <div>목</div>
        <div>금</div>
        <div className="att-confirm__weekdays--sat">토</div>
      </div>

      {/* 캘린더 날짜 그리드 - 모든 날짜 클릭 가능 (빈 날도 일정 등록을 위해) */}
      <div className="att-confirm__cal-grid">
        {calendarCells.map((day, idx) => {
          if (day === null) {
            return <div key={`blank-${idx}`} className="att-confirm__cal-blank" />;
          }

          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const { items, walkIns } = matchDay(dateStr);
          const doneCount = items.filter((i) => i.status === 'done').length + walkIns.length;
          const plannedCount = items.filter((i) => i.status === 'planned').length;
          const missedCount = items.filter((i) => i.status === 'missed').length;
          const isSelected = selectedDate === dateStr;
          const hasAny = doneCount + plannedCount + missedCount > 0;
          // 배경 우선순위: 완료 > 예정 > 미수행 > 없음 (색은 CSS가 담당)
          const toneMod = doneCount > 0 ? ' att-confirm__cal-cell--done'
            : plannedCount > 0 ? ' att-confirm__cal-cell--planned'
            : missedCount > 0 ? ' att-confirm__cal-cell--missed' : '';

          return (
            <div
              key={`day-${day}`}
              onClick={() => setSelectedDate(isSelected ? null : dateStr)}
              className={`att-confirm__cal-cell${toneMod}${isSelected ? ' att-confirm__cal-cell--selected' : ''}`}
            >
              <span className={`att-confirm__cal-day${hasAny ? ' att-confirm__cal-day--active' : ''}`}>
                {day}
              </span>

              {doneCount > 0 && (
                <span className="att-confirm__cal-badge att-confirm__cal-badge--done">완료 {doneCount}</span>
              )}
              {plannedCount > 0 && (
                <span className="att-confirm__cal-badge att-confirm__cal-badge--planned">예정 {plannedCount}</span>
              )}
              {missedCount > 0 && (
                <span className="att-confirm__cal-badge att-confirm__cal-badge--missed">미수행 {missedCount}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* 선택한 날짜의 상세 패널 - 일정 칸에 수행 결과가 채워진 통합 목록 + 일정 등록 폼 */}
      {selectedDate && selected && (
        <div className="att-confirm__day-panel">
          <h4 className="att-confirm__day-title">{selectedDate.replaceAll('-', '.')}</h4>

          {/* 일정 목록 (수행 결과 포함) */}
          {selected.items.length > 0 && (
            <ul className="att-confirm__day-list">
              {selected.items.map(({ schedule, session, status }) => (
                <li key={`p-${schedule.scheduleId}`} className={`att-confirm__day-item att-confirm__day-item--${status}`}>
                  <span>
                    <span className={`att-confirm__day-status att-confirm__day-status--${status}`}>{STATUS_LABEL[status]}</span>
                    <b>{schedule.scheduleAt ? schedule.scheduleAt.substring(11, 16) : '-'}</b>{' '}
                    {schedule.memberName || schedule.username}
                    {schedule.memo && <span className="att-confirm__drill-sub"> — {schedule.memo}</span>}
                    {/* 수행된 일정 칸에는 실제 출석/확인 시각이 채워진다 */}
                    {session && (
                      <span className="att-confirm__session-note">
                        (출석 {session.checkIn ? session.checkIn.substring(11, 16) : '-'}
                        {session.trainerConfirm ? ` / 확인 ${session.trainerConfirm.substring(11, 16)}` : ''})
                      </span>
                    )}
                  </span>
                  {/* 완료된 일정은 기록 보존을 위해 삭제 버튼 미노출 */}
                  {status !== 'done' && (
                    <button type="button" className="att-confirm__day-del" onClick={() => handleScheduleDelete(schedule)} disabled={loading}>
                      삭제
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* 일정 없이 진행된 수업 (키오스크 워크인) */}
          {selected.walkIns.length > 0 && (
            <div className="att-confirm__walkins">
              <h5 className="att-confirm__walkins-h">일정 외 진행 수업 ({selected.walkIns.length}건)</h5>
              <ul className="att-confirm__walkin-list">
                {selected.walkIns.map((session) => (
                  <li key={`s-${session.id}`} className="att-confirm__walkin-item">
                    <span className="att-confirm__walkin-name">{session.memberName || session.username}</span>
                    <span className="att-confirm__walkin-time">
                      출석 {session.checkIn ? session.checkIn.substring(11, 16) : '-'}
                      {session.trainerConfirm ? ` / 확인 ${session.trainerConfirm.substring(11, 16)}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {selected.items.length === 0 && selected.walkIns.length === 0 && (
            <p className="att-confirm__day-empty">이 날짜에는 수업/일정이 없어요.</p>
          )}

          {/* 일정 등록 폼 */}
          <div className="att-confirm__form-box">
            <h5 className="att-confirm__form-h">이 날짜에 일정 등록</h5>
            <form ref={scheduleFormRef} onSubmit={handleScheduleAdd} className="att-confirm__form">
              <select name="username" required className="att-confirm__input">
                <option value="">담당 회원 선택</option>
                {myMembers.map((member) => (
                  <option key={member.username} value={member.username}>{member.name} ({member.username})</option>
                ))}
              </select>
              <input type="time" name="time" required className="att-confirm__input" />
              <input type="text" name="memo" placeholder="메모 (선택)" maxLength={100} className="att-confirm__input att-confirm__input--memo" />
              <button type="submit" className="att-confirm__form-submit" disabled={loading}>
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
