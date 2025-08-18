import React, { useState, useEffect } from 'react';
import { ICONS } from '@/constants/icons';
import NeumorphicCard from '@/components/base/NeumorphicCard';
import NeumorphicButton from '@/components/base/NeumorphicButton';
import Calendar from '@/components/calendar/Calendar';
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
  const [showCalendar, setShowCalendar] = useState(false);

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
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayString = `${year}-${month}-${day}`;
    setCurrentDate(todayString);
    onDateChange(todayString);
  };

  const handleCalendarToggle = () => {
    setShowCalendar(!showCalendar);
  };

  const handleDateSelect = (selectedDate: string) => {
    setCurrentDate(selectedDate);
    onDateChange(selectedDate);
    setShowCalendar(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[date.getDay()];
    return `${year}/${month}/${day}（${weekday}）`;
  };


  const groupShiftsByPosition = () => {
    const grouped: Record<string, EnrichedShift[]> = {};
    
    positions.forEach(position => {
      grouped[position.id] = shifts.filter(shift => shift.positionId === position.id);
    });
    
    return grouped;
  };

  // CSSクラスで代替するため、インラインスタイルを削除

  const groupedShifts = groupShiftsByPosition();

  return (
    <div>
      {/* ヘッダー */}
      <NeumorphicCard padding="xs" className="mb-lg">
        <div className="shift-header">
          <div className="shift-title-section">
            <h1 className="shift-title">{formatDate(currentDate)}</h1>
          </div>
          
          <div className="shift-navigation">
            <NeumorphicButton
              size="sm"
              color="secondary"
              icon={ICONS.time.Calendar}
              onClick={handleCalendarToggle}
            />
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
            <div key={position.id} className="shift-section">
              <NeumorphicCard padding="lg" hoverable>
                <div className="shift-position-header">
                  <span className="position-icon">{position.emoji}</span>
                  <span className="position-title">{position.name}</span>
                  <span className="position-count">
                    ({positionShifts.length}名)
                  </span>
                </div>

                {positionShifts.length > 0 ? (
                  positionShifts.map(shift => (
                    <div key={shift.id} className="neumorphic-base neumorphic-raised p-md mb-sm">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-primary">
                            {shift.user?.displayName || 'Unknown User'}
                          </div>
                          <div className="text-sm text-muted">
                            {shift.startTime} - {shift.endTime}
                            {shift.breakMinutes > 0 && ` (休憩 ${shift.breakMinutes}分)`}
                          </div>
                        </div>
                        <div className={`p-xs text-xs font-medium ${
                          shift.status === 'confirmed' ? 'neumorphic-success' : 
                          shift.status === 'draft' ? 'neumorphic-warning' : 
                          shift.status === 'preview' ? 'neumorphic-secondary' : 'text-muted'
                        }`}>
                          {shift.status === 'confirmed' ? '確定' : 
                           shift.status === 'draft' ? '下書き' : 
                           shift.status === 'preview' ? 'プレビュー' : '固定'}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    {position.name}にシフトが登録されていません
                  </div>
                )}
              </NeumorphicCard>
            </div>
          );
        })}
      </div>

      {/* カレンダーモーダル */}
      {showCalendar && (
        <Calendar
          selectedDate={currentDate}
          onDateSelect={handleDateSelect}
          onClose={() => setShowCalendar(false)}
        />
      )}
    </div>
  );
};

export default ShiftDisplay;