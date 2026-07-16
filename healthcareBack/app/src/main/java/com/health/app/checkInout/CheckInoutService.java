package com.health.app.checkInout;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.health.app.alarm.AlarmService;
import com.health.app.contract.ContractDTO;
import com.health.app.member.MemberDTO;
import com.health.app.member.MemberService;

@Service
public class CheckInoutService {

    // 재등록 제안 알림을 보내는 잔여 횟수 기준 (이 값에 도달하는 순간 1회 발송)
    private static final int REBOOK_THRESHOLD = 3;

    @Autowired
    private CheckInoutMapper checkInoutMapper;

    // 키오스크 출석 시 전화번호+비밀번호 본인 확인을 위해 로그인 검증 로직 재사용
    @Autowired
    private MemberService memberService;

    // PT 접수/재등록 타이밍 알림 발송용
    @Autowired
    private AlarmService alarmService;

    public List<CheckInoutDTO> list(Long username)throws Exception{
        return checkInoutMapper.list(username);
    }

    // 헬스장 출석 처리 (키오스크)
    // 1. 계정 검증 -> 2. 유효한 이용권 계약(3) 또는 기간 내 PT 계약(4) 확인 -> 3. 하루 1회 제한 -> 4. 출석 기록
    // PT 회원(체험권 포함)은 계약 기간 동안 이용권처럼 헬스장 이용 가능 (기간 기준 - 잔여 횟수와 무관)
    public CheckInoutDTO gymCheckIn(MemberDTO credential) throws Exception {
        MemberDTO member = verifyMember(credential);

        ContractDTO contract = checkInoutMapper.findActiveContract(member.getUsername(), 3L);
        if (contract == null) {
            contract = checkInoutMapper.findActiveContract(member.getUsername(), 4L);
        }
        if (contract == null) {
            throw new IllegalStateException("이용 가능한 헬스장 이용권 또는 PT 계약이 없습니다.");
        }
        if (checkInoutMapper.countToday(member.getUsername(), 1L) > 0) {
            throw new IllegalStateException("오늘은 이미 헬스장 출석을 완료했습니다.");
        }

        CheckInoutDTO row = new CheckInoutDTO();
        row.setUsername(member.getUsername());
        row.setGymId(contract.getGymId());
        row.setInoutType(1L);
        checkInoutMapper.insertAttendance(row);

        row.setMemberName(member.getName());
        return row;
    }

    // PT 출석 접수 (키오스크)
    // 1. 계정 검증 -> 2. 소진 대상 PT 계약(잔여가 남은 가장 오래된 계약) + 담당 트레이너 확인 -> 3. 하루 1회 제한
    // -> 4. 미확인 상태로 출석 기록 (잔여횟수 차감은 트레이너 확인 시점에 수행)
    // 팀 정책: 일반 PT·체험권이 함께 있으면 먼저 계약한 건부터 소진
    public CheckInoutDTO ptCheckIn(MemberDTO credential) throws Exception {
        MemberDTO member = verifyMember(credential);

        ContractDTO contract = checkInoutMapper.findConsumablePtContract(member.getUsername());
        if (contract == null) {
            throw new IllegalStateException("잔여 횟수가 남은 유효한 PT 계약이 없습니다.");
        }
        if (contract.getManagerId() == null) {
            throw new IllegalStateException("담당 트레이너가 지정되지 않은 계약입니다. 관리자에게 문의해 주세요.");
        }
        if (checkInoutMapper.countToday(member.getUsername(), 2L) > 0) {
            throw new IllegalStateException("오늘은 이미 PT 출석을 접수했습니다.");
        }

        CheckInoutDTO row = new CheckInoutDTO();
        row.setUsername(member.getUsername());
        row.setGymId(contract.getGymId());
        row.setInoutType(2L);
        row.setTrainerId(contract.getManagerId());
        checkInoutMapper.insertAttendance(row);

        // 담당 트레이너에게 접수 실시간 알림 (확인 누락 방지)
        sendAlarmSafely(contract.getManagerId(), member.getUsername(),
                member.getName() + "님이 PT 출석을 접수했습니다. 출석 확인 시 잔여 횟수가 차감됩니다.",
                "/fitb?tab=management", "PT_CHECKIN");

        row.setMemberName(member.getName());
        row.setRemainingCount(contract.getRemainingCount()); // 차감 전 잔여횟수 (확인 후 -1)
        return row;
    }

    // 트레이너 본인 담당 당일 미확인 PT 출석 대기 목록
    public List<CheckInoutDTO> pendingList(Long trainerUsername) throws Exception {
        return checkInoutMapper.pendingList(trainerUsername);
    }

