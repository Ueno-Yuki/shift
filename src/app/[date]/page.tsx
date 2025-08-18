'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ShiftDisplay from '@/components/shift/ShiftDisplay';
import NoticeDisplay from '@/components/notice/NoticeDisplay';
import MessageDisplay from '@/components/messages/MessageDisplay';
// クライアントサイドのため、APIルート経由でデータを取得
// import { db } from '@/lib/database';
import { EnrichedShift, Notice, DailyMessage } from '@/types/database';

export default function ShiftPage() {
  const params = useParams();
  const router = useRouter();
  const [shifts, setShifts] = useState<EnrichedShift[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [messages, setMessages] = useState<DailyMessage[]>([]);
  const [positions, setPositions] = useState<Array<{
    id: string;
    name: string;
    emoji: string;
    sortOrder: number;
  }>>([]);
  const [users, setUsers] = useState<Array<{
    lineUserId: string;
    displayName: string;
    role: string;
    isActive: boolean;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const date = params?.date as string;

  const loadShiftData = useCallback(async () => {
    if (!date) return;

    try {
      setLoading(true);
      setError(null);

      console.log(`Loading shift data for date: ${date}`);

      // APIルート経由でデータを取得
      const response = await fetch(`/api/shifts/${date}`);
      
      console.log(`API response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('API result:', result);
      
      if (result.success) {
        setShifts(result.data.shifts || []);
        setNotices(result.data.notices || []);
        setMessages(result.data.messages || []);
        setPositions(result.data.positions || []);
        setUsers(result.data.users || []);
        console.log(`Loaded: ${result.data.shifts?.length || 0} shifts, ${result.data.positions?.length || 0} positions`);
      } else {
        throw new Error(result.error || 'データの取得に失敗しました');
      }
    } catch (err) {
      console.error('Failed to load shift data:', err);
      const errorMessage = err instanceof Error ? err.message : 'データの読み込みに失敗しました';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    if (!date) {
      const today = new Date().toISOString().split('T')[0];
      router.replace(`/${today}`);
      return;
    }
    loadShiftData();
  }, [date, router, loadShiftData]);

  const handleDateChange = (newDate: string) => {
    router.push(`/${newDate}`);
  };

  const validateDate = (dateString: string) => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      return false;
    }
    
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  };

  // 日付が無効な場合は今日にリダイレクト
  if (!validateDate(date)) {
    const today = new Date().toISOString().split('T')[0];
    router.replace(`/${today}`);
    return null;
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{
          textAlign: 'center',
          color: '#64748b'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          シフトデータを読み込み中...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{
          textAlign: 'center',
          color: '#ef4444',
          padding: '32px',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '6px 6px 12px #e2e8f0, -6px -6px 12px #ffffff'
        }}>
          <div style={{ fontSize: '18px', marginBottom: '8px' }}>
            エラーが発生しました
          </div>
          <div style={{ fontSize: '14px', color: '#64748b' }}>
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div className="container" style={{ 
        flex: 1,
        paddingTop: '10px',
        paddingBottom: '24px'
      }}>
      {/* 共有事項（重要な場合は上部に表示） */}
      {notices.some(notice => notice.priority === 'urgent' || notice.priority === 'high') && (
        <NoticeDisplay notices={notices.filter(notice => 
          notice.priority === 'urgent' || notice.priority === 'high'
        )} />
      )}

      {/* メインシフト表示 */}
      <ShiftDisplay
        date={date}
        shifts={shifts}
        positions={positions}
        users={users}
        onDateChange={handleDateChange}
      />

      {/* その他の共有事項 */}
      {notices.some(notice => notice.priority === 'medium' || notice.priority === 'low') && (
        <NoticeDisplay notices={notices.filter(notice => 
          notice.priority === 'medium' || notice.priority === 'low'
        )} />
      )}

      {/* 日次メッセージ */}
      {messages.length > 0 && (
        <MessageDisplay
          messages={messages}
          date={date}
        />
      )}
      </div>

      {/* フッター */}
      <div style={{
        textAlign: 'center',
        padding: '24px',
        color: '#64748b',
        fontSize: '10px',
        borderTop: '1px solid #e2e8f0',
        backgroundColor: 'var(--nm-bg)',
        marginTop: 'auto'
      }}>
        シフト管理システム v1.0.0
        <br />
        最終更新: {new Date().toLocaleString('ja-JP')}
      </div>
    </div>
  );
}