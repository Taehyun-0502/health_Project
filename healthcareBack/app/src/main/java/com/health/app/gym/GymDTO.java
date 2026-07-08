package com.health.app.gym;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class GymDTO {

    private Long gymId;
    private String gymName;
    private String gymAdress;
    private Long gymPhone;
    private String gymOwnernum;
    private String gymCategory;
}
