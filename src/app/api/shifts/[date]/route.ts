import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ date: string }> }
) {
  try {
    const { date } = await context.params;
    
    // 日付フォーマットの検証
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      console.error('Invalid date format:', date);
      return NextResponse.json(
        { success: false, error: 'Invalid date format' },
        { status: 400 }
      );
    }

    console.log(`Fetching data for date: ${date}`);

    // データベースの初期化を確認
    try {
      await db.load();
    } catch (loadError) {
      console.error('Database load error:', loadError);
      return NextResponse.json(
        { success: false, error: 'Database initialization failed' },
        { status: 500 }
      );
    }

    // 並行してデータを取得
    const [
      dayShifts,
      activeNotices,
      dayMessages,
      allPositions,
      allUsers
    ] = await Promise.all([
      db.getShifts(date).catch(err => {
        console.error('Error getting shifts:', err);
        return [];
      }),
      db.getActiveNotices().catch(err => {
        console.error('Error getting notices:', err);
        return [];
      }),
      db.getDailyMessages(date).catch(err => {
        console.error('Error getting messages:', err);
        return [];
      }),
      db.getPositions().catch(err => {
        console.error('Error getting positions:', err);
        return [];
      }),
      db.getUsers().catch(err => {
        console.error('Error getting users:', err);
        return [];
      })
    ]);

    console.log(`Found ${dayShifts.length} shifts, ${activeNotices.length} notices, ${dayMessages.length} messages, ${allPositions.length} positions, ${allUsers.length} users`);

    // シフトをエンリッチ（ユーザー情報とポジション情報を追加）
    let enrichedShifts = [];
    try {
      enrichedShifts = await db.enrichShifts(dayShifts);
    } catch (enrichError) {
      console.error('Error enriching shifts:', enrichError);
      enrichedShifts = dayShifts; // フォールバック
    }

    return NextResponse.json({
      success: true,
      data: {
        shifts: enrichedShifts,
        notices: activeNotices,
        messages: dayMessages,
        positions: allPositions,
        users: allUsers,
        date
      }
    });
  } catch (error) {
    console.error('Error fetching shift data:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}