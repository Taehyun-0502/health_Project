package com.health.app.item;

import java.time.LocalDate;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class ItemDTO {

    private int itemId;
    private int gymId;
    private String itemCategory;
    private int itemCount;
    private String itemName;
    private LocalDate itemBuy;
    private int itemPrice;
}
