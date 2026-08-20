'use client';

import { AdminPageHeader } from '@/components/admin/common/AdminPageHeader';
import { RecentReauthenticationStatus } from '@/components/admin/security/RecentReauthenticationStatus';
import type { WorkspaceRole } from '@/lib/api';
import { WorkspaceAddressSettings } from './WorkspaceAddressSettings';
import { WorkspaceRenameSettings } from './WorkspaceRenameSettings';
import { WorkspaceLeaveSettings } from './WorkspaceLeaveSettings';
import { WorkspaceCloseSettings } from './WorkspaceCloseSettings';

type Props = {
    workspaceSlug: string;
    workspaceName: string;
    role: WorkspaceRole;
};

export function WorkspaceSettingsPanel({ workspaceSlug, workspaceName, role }: Props) {
    return (
        <div className="space-y-4">
            <AdminPageHeader
                eyebrow="Workspace Settings"
                title="주소·이름·탈퇴·폐쇄 설정"
                description="자주 사용하지 않는 Workspace 기본 설정을 관리합니다."
            />

            <RecentReauthenticationStatus description="주소 변경·이름 변경·탈퇴·폐쇄는 모두 최근 10분 안에 현재 비밀번호를 확인해야 합니다. 한 번 확인하면 남은 시간 동안 이 페이지의 모든 작업에 적용됩니다." />

            <WorkspaceAddressSettings workspaceSlug={workspaceSlug} role={role} />
            <WorkspaceRenameSettings
                workspaceSlug={workspaceSlug}
                workspaceName={workspaceName}
                role={role}
            />
            <WorkspaceLeaveSettings workspaceSlug={workspaceSlug} role={role} />
            <WorkspaceCloseSettings
                workspaceSlug={workspaceSlug}
                workspaceName={workspaceName}
                role={role}
            />
        </div>
    );
}
