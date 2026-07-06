package com.health.app.item;

import java.time.LocalDate;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class ItemDTO {

    private Long itemId;
    private Long gymId;
    private String itemCategory;
    private Long itemCount;
    private String itemName;
    private LocalDate itemDate;
    private Long itemPrice;
    private String itemStatus;

}
