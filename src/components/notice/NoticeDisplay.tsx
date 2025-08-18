import React from 'react';
import { DESIGN_TOKENS } from '@/constants/design-tokens';
import { ICONS } from '@/constants/icons';
import NeumorphicCard from '@/components/base/NeumorphicCard';
import { Notice } from '@/types/database';

interface NoticeDisplayProps {
  notices: Notice[];
}

const NoticeDisplay: React.FC<NoticeDisplayProps> = ({ notices }) => {
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return ICONS.status.AlertTriangle;
      case 'high':
        return ICONS.status.Info;
      case 'medium':
        return ICONS.status.CheckCircle;
      case 'low':
        return ICONS.misc.Tag;

        default:
        return ICONS.status.Info;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return DESIGN_TOKENS.colors.accent.error;
      case 'high':
        return DESIGN_TOKENS.colors.accent.warning;
      case 'medium':
        return DESIGN_TOKENS.colors.accent.primary;
      case 'low':
        return DESIGN_TOKENS.colors.text.muted;
      default:
        return DESIGN_TOKENS.colors.text.muted;
    }
  };

  const getCategoryEmoji = (category: string) => {
    switch (category) {
      case 'equipment':
        return ICONS.system.Wrench;
      case 'staff':
        return ICONS.user.Users;
      case 'operation':
        return ICONS.misc.ClipboardCheck;
      default:
        return ICONS.status.Info;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric'
    });
  };

  const containerStyles: React.CSSProperties = {
    marginBottom: DESIGN_TOKENS.spacing.lg
  };

  const headerStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: DESIGN_TOKENS.spacing.sm,
    marginBottom: DESIGN_TOKENS.spacing.md,
    fontSize: DESIGN_TOKENS.typography.fontSize.lg,
    fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
    color: DESIGN_TOKENS.colors.text.primary
  };

  const noticeItemStyles: React.CSSProperties = {
    marginBottom: DESIGN_TOKENS.spacing.md
  };

  const noticeHeaderStyles: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: DESIGN_TOKENS.spacing.sm
  };

  const noticeTitleStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: DESIGN_TOKENS.spacing.sm,
    fontSize: DESIGN_TOKENS.typography.fontSize.md,
    fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
    color: DESIGN_TOKENS.colors.text.primary,
    flex: 1
  };

  const priorityBadgeStyles = (priority: string): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: DESIGN_TOKENS.spacing.xs,
    padding: `${DESIGN_TOKENS.spacing.xs} ${DESIGN_TOKENS.spacing.sm}`,
    borderRadius: DESIGN_TOKENS.borderRadius.sm,
    fontSize: DESIGN_TOKENS.typography.fontSize.xs,
    fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
    color: DESIGN_TOKENS.colors.background.primary,
    backgroundColor: getPriorityColor(priority)
  });

  const noticeContentStyles: React.CSSProperties = {
    fontSize: DESIGN_TOKENS.typography.fontSize.sm,
    color: DESIGN_TOKENS.colors.text.secondary,
    lineHeight: 1.5,
    marginBottom: DESIGN_TOKENS.spacing.sm
  };

  const noticeMetaStyles: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: DESIGN_TOKENS.typography.fontSize.xs,
    color: DESIGN_TOKENS.colors.text.muted
  };

  const emptyStateStyles: React.CSSProperties = {
    textAlign: 'center',
    padding: DESIGN_TOKENS.spacing.xl,
    color: DESIGN_TOKENS.colors.text.muted,
    fontSize: DESIGN_TOKENS.typography.fontSize.sm
  };

  if (notices.length === 0) {
    return (
      <div style={containerStyles}>
        <NeumorphicCard padding="lg">
          <div style={headerStyles}>
            <ICONS.system.Bell size={20} />
            <span>共有事項</span>
          </div>
          <div style={emptyStateStyles}>
            現在、共有事項はありません
          </div>
        </NeumorphicCard>
      </div>
    );
  }

  return (
    <div style={containerStyles}>
      <NeumorphicCard padding="lg" hoverable>
        <div style={headerStyles}>
          <ICONS.system.Bell size={20} />
          <span>共有事項</span>
          <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.sm, color: DESIGN_TOKENS.colors.text.muted }}>
            ({notices.length}件)
          </span>
        </div>

        {notices.map(notice => {
          const PriorityIcon = getPriorityIcon(notice.priority);
          
          return (
            <div key={notice.id} style={noticeItemStyles}>
              <div style={noticeHeaderStyles}>
                <div style={noticeTitleStyles}>
                {React.createElement(getCategoryEmoji(notice.category), { size: 16 })}
                  <span>{notice.title}</span>
                </div>
                <div style={priorityBadgeStyles(notice.priority)}>
                  <PriorityIcon size={12} />
                  <span>
                    {notice.priority === 'urgent' ? '緊急' :
                     notice.priority === 'high' ? '重要' :
                     notice.priority === 'medium' ? '通常' : '低'}
                  </span>
                </div>
              </div>

              <div style={noticeContentStyles}>
                {notice.content}
              </div>

              <div style={noticeMetaStyles}>
                <span>
                  {formatDate(notice.startDate)}
                  {notice.endDate && ` 〜 ${formatDate(notice.endDate)}`}
                </span>
                <span>
                  {notice.category === 'equipment' ? '設備' :
                   notice.category === 'staff' ? 'スタッフ' :
                   notice.category === 'operation' ? '運営' : 'その他'}
                </span>
              </div>
            </div>
          );
        })}
      </NeumorphicCard>
    </div>
  );
};

export default NoticeDisplay;