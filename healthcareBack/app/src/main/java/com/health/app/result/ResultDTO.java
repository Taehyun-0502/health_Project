package com.health.app.result;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class ResultDTO {

    private Long resultId;        // 기본키 (int8)
    private Long modelId;         // 데이터 키 (int8, h_model_data.model_id 참조)
    private Double churnRate;     // 이탈확률 (numeric)
    private String top1Reason;    // top1 이탈요인 (varchar)
    private String top2Reason;    // top2 이탈요인 (varchar)
    private String top3Reason;    // top3 이탈요인 (varchar)

}
