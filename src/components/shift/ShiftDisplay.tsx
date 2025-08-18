import React, { useState, useEffect } from 'react';
import { DESIGN_TOKENS } from '@/constants/design-tokens';
import { ICONS } from '@/constants/icons';
import NeumorphicCard from '@/components/base/NeumorphicCard';
import NeumorphicButton from '@/components/base/NeumorphicButton';
import { EnrichedShift } from '@/types/database';

interface ShiftDisplayProps {
  date: string;
  shifts: EnrichedShift[];
  positions: Array<{
    id: string;
    name: string;
    emoji: string;
    sortOrder: number;
  }>;
  onDateChange: (date: string) => void;
}

const ShiftDisplay: React.FC<ShiftDisplayProps> = ({
  date,
  shifts,
  positions,
  onDateChange
}) => {
  const [currentDate, setCurrentDate] = useState(date);

  useEffect(() => {
    setCurrentDate(date);
  }, [date]);

  const navigateDate = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + direction);
    const newDateString = newDate.toISOString().split('T')[0];
    setCurrentDate(newDateString);
    onDateChange(newDateString);
  };

  const navigateToToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setCurrentDate(today);
    onDateChange(today);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };


  const groupShiftsByPosition = () => {
    const grouped: Record<string, EnrichedShift[]> = {};
    
    positions.forEach(position => {
      grouped[position.id] = shifts.filter(shift => shift.positionId === position.id);
    });
    
    return grouped;
  };

  const headerStyles: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: DESIGN_TOKENS.spacing.lg,
    padding: DESIGN_TOKENS.spacing.md
  };

  const titleStyles: React.CSSProperties = {
    fontSize: DESIGN_TOKENS.typography.fontSize.xl,
    fontWeight: DESIGN_TOKENS.typography.fontWeight.bold,
    color: DESIGN_TOKENS.colors.text.primary
  };

  const navigationStyles: React.CSSProperties = {
    display: 'flex',
    gap: DESIGN_TOKENS.spacing.sm,
    alignItems: 'center'
  };

  const positionSectionStyles: React.CSSProperties = {
    marginBottom: DESIGN_TOKENS.spacing.lg
  };

  const positionHeaderStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: DESIGN_TOKENS.spacing.sm,
    marginBottom: DESIGN_TOKENS.spacing.md,
    fontSize: DESIGN_TOKENS.typography.fontSize.lg,
    fontWeight: DESIGN_TOKENS.typography.fontWeight.semibold,
    color: DESIGN_TOKENS.colors.text.primary
  };

  const shiftItemStyles: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: DESIGN_TOKENS.spacing.md,
    marginBottom: DESIGN_TOKENS.spacing.sm,
    fontSize: DESIGN_TOKENS.typography.fontSize.sm,
    backgroundColor: DESIGN_TOKENS.colors.background.elevated,
    borderRadius: DESIGN_TOKENS.borderRadius.sm,
    boxShadow: DESIGN_TOKENS.shadows.neumorphic.subtle
  };

  const statusBadgeStyles = (status: string): React.CSSProperties => {
    const statusColors = {
      'confirmed': DESIGN_TOKENS.colors.accent.success,
      'draft': DESIGN_TOKENS.colors.accent.warning,
      'preview': DESIGN_TOKENS.colors.accent.secondary,
      'locked': DESIGN_TOKENS.colors.text.muted
    };

    return {
      padding: `${DESIGN_TOKENS.spacing.xs} ${DESIGN_TOKENS.spacing.sm}`,
      borderRadius: DESIGN_TOKENS.borderRadius.sm,
      fontSize: DESIGN_TOKENS.typography.fontSize.xs,
      fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
      color: DESIGN_TOKENS.colors.background.primary,
      backgroundColor: statusColors[status as keyof typeof statusColors] || DESIGN_TOKENS.colors.text.muted
    };
  };

  const emptyStateStyles: React.CSSProperties = {
    textAlign: 'center',
    padding: DESIGN_TOKENS.spacing.xl,
    color: DESIGN_TOKENS.colors.text.muted,
    fontSize: DESIGN_TOKENS.typography.fontSize.sm
  };

  const groupedShifts = groupShiftsByPosition();

  return (
    <div>
      {/* ヘッダー */}
      <NeumorphicCard padding="md" className="mb-6">
        <div style={headerStyles}>
          <div>
            <h1 style={titleStyles}>{formatDate(currentDate)}</h1>
          </div>
          
          <div style={navigationStyles}>
            <NeumorphicButton
              size="sm"
              color="secondary"
              icon={ICONS.navigation.ArrowLeft}
              onClick={() => navigateDate(-1)}
            />
            <NeumorphicButton
              size="sm"
              color="primary"
              onClick={navigateToToday}
            >
              今日
            </NeumorphicButton>
            <NeumorphicButton
              size="sm"
              color="secondary"
              icon={ICONS.navigation.ArrowRight}
              onClick={() => navigateDate(1)}
            />
          </div>
        </div>
      </NeumorphicCard>

      {/* シフト表示 */}
      <div>
        {positions.map(position => {
          const positionShifts = groupedShifts[position.id] || [];
          
          return (
            <div key={position.id} style={positionSectionStyles}>
              <NeumorphicCard padding="lg" hoverable>
                <div style={positionHeaderStyles}>
                  <span>{position.emoji}</span>
                  <span>{position.name}</span>
                  <span style={{ fontSize: DESIGN_TOKENS.typography.fontSize.sm, color: DESIGN_TOKENS.colors.text.muted }}>
                    ({positionShifts.length}名)
                  </span>
                </div>

                {positionShifts.length > 0 ? (
                  positionShifts.map(shift => (
                    <div key={shift.id} style={shiftItemStyles}>
                      <div>
                        <div style={{ fontWeight: DESIGN_TOKENS.typography.fontWeight.medium }}>
                          {shift.user?.displayName || 'Unknown User'}
                        </div>
                        <div style={{ color: DESIGN_TOKENS.colors.text.muted }}>
                          {shift.startTime} - {shift.endTime}
                          {shift.breakMinutes > 0 && ` (休憩 ${shift.breakMinutes}分)`}
                        </div>
                      </div>
                      <div style={statusBadgeStyles(shift.status)}>
                        {shift.status === 'confirmed' ? '確定' : 
                         shift.status === 'draft' ? '下書き' : 
                         shift.status === 'preview' ? 'プレビュー' : '固定'}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={emptyStateStyles}>
                    {position.name}にシフトが登録されていません
                  </div>
                )}
              </NeumorphicCard>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ShiftDisplay;