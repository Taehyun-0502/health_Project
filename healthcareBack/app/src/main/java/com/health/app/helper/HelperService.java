package com.health.app.helper;

import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

// 불만 조치 도우미(helper) 서비스
@Service
public class HelperService {

    private final HelperMapper helperMapper;

    public HelperService(HelperMapper helperMapper) {
        this.helperMapper = helperMapper;
    }

    public List<Map<String, Object>> selectTrainers(Long gymId) throws Exception {
        return helperMapper.selectTrainers(gymId);
    }

    public List<Map<String, Object>> selectComplaintVisitSlots(Long gymId, String mode, String period, String statKey) throws Exception {
        return helperMapper.selectComplaintVisitSlots(gymId, mode, period, statKey);
    }

    public List<Map<String, Object>> selectComplaintManagers(Long gymId, String mode, String period, String statKey) throws Exception {
        return helperMapper.selectComplaintManagers(gymId, mode, period, statKey);
    }

    public List<Map<String, Object>> selectServiceCenters() throws Exception {
        return helperMapper.selectServiceCenters();
    }

    public int insertHelperRequest(Long username, String contents) throws Exception {
        return helperMapper.insertHelperRequest(username, contents);
    }
}
