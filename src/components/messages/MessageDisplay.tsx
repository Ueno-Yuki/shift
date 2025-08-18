import React from 'react';
import { DESIGN_TOKENS } from '@/constants/design-tokens';
import { ICONS } from '@/constants/icons';
import NeumorphicCard from '@/components/base/NeumorphicCard';
import { DailyMessage } from '@/types/database';

interface MessageDisplayProps {
  messages: DailyMessage[];
  date: string;
}

const MessageDisplay: React.FC<MessageDisplayProps> = ({ messages, date }) => {
  const getMessageTypeIcon = (messageType: string) => {
    switch (messageType) {
      case 'line_import':
        return ICONS.user.MessageCircle;
      case 'admin_memo':
        return ICONS.system.Settings;
      case 'system':
        return ICONS.status.Info;
      case 'chat':
      default:
        return ICONS.user.MessageCircle;
    }
  };

  const getMessageTypeColor = (messageType: string) => {
    switch (messageType) {
      case 'line_import':
        return DESIGN_TOKENS.colors.accent.primary;
      case 'admin_memo':
        return DESIGN_TOKENS.colors.accent.warning;
      case 'system':
        return DESIGN_TOKENS.colors.text.muted;
      case 'chat':
      default:
        return DESIGN_TOKENS.colors.accent.secondary;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      month: 'long',
      day: 'numeric',
      weekday: 'long'
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

  const messageItemStyles: React.CSSProperties = {
    display: 'flex',
    gap: DESIGN_TOKENS.spacing.sm,
    marginBottom: DESIGN_TOKENS.spacing.md,
    padding: DESIGN_TOKENS.spacing.md,
    backgroundColor: DESIGN_TOKENS.colors.background.elevated,
    borderRadius: DESIGN_TOKENS.borderRadius.sm,
    boxShadow: DESIGN_TOKENS.shadows.neumorphic.subtle
  };

  const messageIconStyles = (messageType: string): React.CSSProperties => ({
    flexShrink: 0,
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: DESIGN_TOKENS.borderRadius.full,
    backgroundColor: `${getMessageTypeColor(messageType)}20`,
    color: getMessageTypeColor(messageType)
  });

  const messageContentStyles: React.CSSProperties = {
    flex: 1
  };

  const messageHeaderStyles: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: DESIGN_TOKENS.spacing.xs
  };

  const userNameStyles: React.CSSProperties = {
    fontSize: DESIGN_TOKENS.typography.fontSize.sm,
    fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
    color: DESIGN_TOKENS.colors.text.primary
  };

  const timeStyles: React.CSSProperties = {
    fontSize: DESIGN_TOKENS.typography.fontSize.xs,
    color: DESIGN_TOKENS.colors.text.muted
  };

  const messageTextStyles = (isPrivate: boolean): React.CSSProperties => ({
    fontSize: DESIGN_TOKENS.typography.fontSize.sm,
    color: isPrivate ? DESIGN_TOKENS.colors.text.muted : DESIGN_TOKENS.colors.text.secondary,
    lineHeight: 1.5,
    fontStyle: isPrivate ? 'italic' : 'normal'
  });

  const privateIndicatorStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: DESIGN_TOKENS.spacing.xs,
    padding: `${DESIGN_TOKENS.spacing.xs} ${DESIGN_TOKENS.spacing.sm}`,
    borderRadius: DESIGN_TOKENS.borderRadius.sm,
    fontSize: DESIGN_TOKENS.typography.fontSize.xs,
    fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
    color: DESIGN_TOKENS.colors.background.primary,
    backgroundColor: DESIGN_TOKENS.colors.text.muted,
    marginLeft: DESIGN_TOKENS.spacing.sm
  };

  const emptyStateStyles: React.CSSProperties = {
    textAlign: 'center',
    padding: DESIGN_TOKENS.spacing.xl,
    color: DESIGN_TOKENS.colors.text.muted,
    fontSize: DESIGN_TOKENS.typography.fontSize.sm
  };

  // メッセージを時間順にソート
  const sortedMessages = [...messages].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return (
    <div style={containerStyles}>
      <NeumorphicCard padding="lg" hoverable>
        <div style={headerStyles}>
          <ICONS.user.MessageCircle size={20} />
          <span>{formatDate(date)} のメッセージ</span>
          <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.sm, color: DESIGN_TOKENS.colors.text.muted }}>
            ({messages.length}件)
          </span>
        </div>

        {sortedMessages.length > 0 ? (
          sortedMessages.map(message => {
            const MessageIcon = getMessageTypeIcon(message.messageType);
            
            return (
              <div key={message.id} style={messageItemStyles}>
                <div style={messageIconStyles(message.messageType)}>
                  <MessageIcon size={16} />
                </div>
                
                <div style={messageContentStyles}>
                  <div style={messageHeaderStyles}>
                    <div style={userNameStyles}>
                      {message.userName}
                      {message.isPrivate && (
                        <span style={privateIndicatorStyles}>
                          <ICONS.status.EyeOff size={10} />
                          管理者のみ
                        </span>
                      )}
                    </div>
                    <div style={timeStyles}>
                      {formatTime(message.createdAt)}
                    </div>
                  </div>
                  
                  <div style={messageTextStyles(message.isPrivate)}>
                    {message.message}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div style={emptyStateStyles}>
            この日のメッセージはありません
          </div>
        )}
      </NeumorphicCard>
    </div>
  );
};

export default MessageDisplay;