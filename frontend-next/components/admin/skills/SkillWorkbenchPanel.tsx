'use client';

import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type Dispatch,
    type FormEvent,
    type SetStateAction,
} from 'react';
import { Clock3, Search, X } from 'lucide-react';
import type { Experience, Skill, Study } from '@/lib/api/types';
import type { SkillProposal } from '@/lib/api/skillProposal';
import { SkillBadgeIcon } from '@/lib/SkillBadgeIcon';
import { LinkedItemPicker } from '@/components/admin/shared/LinkedItemPicker';
import { CatalogSkillPicker } from './CatalogSkillPicker';
import { getSkillCategoryPresentation, skillCategoryPresentations } from './skillPresentation';
import type { SkillForm } from './SkillsManagement';

const FIELD_LABEL_CLASS = 'mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400';
const FIELD_INPUT_CLASS =
    'w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm transition focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200';

const skillUsageOptions = [
    { value: 'LEARNING', label: '학습' },
    { value: 'WORK_EXPERIENCE', label: '실무 경험' },
    { value: 'PROJECT_USE', label: '프로젝트 활용' },
];

type SkillWorkbenchPanelProps = {
    skillsList: Skill[] | undefined;
    availableCatalogSkills: Skill[];
    skillEditingId: number | null;
    skillForm: SkillForm;
    setSkillForm: Dispatch<SetStateAction<SkillForm>>;
    studies: Study[] | undefined;
    experiencesList: Experience[] | undefined;
    onQuickAdd: (skill: Skill) => void;
    quickAddPendingId: number | null;
    onSelectSkill: (skill: Skill) => void;
    onDeselect: () => void;
    onSaveEdit: (event: FormEvent<HTMLFormElement>) => void;
    onDeleteSkill: (id: number) => void;
    onClose: () => void;
    isSaving: boolean;
    proposals: SkillProposal[] | undefined;
    onPropose: (name: string, category: string) => void;
    isProposing: boolean;
};

