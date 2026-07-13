package com.health.app.alarm;

import java.time.LocalDate;
import java.util.List;

import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface AlarmMapper {

    // 알림 생성(영속화) 쿼리 호출
    public int alarmAdd(AlarmDTO alarmDTO) throws Exception;

    // 수신자 기준 알림 이력 목록 조회 쿼리 호출 (최신순)
    public List<AlarmDTO> alarmList(Long receiver) throws Exception;

    // 알림 읽음 처리 쿼리 호출
    public int alarmRead(Long alarmId) throws Exception;

    // 수신 회원의 모든 알림 일괄 읽음 처리 쿼리 호출 (신규 추가 메서드)
    public int readAllByReceiver(Long receiver) throws Exception;
    
    // 보관 기간(1개월)이 지난 알림 이력 삭제 쿼리 호출
    public int deleteOld(LocalDate cutoff) throws Exception;
}
