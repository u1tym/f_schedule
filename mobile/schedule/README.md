# SCHEDULE (Vue 3 + TypeScript + Vite)

モバイル向けスケジュール画面のフロントエンドです。  
Vue 3 + TypeScript + Vite で構成されています。

## セットアップ

```bash
npm install
npm run dev
```

## API設定はどこで行うか

APIの接続先は `src/config.ts` で管理しています。

- `apiOrigin`: 本番時に利用するAPIのオリジン
- `apiDevPrefix`: 開発時に利用するプレフィックス（既定は `/api`）

現在の実装は以下の動きです。

- **開発時 (`npm run dev`)**  
  `src/config.ts` の `getApiBaseUrl()` が `/api` を返します。  
  `vite.config.ts` の `server.proxy` が `/api` を `http://127.0.0.1:8000` に転送します。
- **本番ビルド時 (`npm run build`)**  
  `getApiBaseUrl()` が `apiOrigin` を返します。

### API接続先を変更する方法

1. 本番APIの接続先を変える  
   `src/config.ts` の `DEFAULT_API_ORIGIN` を変更するか、`VITE_API_ORIGIN` 環境変数を設定します。
2. 開発時の転送先を変える  
   `vite.config.ts` の `server.proxy['/api'].target` を変更します。

## 主要コマンド

```bash
npm run dev     # 開発サーバ起動
npm run build   # 本番ビルド
npm run preview # ビルド結果をローカル確認
```