    // 트레이너 본인이 확인 완료한(=실제 진행한) PT 수업 이력 (캘린더 표시용)
    public List<CheckInoutDTO> historyList(Long trainerUsername) throws Exception {
        return checkInoutMapper.historyList(trainerUsername);
    }

    // 트레이너 확인 처리 - 확인과 사용횟수 적립을 단일 트랜잭션으로 묶어 어긋남 방지
    // h_contract_data는 조회만 하고 차감은 출석 도메인 소유의 h_pt_manage(used_count/completed)에서 수행
    // 계약 중지(TERMINATED 전환)는 팀원이 h_pt_manage.completed=true 행을 소비해 별도 구현 예정
    @Transactional(rollbackFor = Exception.class)
    public int confirmPt(Long inoutId, Long trainerUsername) throws Exception {
        CheckInoutDTO row = checkInoutMapper.findAttendance(inoutId);
        if (row == null || row.getInoutType() == null || row.getInoutType() != 2L
                || !trainerUsername.equals(row.getTrainerId())) {
            throw new IllegalStateException("본인 담당 PT 출석 건이 아닙니다.");
        }
        if (row.getTrainerConfirm() != null) {
            throw new IllegalStateException("이미 확인 처리된 출석입니다.");
        }

        // 소진 대상 계약(잔여가 남은 가장 오래된 계약)에서 차감 - 일반 PT 소진 후 체험권 순서 자동 보장
        ContractDTO contract = checkInoutMapper.findConsumablePtContract(row.getUsername());
        if (contract == null) {
            throw new IllegalStateException("잔여 횟수가 남은 유효한 PT 계약이 없습니다.");
        }
        if (contract.getQuantity() == null || contract.getQuantity() <= 0) {
            throw new IllegalStateException("계약에 PT 총 횟수 정보가 없습니다.");
        }

        if (checkInoutMapper.confirmAttendance(inoutId, trainerUsername) != 1) {
            throw new IllegalStateException("당일 출석 건만 확인할 수 있습니다.");
        }

        // 계약당 1행인 PT 이용 관리 행을 보장한 뒤 사용횟수 +1 (총 횟수 도달 시 completed=true 자동 표기)
        checkInoutMapper.upsertPtManage(contract.getDataId(), row.getUsername(), contract.getQuantity());
        if (checkInoutMapper.usePtCount(contract.getDataId()) != 1) {
            throw new IllegalStateException("잔여 PT 횟수가 없어 차감할 수 없습니다.");
        }

        int remaining = contract.getQuantity() - checkInoutMapper.findUsedCount(contract.getDataId());

        // 잔여가 기준(3회)에 도달하는 순간 재등록 타이밍 알림 - 트레이너(제안) + 사장님(프로모션 검토)
        if (remaining == REBOOK_THRESHOLD) {
            String memberLabel = row.getMemberName() != null ? row.getMemberName() : String.valueOf(row.getUsername());
            sendAlarmSafely(trainerUsername, null,
                    memberLabel + "님의 잔여 PT가 " + remaining + "회 남았습니다. 재등록 제안을 고려해 보세요.",
                    "/fitb?tab=management", "PT_REBOOK");

            MemberDTO owner = memberService.findOwnerByGymId(contract.getGymId());
            if (owner != null) {
                sendAlarmSafely(owner.getUsername(), null,
                        memberLabel + "님의 잔여 PT가 " + remaining + "회 남았습니다. 재등록 프로모션을 검토해 보세요.",
                        "/fitb?tab=promotion", "PT_REBOOK");
            }
        }

        return remaining; // 차감 후 잔여횟수 반환
    }

    // ===== PT 수업 일정 (트레이너 주도 등록, 회원은 조회 전용) =====

    // 트레이너 본인 담당 회원 목록 (일정 등록 폼의 회원 선택용)
    public List<MemberDTO> myMembers(Long trainerUsername) throws Exception {
        return checkInoutMapper.myMembers(trainerUsername);
    }

    // 트레이너 담당 회원 현황 - 유효 PT 계약별 총횟수/사용/잔여 (잔여 적은 순)
    public List<PtMemberStatusDTO> memberStatusList(Long trainerUsername) throws Exception {
        return checkInoutMapper.memberStatusList(trainerUsername);
    }

    // 일정 등록 - 본인 담당(유효 PT 계약의 manager_id) 회원만 등록 가능
    public PtScheduleDTO scheduleAdd(Long trainerUsername, PtScheduleDTO schedule) throws Exception {
        if (schedule.getUsername() == null || schedule.getScheduleAt() == null) {
            throw new IllegalStateException("회원과 수업 일시를 입력해 주세요.");
        }
        ContractDTO contract = checkInoutMapper.findActivePtByTrainer(schedule.getUsername(), trainerUsername);
        if (contract == null) {
            throw new IllegalStateException("본인 담당 PT 회원이 아닙니다.");
        }
        schedule.setTrainerId(trainerUsername);
        schedule.setGymId(contract.getGymId());
        checkInoutMapper.insertSchedule(schedule);
        return schedule;
    }

