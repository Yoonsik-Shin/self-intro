package com.selfintro.modules.billing.presentation;

import com.selfintro.global.web.CurrentWorkspace;
import com.selfintro.global.web.WorkspaceAccessLevel;
import com.selfintro.modules.auth.application.RecentReauthenticationPolicy;
import com.selfintro.modules.billing.application.WorkspaceBillingMutationService;
import com.selfintro.modules.billing.application.WorkspaceBillingOverviewService;
import com.selfintro.modules.billing.presentation.dto.BillingChargeResponse;
import com.selfintro.modules.billing.presentation.dto.BillingCheckoutContextResponse;
import com.selfintro.modules.billing.presentation.dto.BillingMethodConfirmRequest;
import com.selfintro.modules.billing.presentation.dto.BillingPaymentMethodResponse;
import com.selfintro.modules.billing.presentation.dto.PointPackPurchaseRequest;
import com.selfintro.modules.billing.presentation.dto.SubscriptionPurchaseRequest;
import com.selfintro.modules.billing.presentation.dto.WorkspaceAiUsageResponse;
import com.selfintro.modules.billing.presentation.dto.WorkspaceBillingOverviewResponse;
import com.selfintro.modules.identity.domain.WorkspaceMember;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workspaces/{workspaceSlug}/billing")
@RequiredArgsConstructor
public class WorkspaceBillingController {

    private final WorkspaceBillingOverviewService overviewService;
    private final WorkspaceBillingMutationService mutationService;
    private final RecentReauthenticationPolicy reauthenticationPolicy;

    @GetMapping("/overview")
    public WorkspaceBillingOverviewResponse overview(
            @CurrentWorkspace(WorkspaceAccessLevel.READ) WorkspaceMember member) {
        return overviewService.overview(member.getWorkspace().getId());
    }

    @GetMapping("/ai-usage")
    public WorkspaceAiUsageResponse recentUsage(
            @CurrentWorkspace(WorkspaceAccessLevel.READ) WorkspaceMember member,
            @RequestParam(defaultValue = "20") int limit) {
        return overviewService.recentUsage(member.getWorkspace().getId(), limit);
    }

    @GetMapping("/checkout-context")
    public BillingCheckoutContextResponse checkoutContext(
            @CurrentWorkspace(WorkspaceAccessLevel.OWNER) WorkspaceMember member,
            HttpSession session) {
        reauthenticationPolicy.requireRecent(session);
        return mutationService.checkoutContext(member);
    }

    @PostMapping("/payment-methods/confirm")
    public BillingPaymentMethodResponse confirmPaymentMethod(
            @CurrentWorkspace(WorkspaceAccessLevel.OWNER) WorkspaceMember member,
            HttpSession session,
            @Valid @RequestBody BillingMethodConfirmRequest request) {
        reauthenticationPolicy.requireRecent(session);
        return mutationService.registerPaymentMethod(
                member, request.authKey(), request.customerKey());
    }

    @PostMapping("/subscriptions/purchase")
    public BillingChargeResponse purchaseSubscription(
            @CurrentWorkspace(WorkspaceAccessLevel.OWNER) WorkspaceMember member,
            HttpSession session,
            @Valid @RequestBody SubscriptionPurchaseRequest request) {
        reauthenticationPolicy.requireRecent(session);
        return mutationService.purchaseSubscription(
                member, request.planCode(), request.billingCycle(), request.idempotencyKey());
    }

    @PostMapping("/point-packs/purchase")
    public BillingChargeResponse purchasePointPack(
            @CurrentWorkspace(WorkspaceAccessLevel.OWNER) WorkspaceMember member,
            HttpSession session,
            @Valid @RequestBody PointPackPurchaseRequest request) {
        reauthenticationPolicy.requireRecent(session);
        return mutationService.purchasePointPack(member, request.idempotencyKey());
    }

    @PostMapping("/seats/purchase")
    public BillingChargeResponse purchaseSeat(
            @CurrentWorkspace(WorkspaceAccessLevel.OWNER) WorkspaceMember member,
            HttpSession session,
            @Valid @RequestBody PointPackPurchaseRequest request) {
        reauthenticationPolicy.requireRecent(session);
        return mutationService.purchaseSeat(member, request.idempotencyKey());
    }

    @DeleteMapping("/subscription")
    public void cancelSubscription(
            @CurrentWorkspace(WorkspaceAccessLevel.OWNER) WorkspaceMember member,
            HttpSession session) {
        reauthenticationPolicy.requireRecent(session);
        mutationService.cancelSubscription(member);
    }

    @PostMapping("/subscription/resume")
    public void resumeSubscription(
            @CurrentWorkspace(WorkspaceAccessLevel.OWNER) WorkspaceMember member,
            HttpSession session) {
        reauthenticationPolicy.requireRecent(session);
        mutationService.resumeSubscription(member);
    }
}
