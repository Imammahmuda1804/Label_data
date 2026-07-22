import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      // ponytail: replace literal \n in env var — Vercel stores private keys with escaped newlines
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: SCOPES,
  });
}

export function getSheets() {
  return google.sheets({ version: "v4", auth: getAuth() });
}

export const SPREADSHEET_ID = process.env.SPREADSHEET_ID!;
export const SHEET_ULASAN = "Ulasan";
export const SHEET_DELETED = "data terhapus";

export interface ReviewRow {
  rowNumber: number; // 1-indexed sheet row (header = row 1, first data = row 2)
  no: string;
  tempatWisata: string;
  namaPengulas: string;
  rating: string;
  labelOtomatis: string;
  teksUlasan: string;
  labelManual: string;
  tanggal: string;
  suka: string;
  balasanPemilik: string;
}

export function parseRow(values: string[], rowNumber: number): ReviewRow {
  return {
    rowNumber,
    no: values[0] ?? "",
    tempatWisata: values[1] ?? "",
    namaPengulas: values[2] ?? "",
    rating: values[3] ?? "",
    labelOtomatis: values[4] ?? "",
    teksUlasan: values[5] ?? "",
    labelManual: values[6] ?? "",
    tanggal: values[7] ?? "",
    suka: values[8] ?? "",
    balasanPemilik: values[9] ?? "",
  };
}

/** Simple retry wrapper for Sheets API rate limits */
export async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e: unknown) {
      const status = (e as { code?: number }).code;
      if (status === 429 && i < retries) {
        await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
        continue;
      }
      throw e;
    }
  }
  throw new Error("Unreachable");
}