    // 트레이너 본인 일정 전체 (캘린더 표시용)
    public List<PtScheduleDTO> trainerScheduleList(Long trainerUsername) throws Exception {
        return checkInoutMapper.trainerScheduleList(trainerUsername);
    }

    // 회원 본인의 다가오는 일정
    public List<PtScheduleDTO> memberScheduleList(Long username) throws Exception {
        return checkInoutMapper.memberScheduleList(username);
    }

    // 일정 삭제 - 본인 등록 건만
    public void scheduleDelete(Long scheduleId, Long trainerUsername) throws Exception {
        if (checkInoutMapper.deleteSchedule(scheduleId, trainerUsername) != 1) {
            throw new IllegalStateException("본인이 등록한 일정만 삭제할 수 있습니다.");
        }
    }

    // ===== 사장님용 지점 집계 (회원/직원 관리 탭 owner 뷰) =====

    // 사장님 계정의 지점(gym_id) 판별 - 지점 정보가 없으면 조회 불가
    public Long resolveGymId(Long username) throws Exception {
        Long gymId = checkInoutMapper.findGymIdByUsername(username);
        if (gymId == null) {
            throw new IllegalStateException("계정에 지점 정보가 없습니다.");
        }
        return gymId;
    }

    // 지점 트레이너별 성과 지표
    public List<TrainerPerfDTO> ownerTrainerPerf(Long gymId) throws Exception {
        return checkInoutMapper.ownerTrainerPerf(gymId);
    }

    // 지점 재등록 임박 리스트 (PT 잔여 3회 이하 + 이용권 종료 7일 이내)
    public List<RebookDTO> ownerRebookList(Long gymId) throws Exception {
        return checkInoutMapper.ownerRebookList(gymId);
    }

    // 지점 전체 PT 일정 (읽기 전용 캘린더)
    public List<PtScheduleDTO> ownerScheduleList(Long gymId) throws Exception {
        return checkInoutMapper.ownerScheduleList(gymId);
    }

    // 지점 전체 확인 완료 PT 수업 이력 (읽기 전용 캘린더)
    public List<CheckInoutDTO> ownerHistoryList(Long gymId) throws Exception {
        return checkInoutMapper.ownerHistoryList(gymId);
    }

    // 총괄 관리자용 매장별 비교 지표 (전 매장)
    public List<GymPerfDTO> adminGymOverview() throws Exception {
        return checkInoutMapper.adminGymOverview();
    }

    // 내일 예정된 PT 일정 리마인드 발송 (전날 저녁 배치) - 회원/트레이너 양쪽에 알림, 발송 건수 반환
    public int sendTomorrowReminders() throws Exception {
        List<PtScheduleDTO> schedules = checkInoutMapper.tomorrowSchedules();
        for (PtScheduleDTO schedule : schedules) {
            String time = schedule.getScheduleAt().toLocalTime().toString().substring(0, 5);

            String trainerLabel = schedule.getTrainerName() != null ? schedule.getTrainerName() + " 트레이너" : "담당 트레이너";
            sendAlarmSafely(schedule.getUsername(), null,
                    "내일 " + time + " PT 수업이 예정되어 있습니다. (" + trainerLabel + ")",
                    "/fitc/mypage/checkin", "PT_REMIND");

            String memberLabel = schedule.getMemberName() != null ? schedule.getMemberName() : String.valueOf(schedule.getUsername());
            sendAlarmSafely(schedule.getTrainerId(), null,
                    "내일 " + time + " " + memberLabel + "님 PT 수업이 예정되어 있습니다.",
                    "/fitb?tab=management", "PT_REMIND");
        }
        return schedules.size();
    }

    // 키오스크 입력 계정(전화번호+비밀번호) 본인 확인 공통 메서드
    private MemberDTO verifyMember(MemberDTO credential) throws Exception {
        MemberDTO member = memberService.login(credential);
        if (member == null) {
            throw new IllegalStateException("전화번호 또는 비밀번호가 올바르지 않습니다.");
        }
        return member;
    }

    // 알림 발송 실패가 출석/차감 핵심 트랜잭션을 롤백시키지 않도록 격리하는 헬퍼 메서드 (SettleService 패턴)
    private void sendAlarmSafely(Long receiver, Long sender, String message, String link, String category) {
        if (receiver == null) return;
        try {
            alarmService.sendAlarm(receiver, sender, message, link, category);
        } catch (Exception e) {
            System.err.println("알림 발송 실패 (receiver=" + receiver + ", category=" + category + "): " + e.getMessage());
        }
    }
}
