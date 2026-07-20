import { useEffect, useState } from 'react';
import { buildSkillBadgeUrl, resolveSkillBadge } from './skillBadges';

type SkillBadgeIconProps = {
  name: string;
  badgeKey?: string | null;
  badgeColor?: string | null;
  className?: string;
};

export function SkillBadgeIcon({ name, badgeKey, badgeColor, className = 'h-5 w-5' }: SkillBadgeIconProps) {
  const badge = resolveSkillBadge(name, badgeKey, badgeColor);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => setLoadFailed(false), [badge?.key, badge?.color]);

  if (badgeKey === 'none') return null;

  if (!badge || loadFailed) {
    return (
      <span
        aria-hidden="true"
        className={`inline-flex shrink-0 items-center justify-center rounded bg-slate-100 text-[10px] font-black text-slate-500 ${className}`}
      >
        {name.trim().charAt(0).toUpperCase() || '?'}
      </span>
    );
  }

  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded bg-white p-0.5 ${className}`} aria-hidden="true">
      <img
        src={badge.iconUrl ?? buildSkillBadgeUrl(badge.key, badge.color)}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        className="h-full w-full object-contain"
        onError={() => setLoadFailed(true)}
      />
    </span>
  );
}
