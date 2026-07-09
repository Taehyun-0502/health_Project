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

    // SSE 기본 연결 만료 시간 설정 (30분)
    private static final Long DEFAULT_TIMEOUT = 1000L * 60 * 30;

    // 1. 회원의 실시간 알람 구독(빨대 꽂기)을 개설하는 메서드
    public SseEmitter subscribe(String username) throws Exception {
        // 30분 만료 시간을 가진 새로운 실시간 전선 객체 생성
        SseEmitter emitter = new SseEmitter(DEFAULT_TIMEOUT);

        // 네트워크 시간 만료되거나 완료 시 저장소에서 연결선을 자동으로 지워주는 자원 반환 콜백 심기
        emitter.onCompletion(() -> alarmRepository.remove(username));
        emitter.onTimeout(() -> alarmRepository.remove(username));

        // [중요] 최초 구독 즉시 더미 데이터를 한 번 쏘지 않으면 503 Gateway Timeout 에러가 유발됩니다.
        try {
            emitter.send(SseEmitter.event().name("connect").data("실시간 알람 연결이 완료되었습니다."));
        } catch (IOException e) {
            alarmRepository.remove(username);
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

        // 저장소에서 해당 회원의 연결망 획득
        SseEmitter emitter = alarmRepository.get(username);

        if (emitter != null) {
            try {
                // event().name("alarm") 형식으로 데이터를 캡슐화해 쏩니다.
                emitter.send(SseEmitter.event().name("alarm").data(message));
            } catch (IOException e) {
                // 통신이 깨졌거나 클라이언트가 탭을 닫아 전송 실패한 경우 저장소에서 삭제
                alarmRepository.remove(username);
            }
        }

        // 실시간 수신 여부와 무관하게 이력은 항상 h_alarm에 남긴다
        AlarmDTO alarmDTO = new AlarmDTO();
        alarmDTO.setReceiver(receiver);
        alarmDTO.setSender(sender);
        alarmDTO.setMessage(message);
        alarmDTO.setLink(link);
        alarmDTO.setCategory(category);
        alarmMapper.alarmAdd(alarmDTO);
    }

    // 3. 수신자 기준 알림 이력 목록 조회
    public java.util.List<AlarmDTO> alarmList(Long receiver) throws Exception {
        return alarmMapper.alarmList(receiver);
    }

    // 4. 알림 읽음 처리
    public int alarmRead(Long alarmId) throws Exception {
        return alarmMapper.alarmRead(alarmId);
    }

    // 5. 보관 기간(1개월) 경과 알림 이력 삭제
    public int deleteOldAlarms() throws Exception {
        return alarmMapper.deleteOld(java.time.LocalDate.now().minusMonths(1));
    }
}