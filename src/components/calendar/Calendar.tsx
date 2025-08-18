import React, { useState, useEffect } from 'react';
import NeumorphicCard from '@/components/base/NeumorphicCard';
import NeumorphicButton from '@/components/base/NeumorphicButton';
import { ICONS } from '@/constants/icons';

interface CalendarProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  onClose: () => void;
}

const Calendar: React.FC<CalendarProps> = ({
  selectedDate,
  onDateSelect,
  onClose
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long'
    });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startWeekday = firstDay.getDay();

    const formatDateString = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const days = [];
    
    // 前月の末尾の日付を追加
    for (let i = 0; i < startWeekday; i++) {
      const prevMonthDate = new Date(year, month, -startWeekday + i + 1);
      days.push({
        date: prevMonthDate,
        isCurrentMonth: false,
        dateString: formatDateString(prevMonthDate)
      });
    }

    // 当月の日付を追加
    for (let i = 1; i <= daysInMonth; i++) {
      const currentDate = new Date(year, month, i);
      days.push({
        date: currentDate,
        isCurrentMonth: true,
        dateString: formatDateString(currentDate)
      });
    }

    // 次月の最初の日付を追加（42日分になるまで）
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const nextMonthDate = new Date(year, month + 1, i);
      days.push({
        date: nextMonthDate,
        isCurrentMonth: false,
        dateString: formatDateString(nextMonthDate)
      });
    }

    return days;
  };

  const navigateMonth = (direction: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  // 今日の日付をローカル時刻で取得
  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const navigateToToday = () => {
    setCurrentMonth(new Date());
    // 今日の日付を選択してカレンダーを閉じる
    const todayString = getTodayString();
    onDateSelect(todayString);
    onClose();
  };

  const handleDateClick = (dateString: string) => {
    onDateSelect(dateString);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const days = getDaysInMonth(currentMonth);
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const today = getTodayString();

  return (
    <div className="calendar-overlay" onClick={handleOverlayClick}>
      <NeumorphicCard padding="lg" className="calendar-container">
        {/* ヘッダー */}

        {/* 今日ボタン */}
        <div className="calendar-today-section">
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
            icon={ICONS.actions.X}
            onClick={onClose}
          />
        </div>
        <div className="calendar-header">
          <NeumorphicButton
            size="sm"
            color="secondary"
            icon={ICONS.navigation.ArrowLeft}
            onClick={() => navigateMonth(-1)}
          />
          <h2 className="calendar-month-title">{formatMonth(currentMonth)}</h2>
          <NeumorphicButton
            size="sm"
            color="secondary"
            icon={ICONS.navigation.ArrowRight}
            onClick={() => navigateMonth(1)}
          />
        </div>

        {/* 曜日ヘッダー */}
        <div className="calendar-weekdays">
          {weekdays.map((weekday, index) => (
            <div 
              key={weekday} 
              className={`calendar-weekday ${index === 0 ? 'sunday' : index === 6 ? 'saturday' : ''}`}
            >
              {weekday}
            </div>
          ))}
        </div>

        {/* 日付グリッド */}
        <div className="calendar-grid">
          {days.map((day, index) => (
            <button
              key={index}
              className={`calendar-day ${
                !day.isCurrentMonth ? 'other-month' : ''
              } ${
                day.dateString === selectedDate ? 'selected' : ''
              } ${
                day.dateString === today ? 'today' : ''
              } ${
                index % 7 === 0 ? 'sunday' : index % 7 === 6 ? 'saturday' : ''
              }`}
              onClick={() => handleDateClick(day.dateString)}
            >
              {day.date.getDate()}
            </button>
          ))}
        </div>
      </NeumorphicCard>
    </div>
  );
};

export default Calendar;