export function SkillWorkbenchPanel({
    skillsList,
    availableCatalogSkills,
    skillEditingId,
    skillForm,
    setSkillForm,
    studies,
    experiencesList,
    onQuickAdd,
    quickAddPendingId,
    onSelectSkill,
    onDeselect,
    onSaveEdit,
    onDeleteSkill,
    onClose,
    isSaving,
    proposals,
    onPropose,
    isProposing,
}: SkillWorkbenchPanelProps) {
    const [leftSearch, setLeftSearch] = useState('');
    const keyword = leftSearch.trim().toLowerCase();

    // 화면 상단 레이아웃(계정 유형에 따라 상단 바 구성이 달라짐) 높이가 매번 달라서
    // 고정 px로 오프셋을 추정하면 어긋난다. 실제 렌더된 위치를 측정해 뷰포트에
    // 딱 맞는 높이를 구하고, 그 값만큼만 내부에서 스크롤되도록 한다.
    const splitRowRef = useRef<HTMLDivElement | null>(null);
    const [paneHeight, setPaneHeight] = useState(416);

    useEffect(() => {
        const updateHeight = () => {
            const top = splitRowRef.current?.getBoundingClientRect().top ?? 0;
            const available = window.innerHeight - top - 24;
            setPaneHeight(Math.max(416, Math.floor(available)));
        };
        updateHeight();
        window.addEventListener('resize', updateHeight);
        return () => window.removeEventListener('resize', updateHeight);
    }, []);

    const groupedVisibleSkills = useMemo(() => {
        const sorted = (skillsList ?? [])
            .filter((skill) => !keyword || skill.name.toLowerCase().includes(keyword))
            .sort((a, b) => a.name.localeCompare(b.name));
        const knownGroups = skillCategoryPresentations
            .map((category) => ({
                category,
                skills: sorted.filter((skill) => skill.category === category.key),
            }))
            .filter((group) => group.skills.length > 0);
        const knownKeys = new Set(skillCategoryPresentations.map((category) => category.key));
        const unknownSkills = sorted.filter((skill) => !knownKeys.has(skill.category));
        if (unknownSkills.length > 0) {
            knownGroups.push({
                category: getSkillCategoryPresentation(unknownSkills[0].category),
                skills: unknownSkills,
            });
        }
        return knownGroups;
    }, [skillsList, keyword]);
    const visibleSkillCount = groupedVisibleSkills.reduce(
        (sum, group) => sum + group.skills.length,
        0
    );

    const experienceDetails = (experiencesList ?? []).flatMap((experience) =>
        experience.details.map((detail) => ({
            ...detail,
            experienceTitle: experience.title,
        }))
    );

    const openProposals = (proposals ?? []).filter(
        (proposal) => proposal.reviewStatus !== 'APPROVED'
    );

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <h3 className="text-base font-black text-slate-800">기술 스택 편집</h3>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="패널 닫기"
                    className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            <div
                ref={splitRowRef}
                className="grid grid-cols-1 lg:grid-cols-[280px_1fr] lg:divide-x lg:divide-slate-200"
            >
                <aside
                    style={{ height: paneHeight }}
                    className="flex flex-col border-b border-slate-200 p-4 lg:border-b-0"
                >
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                        선택된 기술 리스트 · {(skillsList ?? []).length}개
                    </p>
                    <div className="relative mb-2">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <input
                            type="search"
                            value={leftSearch}
                            onChange={(event) => setLeftSearch(event.target.value)}
                            placeholder="기술명 검색"
                            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-8 pr-3 text-xs outline-none transition focus:border-slate-800 focus:bg-white"
                        />
                    </div>
                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
                        {openProposals.length > 0 && (
                            <div>
                                <p className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    내가 제안한 기술 · {openProposals.length}
                                </p>
                                <div className="space-y-1">
                                    {openProposals.map((proposal) => (
                                        <div
                                            key={proposal.id}
                                            title={proposal.rejectionReason ?? undefined}
                                            className="rounded-lg border border-dashed border-slate-200 p-2.5"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="truncate text-sm font-black text-slate-700">
                                                    {proposal.name}
                                                </span>
                                                {proposal.reviewStatus === 'PENDING_REVIEW' ? (
                                                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                                        <Clock3 className="h-3 w-3" /> 심사중
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                                                        반려됨
                                                    </span>
                                                )}
                                            </div>
                                            {proposal.reviewStatus === 'REJECTED' &&
                                                proposal.rejectionReason && (
                                                    <p className="mt-1 truncate text-[11px] font-medium text-rose-500">
                                                        {proposal.rejectionReason}
                                                    </p>
                                                )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {groupedVisibleSkills.map(({ category, skills }) => (
                            <div key={category.key}>
                                <p className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    {category.label} · {skills.length}
                                </p>
                                <div className="space-y-1">
                                    {skills.map((skill) => (
                                        <button
                                            key={skill.id}
                                            type="button"
                                            onClick={() => onSelectSkill(skill)}
                                            className={`flex w-full items-center gap-2.5 rounded-lg border p-2.5 text-left transition ${
                                                skillEditingId === skill.id
                                                    ? 'border-slate-900 bg-slate-50 ring-2 ring-slate-200'
                                                    : 'border-transparent hover:bg-slate-50'
                                            }`}
                                        >
                                            <SkillBadgeIcon
                                                name={skill.name}
                                                badgeKey={skill.badgeKey}
                                                badgeColor={skill.badgeColor}
                                                className="h-8 w-8"
                                            />
                                            <span className="min-w-0">
                                                <span className="block truncate text-sm font-black text-slate-900">
                                                    {skill.name}
                                                </span>
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {visibleSkillCount === 0 && (
                            <p className="py-4 text-center text-xs font-semibold text-slate-400">
                                검색 결과가 없습니다.
                            </p>
                        )}
                    </div>
                </aside>

                <section style={{ height: paneHeight }} className="flex flex-col">
                    {skillEditingId === null ? (
                        <div className="min-h-0 flex-1 overflow-y-auto p-6">
                            <p className="mb-3 text-sm font-black text-slate-800">
                                카탈로그에서 추가
                            </p>
                            <CatalogSkillPicker
                                catalogSkills={availableCatalogSkills}
                                pendingId={quickAddPendingId}
                                onSelect={onQuickAdd}
                                onPropose={onPropose}
                                isProposing={isProposing}
                            />
                            <p className="mt-3 text-xs font-medium text-slate-500">
                                카드를 클릭하면 기본값으로 바로 추가됩니다. 세부 설정은 좌측
                                목록에서 항목을 클릭해 조정할 수 있습니다.
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={onSaveEdit} className="flex min-h-0 flex-1 flex-col">
                            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
                                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <SkillBadgeIcon
                                        name={skillForm.name}
                                        badgeKey={skillForm.badgeKey}
                                        badgeColor={skillForm.badgeColor}
                                        className="h-9 w-9"
                                    />
                                    <div className="min-w-0">
                                        <p className="font-black text-slate-900">
                                            {skillForm.name}
                                        </p>
                                        <p className="text-xs font-semibold text-slate-500">
                                            {getSkillCategoryPresentation(skillForm.category).label}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                                    <div>
                                        <label className={FIELD_LABEL_CLASS}>실무 수준</label>
                                        <input
                                            type="text"
                                            value={skillForm.skillLevel}
                                            placeholder="예: 중급, 고급, 상"
                                            onChange={(e) =>
                                                setSkillForm({
                                                    ...skillForm,
                                                    skillLevel: e.target.value,
                                                })
                                            }
                                            className={FIELD_INPUT_CLASS}
                                        />
                                    </div>
                                    <div>
                                        <label className={FIELD_LABEL_CLASS}>사용 버전</label>
                                        <input
                                            type="text"
                                            value={skillForm.skillVersion}
                                            placeholder="예: 21, 3.3, 19"
                                            onChange={(e) =>
                                                setSkillForm({
                                                    ...skillForm,
                                                    skillVersion: e.target.value,
                                                })
                                            }
                                            className={FIELD_INPUT_CLASS}
                                        />
                                    </div>
                                    <div>
                                        <label className={FIELD_LABEL_CLASS}>활용 맥락</label>
                                        <select
                                            value={skillForm.usageType}
                                            onChange={(e) =>
                                                setSkillForm({
                                                    ...skillForm,
                                                    usageType: e.target.value,
                                                })
                                            }
                                            className={`${FIELD_INPUT_CLASS} bg-white`}
                                        >
                                            {skillUsageOptions.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={FIELD_LABEL_CLASS}>정렬 순서</label>
                                        <input
                                            type="number"
                                            required
                                            value={skillForm.displayOrder}
                                            onChange={(e) =>
                                                setSkillForm({
                                                    ...skillForm,
                                                    displayOrder: Number(e.target.value),
                                                })
                                            }
                                            className={FIELD_INPUT_CLASS}
                                        />
                                    </div>
                                    <div className="flex items-center pt-5">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={skillForm.isCore}
                                                onChange={(e) =>
                                                    setSkillForm({
                                                        ...skillForm,
                                                        isCore: e.target.checked,
                                                    })
                                                }
                                                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-800"
                                            />
                                            <span className="text-xs font-bold text-slate-600 uppercase">
                                                핵심기술로 표시
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className={FIELD_LABEL_CLASS}>경험 메모</label>
                                    <textarea
                                        rows={3}
                                        value={skillForm.comment}
                                        placeholder="이 기술을 어느 수준으로, 어디에 활용했는지 짧게 남깁니다."
                                        onChange={(e) =>
                                            setSkillForm({ ...skillForm, comment: e.target.value })
                                        }
                                        className={FIELD_INPUT_CLASS}
                                    />
                                </div>

                                <div className="grid gap-4 lg:grid-cols-3">
                                    <LinkedItemPicker
                                        items={studies ?? []}
                                        selectedIds={skillForm.studyIds}
                                        onChange={(ids) =>
                                            setSkillForm((current) => ({
                                                ...current,
                                                studyIds: ids,
                                            }))
                                        }
                                        getId={(study) => study.id}
                                        getSearchText={(study) => study.title}
                                        renderLabel={(study) => study.title}
                                        label="관련 Study"
                                        searchPlaceholder="Study 제목 검색"
                                    />

                                    <LinkedItemPicker
                                        items={experiencesList ?? []}
                                        selectedIds={skillForm.experienceIds}
                                        onChange={(ids) =>
                                            setSkillForm((current) => ({
                                                ...current,
                                                experienceIds: ids,
                                            }))
                                        }
                                        getId={(experience) => experience.id}
                                        getSearchText={(experience) =>
                                            `${experience.title} ${experience.type}`
                                        }
                                        renderLabel={(experience) => (
                                            <>
                                                <b className="mr-1 text-slate-400">
                                                    {experience.type}
                                                </b>
                                                {experience.title}
                                            </>
                                        )}
                                        label="관련 프로젝트·이력"
                                        searchPlaceholder="제목 또는 유형 검색"
                                    />

                                    <LinkedItemPicker
                                        items={experienceDetails}
                                        selectedIds={skillForm.experienceDetailIds}
                                        onChange={(ids) =>
                                            setSkillForm((current) => ({
                                                ...current,
                                                experienceDetailIds: ids,
                                            }))
                                        }
                                        getId={(detail) => detail.id}
                                        getSearchText={(detail) =>
                                            `${detail.content} ${detail.experienceTitle}`
                                        }
                                        renderLabel={(detail) => (
                                            <>
                                                <b className="block text-slate-400">
                                                    {detail.experienceTitle}
                                                </b>
                                                {detail.content}
                                            </>
                                        )}
                                        label="관련 경력 상세"
                                        searchPlaceholder="경력 또는 상세 내용 검색"
                                    />
                                </div>
                            </div>

                            <div className="flex shrink-0 justify-between gap-3 border-t border-slate-200 px-6 py-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (skillEditingId !== null) onDeleteSkill(skillEditingId);
                                    }}
                                    className="rounded-xl border border-rose-200 px-5 py-2.5 text-sm font-bold text-rose-600 transition hover:bg-rose-50"
                                >
                                    삭제
                                </button>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={onDeselect}
                                        className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                                    >
                                        취소
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-slate-800 disabled:opacity-50"
                                    >
                                        수정 완료
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}
                </section>
            </div>
        </div>
    );
}
