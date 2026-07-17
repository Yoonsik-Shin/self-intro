package com.selfintro.modules.donation.presentation.dto;

import com.selfintro.modules.donation.domain.DonationEvent;
import com.selfintro.modules.donation.domain.DonationEventActor;
import com.selfintro.modules.donation.domain.DonationEventType;
import java.time.LocalDateTime;

public record DonationEventResponse(
        Long id,
        DonationEventType eventType,
        DonationEventActor actor,
        String payState,
        String detail,
        LocalDateTime createdAt) {

    public static DonationEventResponse from(DonationEvent event) {
        return new DonationEventResponse(
                event.getId(),
                event.getEventType(),
                event.getActor(),
                event.getPayState(),
                event.getDetail(),
                event.getCreatedAt());
    }
}
