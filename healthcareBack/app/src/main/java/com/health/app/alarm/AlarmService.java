package com.health.app.alarm;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import java.io.IOException;

// 실시간 알람 구독 처리 및 실제 전송을 담당하는 비즈니스 서비스 클래스
@Service
public class AlarmService {

    @Autowired
    private AlarmRepository alarmRepository;

    @Autowired
    private AlarmMapper alarmMapper;

    @Autowired
    private AlarmTicketStore alarmTicketStore;

    // SSE 기본 연결 만료 시간 설정 (30분)
    private static final Long DEFAULT_TIMEOUT = 1000L * 60 * 30;

    // 0. 인증된 회원에게 SSE 구독용 1회성 티켓 발급 (EventSource가 Bearer 헤더를 못 보내기 때문)
    public String issueSubscribeTicket(Long username) {
        return alarmTicketStore.issue(username);
    }

    // 1. 회원의 실시간 알람 구독(빨대 꽂기)을 개설하는 메서드
    // 구독 대상은 클라이언트가 보낸 값이 아니라 티켓에 봉인된 발급 대상으로만 결정한다.
    public SseEmitter subscribeByTicket(String ticket) throws Exception {
        Long owner = alarmTicketStore.consume(ticket);
        if (owner == null) {
            return null; // 컨트롤러가 401로 변환
        }
        return subscribe(String.valueOf(owner));
    }

    private SseEmitter subscribe(String username) throws Exception {
        // 30분 만료 시간을 가진 새로운 실시간 전선 객체 생성
        SseEmitter emitter = new SseEmitter(DEFAULT_TIMEOUT);

        // 네트워크 시간 만료되거나 완료 시 저장소에서 "이 연결만" 지워주는 자원 반환 콜백 심기
        // (같은 회원의 다른 탭 연결은 살아있어야 하므로 emitter 인스턴스를 함께 넘긴다)
        // onError까지 거는 이유: 오류로 끝난 연결은 onCompletion/onTimeout을 타지 않을 수 있어
        // 죽은 emitter가 맵에 남고, 이후 전송 때마다 예외를 유발한다.
        emitter.onCompletion(() -> alarmRepository.remove(username, emitter));
        emitter.onTimeout(() -> alarmRepository.remove(username, emitter));
        emitter.onError(e -> alarmRepository.remove(username, emitter));

        // [중요] 최초 구독 즉시 더미 데이터를 한 번 쏘지 않으면 503 Gateway Timeout 에러가 유발됩니다.
        try {
            emitter.send(SseEmitter.event().name("connect").data("실시간 알람 연결이 완료되었습니다."));
        } catch (IOException e) {
            alarmRepository.remove(username, emitter);
            throw new RuntimeException("최초 연결 생성 실패");
        }

        // 정상적으로 가동 준비를 마친 전선 객체를 저장소에 보관
        alarmRepository.save(username, emitter);

        return emitter;
    }

    // 2. 특정 회원에게 메시지를 쏘아 보내는 전송 메서드 (SSE 실시간 발송 + h_alarm 영속화)
    // sender는 시스템(배치/이벤트 트리거) 발송인 경우 null
    public void sendAlarm(Long receiver, Long sender, String message, String link, String category) throws Exception {
        String username = String.valueOf(receiver);

        // 실시간 수신 여부와 무관하게 이력은 항상 h_alarm에 남긴다
        AlarmDTO alarmDTO = new AlarmDTO();
        alarmDTO.setReceiver(receiver);
        alarmDTO.setSender(sender);
        alarmDTO.setMessage(message);
        alarmDTO.setLink(link);
        alarmDTO.setCategory(category);
        alarmMapper.alarmAdd(alarmDTO);

        // 같은 회원이 여러 탭/기기를 열었을 수 있으므로 열린 연결 전부에 전송한다.
        // 한 연결의 전송 실패가 나머지 연결로의 전송을 막지 않도록 건별로 격리한다.
        for (SseEmitter emitter : alarmRepository.get(username)) {
            try {
                // ◀ 변경: message 텍스트 대신 이동 경로가 포함된 alarmDTO 객체 자체를 JSON 직렬화 전송
                emitter.send(SseEmitter.event().name("alarm").data(alarmDTO));
            } catch (Exception e) {
                // IOException(통신 단선·탭 닫힘)만 잡으면 안 된다.
                // 이미 만료된 emitter에 보내면 IllegalStateException, 직렬화가 실패하면
                // HttpMessageNotWritableException처럼 IOException이 아닌 예외가 나오는데,
                // 이게 루프 밖으로 나가면 뒤에 남은 정상 연결이 전송을 못 받을 뿐 아니라
                // 호출부(@Transactional인 건의글 등록 등)까지 전파돼 본래 업무가 롤백된다.
                // 알림 이력은 위에서 이미 저장했으므로 실시간 전송 실패는 해당 연결만 정리하고 넘어간다.
                alarmRepository.remove(username, emitter);
            }
        }
    }

    // 3. 수신자 기준 알림 이력 목록 조회
    public java.util.List<AlarmDTO> alarmList(Long receiver) throws Exception {
        return alarmMapper.alarmList(receiver);
    }

    // 4. 알림 읽음 처리 - 본인 수신 알림만 갱신 (receiver는 컨트롤러가 JWT에서 주입)
    public int alarmRead(Long alarmId, Long receiver) throws Exception {
        return alarmMapper.alarmRead(alarmId, receiver);
    }

    // 5. 보관 기간(1개월) 경과 알림 이력 삭제
    public int deleteOldAlarms() throws Exception {
        return alarmMapper.deleteOld(java.time.LocalDate.now().minusMonths(1));
    }

    // 6. 회원의 모든 알림 일괄 읽음 처리 (신규 추가 메서드)
    public int readAllAlarms(Long receiver) throws Exception {
        return alarmMapper.readAllByReceiver(receiver);
    }
}