import React, { useState } from 'react';
import NeumorphicCard from '@/components/base/NeumorphicCard';
import { EnrichedShift } from '@/types/database';

interface ShiftTableProps {
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
}

const ShiftTable: React.FC<ShiftTableProps> = ({
  date,
  shifts,
  positions,
  users
}) => {
  const [shiftMode, setShiftMode] = useState<'confirmed' | 'draft'>('confirmed');
  const [ampmMode, setAmpmMode] = useState<'am' | 'pm'>('am');
  // 時間軸を生成（午前: 7:00〜12:00、午後: 13:00〜23:00、30分刻み）
  const generateTimeSlots = () => {
    const slots = [];
    if (ampmMode === 'am') {
      // 午前: 7:00〜12:00
      for (let hour = 7; hour <= 12; hour++) {
        slots.push(`${hour.toString().padStart(2, '0')}:00`);
        if (hour < 12) {
          slots.push(`${hour.toString().padStart(2, '0')}:30`);
        }
      }
    } else {
      // 午後: 13:00〜23:00
      for (let hour = 13; hour <= 23; hour++) {
        slots.push(`${hour.toString().padStart(2, '0')}:00`);
        if (hour < 23) {
          slots.push(`${hour.toString().padStart(2, '0')}:30`);
        }
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // 日付をフォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[date.getDay()];
    return `${year}/${month}/${day}（${weekday}）`;
  };

  // シフトをフィルタリング
  const filteredShifts = shifts.filter(shift => shift.status === shiftMode);

  // シフトデータをマトリクス形式に変換（全ユーザー表示）
  const createShiftMatrix = () => {
    const matrix: Array<{
      userName: string;
      position: string;
      positionEmoji: string;
      timeSlots: Array<{
        time: string;
        isWorking: boolean;
        status?: string;
      }>;
    }> = [];

    // 全ユーザーに対してマトリクス行を作成
    users.filter(user => user.isActive).forEach(user => {
      // 該当ユーザーの該当ステータスのシフトを取得
      const userShift = filteredShifts.find(shift => shift.userId === user.lineUserId);
      
      if (userShift) {
        // シフトがある場合
        const position = positions.find(p => p.id === userShift.positionId);
        if (!position) return;

        const timeSlotData = timeSlots.map(time => {
          const isWithinShift = isTimeWithinShift(time, userShift.startTime, userShift.endTime);
          return {
            time,
            isWorking: isWithinShift,
            status: isWithinShift ? userShift.status : undefined
          };
        });

        matrix.push({
          userName: user.displayName,
          position: position.name,
          positionEmoji: position.emoji,
          timeSlots: timeSlotData
        });
      } else {
        // シフトがない場合は空の行を作成
        const timeSlotData = timeSlots.map(time => ({
          time,
          isWorking: false,
          status: undefined
        }));

        matrix.push({
          userName: user.displayName,
          position: '',
          positionEmoji: '',
          timeSlots: timeSlotData
        });
      }
    });

    return matrix.sort((a, b) => a.userName.localeCompare(b.userName));
  };

  // 指定時刻がシフト時間内かチェック
  const isTimeWithinShift = (checkTime: string, startTime: string, endTime: string): boolean => {
    const checkMinutes = timeToMinutes(checkTime);
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    
    return checkMinutes >= startMinutes && checkMinutes < endMinutes;
  };

  // 時刻を分数に変換
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // ステータスに応じた色を取得
  const getStatusColor = (status?: string): string => {
    switch (status) {
      case 'confirmed':
        return 'var(--nm-text-primary)';
      case 'draft':
        return '#f59e0b';
      case 'preview':
        return '#6366f1';
      default:
        return 'var(--nm-text-muted)';
    }
  };

  const shiftMatrix = createShiftMatrix();

  return (
    <div className="shift-table-container">
      <NeumorphicCard padding="md">
        <div className="shift-table-header">
          <div className="shift-ampm-toggle">
            <button className={`toggle-button ${ampmMode === 'am' ? 'active': ''}`}
              onClick={() => setAmpmMode('am')}
            >午前</button>
            <button className={`toggle-button ${ampmMode === 'pm' ? 'active': ''}`}
              onClick={() => setAmpmMode('pm')}
            >午後</button>
          </div>
          <div className="shift-mode-toggle">
            <button
              className={`toggle-button ${shiftMode === 'confirmed' ? 'active' : ''}`}
              onClick={() => setShiftMode('confirmed')}
            >
              確定シフト
            </button>
            <button
              className={`toggle-button ${shiftMode === 'draft' ? 'active' : ''}`}
              onClick={() => setShiftMode('draft')}
            >
              仮シフト
            </button>
          </div>
        </div>
        <div className="shift-table-wrapper">
          <table className="shift-table">
            <thead>
              <tr>
                <th className="shift-table-header-cell name-header">氏名</th>
                <th className="shift-table-header-cell position-header">ポジション</th>
                {timeSlots.map(time => (
                  <th key={time} className="shift-table-header-cell time-header">
                    {time}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shiftMatrix.length > 0 ? (
                shiftMatrix.map((row, index) => (
                  <tr key={index} className="shift-table-row">
                    <td className="shift-table-cell name-cell">
                      {row.userName}
                    </td>
                    <td className="shift-table-cell position-cell">
                      <span className="position-name">{row.position}</span>
                    </td>
                    {row.timeSlots.map((slot, slotIndex) => (
                      <td 
                        key={slotIndex} 
                        className={`shift-table-cell time-cell ${slot.isWorking ? 'working' : ''}`}
                      >
                        {slot.isWorking && (
                          <div className="time-bar" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td 
                    colSpan={timeSlots.length + 2} 
                    className="shift-table-empty"
                  >
                    この日のシフトデータがありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </NeumorphicCard>
    </div>
  );
};

export default ShiftTable;