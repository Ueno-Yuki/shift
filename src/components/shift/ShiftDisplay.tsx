import React, { useState, useEffect } from 'react';
import { ICONS } from '@/constants/icons';
import NeumorphicCard from '@/components/base/NeumorphicCard';
import NeumorphicButton from '@/components/base/NeumorphicButton';
import Calendar from '@/components/calendar/Calendar';
import ShiftTable from '@/components/shift/ShiftTable';
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
  users: Array<{
    lineUserId: string;
    displayName: string;
    role: string;
    isActive: boolean;
  }>;
  onDateChange: (date: string) => void;
}

const ShiftDisplay: React.FC<ShiftDisplayProps> = ({
  date,
  shifts,
  positions,
  users,
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
      <div className="shift-section">
        <ShiftTable
          date={currentDate}
          shifts={shifts}
          positions={positions} 
          users={users}
        />
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