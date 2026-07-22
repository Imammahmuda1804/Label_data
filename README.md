# Label Data — Tool Anotasi Sentimen Ulasan Wisata

Aplikasi web untuk anotasi manual label sentimen (positif/negatif/netral) pada data ulasan wisata yang tersimpan di Google Sheets.

## Setup

### 1. Buat Service Account di Google Cloud Console

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Buat project baru atau pilih project yang ada
3. Aktifkan **Google Sheets API** di menu APIs & Services > Library
4. Buka **IAM & Admin > Service Accounts**
5. Klik **Create Service Account**, isi nama, klik Create
6. Skip pemberian role (tidak perlu)
7. Klik service account yang baru dibuat > tab **Keys** > Add Key > Create new key > JSON
8. Download file JSON — ambil `client_email` dan `private_key` dari dalamnya

### 2. Share Spreadsheet ke Service Account

1. Buka spreadsheet di Google Sheets
2. Klik **Share**
3. Paste email service account (dari `client_email` di JSON)
4. Pilih akses **Editor**
5. Klik Send

### 3. Environment Variables

Copy `.env.example` ke `.env.local` dan isi:

```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx@project-id.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
SPREADSHEET_ID=1Ybtr9Uqxb6LqrjKXxZIwTe2Xv6NOYwx86toRO4B2l6M
```

> **Catatan:** Untuk `GOOGLE_PRIVATE_KEY`, paste seluruh nilai dari JSON key file. Jika deploy ke Vercel, paste value apa adanya di dashboard Environment Variables.

### 4. Jalankan

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`

## Deploy ke Vercel

1. Push ke GitHub
2. Import repo di [Vercel](https://vercel.com)
3. Set **Root Directory** ke `Label_Data`
4. Tambahkan 3 environment variables di dashboard Vercel
5. Deploy

## Keyboard Shortcuts

| Key | Aksi |
|-----|------|
| `1` | Label Netral |
| `2` | Label Positif |
| `3` | Label Negatif |
| `←` | Ulasan sebelumnya |
| `→` | Lewati / ulasan berikutnya |
