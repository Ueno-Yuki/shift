# シフト管理システム

LINE Bot中心の小規模チーム向けシフト管理システム。自然言語での操作とニューモーフィズムデザインを特徴とする。

## 🚀 特徴

- **LINE Bot連携**: 自然言語でシフト提出・確認
- **ニューモーフィズムUI**: 独自のモダンデザイン
- **軽量設計**: JSONベース → PostgreSQL移行対応
- **レスポンシブ**: LINEアプリ内ブラウザ最適化
- **PDF出力**: 印刷対応のシフト表生成

## 📋 主要機能

### 一般ユーザー
- シフト表の確認（日別・月別）
- LINE Botでのシフト希望提出
- PDF・画像でのシフト表保存
- 共有事項の確認

### 管理者
- 仮シフトの自動生成・確認
- 人手不足の検知・警告
- シフトの手動調整・確定
- 共有事項の管理

## 🛠️ 技術スタック

- **Frontend**: Next.js 14, React, TypeScript
- **Backend**: Next.js API Routes, Node.js
- **Database**: JSON Files → PostgreSQL移行準備
- **External API**: LINE Messaging API
- **PDF Generation**: Puppeteer
- **Deployment**: Vercel

## 📦 セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local` ファイルを作成：

```bash
# LINE Bot 設定
LINE_CHANNEL_SECRET=your_line_channel_secret_here
LINE_CHANNEL_ACCESS_TOKEN=your_line_access_token_here

# API キー
INTERNAL_API_KEY=your_internal_api_key_for_cron_jobs

# アプリケーション設定
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NODE_ENV=development
```

### 3. データディレクトリの作成

```bash
mkdir -p data/backups
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

アプリケーションは `http://localhost:3000` で開始されます。

## 📱 LINE Bot設定

### 1. LINE Developers設定

1. [LINE Developers](https://developers.line.biz/) でBotを作成
2. Channel SecretとChannel Access Tokenを取得
3. `.env.local` に設定

### 2. Webhook設定

```
Webhook URL: https://your-domain.vercel.app/api/webhook
```

### 3. Bot使用方法

```
# シフト確認
@シフトボット 明日のシフト教えて
@シフトボット 今日のシフト

# シフト希望提出
@シフトボット 来月希望です。平日9時から17時、土日休み

# PDF取得
@シフトボット シフト表のPDF欲しい

# 使い方
@シフトボット 使い方教えて
```

## 🗂️ プロジェクト構造

```
/
├── components/          # Reactコンポーネント
│   ├── base/           # ベースコンポーネント
│   ├── layout/         # レイアウト
│   ├── shift/          # シフト関連
│   ├── notice/         # 共有事項
│   ├── messages/       # メッセージ
│   └── actions/        # アクション
├── constants/          # 定数・デザイントークン
├── lib/               # ライブラリ・ユーティリティ
├── pages/             # Next.jsページ
│   └── api/           # APIエンドポイント
├── types/             # TypeScript型定義
├── styles/            # スタイルシート
├── data/              # JSONデータベース
└── docs/              # ドキュメント
```

## 🎨 デザインシステム

### ニューモーフィズムトークン

```typescript
// 基本カラー
colors: {
  background: {
    primary: '#e6e9ef',
    secondary: '#f0f3f7',
    surface: '#eef1f5'
  },
  accent: {
    primary: '#4299e1',
    success: '#48bb78',
    warning: '#ed8936',
    error: '#f56565'
  }
}

// シャドウ
shadows: {
  raised: '8px 8px 16px #d1d9e0, -8px -8px 16px #ffffff',
  pressed: 'inset 4px 4px 8px #d1d9e0, inset -4px -4px 8px #ffffff'
}
```

## 📊 API エンドポイント

### シフト関連
- `GET /api/shift/[date]` - 日別シフト取得
- `GET /[date]` - シフト表ページ
- `GET /api/pdf/[date]` - PDF生成
- `GET /api/image/[date]` - 画像生成

### LINE Bot
- `POST /api/webhook` - LINE Webhook

### システム
- `GET /api/health` - ヘルスチェック

## 🔧 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 本番サーバー起動
npm start

# 型チェック
npm run type-check

# Lint
npm run lint

# テスト
npm test

# バックアップ
npm run backup
```

## 📈 開発フェーズ

### Phase 1: Core MVP（現在）
- ✅ 基本シフト表示・PDF出力
- ✅ ニューモーフィズムUI
- ✅ JSONデータベース

### Phase 2: LINE Bot連携
- 🔄 LINE Webhook実装
- 🔄 自然言語処理
- 🔄 シフト提出・通知機能

### Phase 3: 高度機能
- ⏳ PostgreSQL移行
- ⏳ リアルタイム更新
- ⏳ 高度な分析機能

## 🚀 デプロイメント

### Vercel デプロイ

```bash
# Vercel CLI インストール
npm i -g vercel

# デプロイ
vercel

# 環境変数設定
vercel env add LINE_CHANNEL_SECRET
vercel env add LINE_CHANNEL_ACCESS_TOKEN
```

### 環境変数（本番）

```bash
LINE_CHANNEL_SECRET=prod_secret
LINE_CHANNEL_ACCESS_TOKEN=prod_token
INTERNAL_API_KEY=prod_api_key
NEXT_PUBLIC_BASE_URL=https://your-domain.vercel.app
NODE_ENV=production
```

## 🐛 トラブルシューティング

### よくある問題

1. **LINE Webhook接続エラー**
   - 署名検証を確認
   - 環境変数の設定確認
   - HTTPS必須

2. **PDF生成エラー**
   - Puppeteerの設定確認
   - メモリ制限の確認
   - フォント設定

3. **データベースエラー**
   - ファイル権限確認
   - ディスク容量確認
   - JSON形式確認

### ログ確認

```bash
# 開発環境
npm run dev

# 本番環境（Vercel）
vercel logs
```

## 📞 サポート

- **Issue**: GitHubのIssueページ
- **Documentation**: `/docs` ディレクトリ
- **Health Check**: `/api/health`

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 🤝 コントリビューション

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📚 関連ドキュメント

- [API設計書](./docs/API設計.md)
- [DB設計書](./docs/DB設計.md)
- [バックエンド設計書](./docs/バックエンド設計書.md)
- [画面設計書](./docs/画面設計.md)
- [要件定義書](./docs/要件定義.md)