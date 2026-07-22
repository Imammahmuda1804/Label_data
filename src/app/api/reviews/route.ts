import { NextRequest, NextResponse } from "next/server";
import {
  getSheets,
  SPREADSHEET_ID,
  SHEET_ULASAN,
  SHEET_DELETED,
  parseRow,
  withRetry,
} from "@/lib/sheets";

// GET /api/reviews — fetch all rows from "Ulasan"
export async function GET() {
  try {
    const sheets = getSheets();
    const res = await withRetry(() =>
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_ULASAN}'!A2:J`,
      })
    );

    const rows = (res.data.values ?? []).map((values, i) =>
      parseRow(values as string[], i + 2) // row 2 = first data row
    );

    return NextResponse.json({ rows });
  } catch (e: unknown) {
    console.error("GET /api/reviews error:", e);
    return NextResponse.json(
      { error: "Gagal memuat data ulasan. Coba lagi." },
      { status: 500 }
    );
  }
}

// PATCH /api/reviews — update Label Manual (column G) for a specific row
export async function PATCH(req: NextRequest) {
  try {
    const { row, label } = (await req.json()) as {
      row: number;
      label: string;
    };

    if (!row || !["positif", "negatif", "netral"].includes(label)) {
      return NextResponse.json({ error: "Parameter tidak valid." }, { status: 400 });
    }

    const sheets = getSheets();
    await withRetry(() =>
      sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_ULASAN}'!G${row}`,
        valueInputOption: "RAW",
        requestBody: { values: [[label]] },
      })
    );

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error("PATCH /api/reviews error:", e);
    return NextResponse.json(
      { error: "Gagal menyimpan label. Coba lagi." },
      { status: 500 }
    );
  }
}

// DELETE /api/reviews — move row to "data terhapus" then delete from "Ulasan"
export async function DELETE(req: NextRequest) {
  try {
    const { row } = (await req.json()) as { row: number };

    if (!row || row < 2) {
      return NextResponse.json({ error: "Parameter tidak valid." }, { status: 400 });
    }

    const sheets = getSheets();

    // Step 1: Read the full row
    const readRes = await withRetry(() =>
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_ULASAN}'!A${row}:J${row}`,
      })
    );

    const rowData = readRes.data.values?.[0];
    if (!rowData) {
      return NextResponse.json({ error: "Baris tidak ditemukan." }, { status: 404 });
    }

    // Step 2: Append to "data terhapus"
    await withRetry(() =>
      sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_DELETED}'!A:J`,
        valueInputOption: "RAW",
        requestBody: { values: [rowData] },
      })
    );

    // Step 3: Get sheetId for "Ulasan" (needed for deleteDimension)
    const spreadsheet = await withRetry(() =>
      sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
        fields: "sheets.properties",
      })
    );

    const ulasanSheet = spreadsheet.data.sheets?.find(
      (s) => s.properties?.title === SHEET_ULASAN
    );
    const sheetId = ulasanSheet?.properties?.sheetId ?? 0;

    // Step 4: Delete row from "Ulasan" (actual row deletion, not clear)
    await withRetry(() =>
      sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId,
                  dimension: "ROWS",
                  startIndex: row - 1, // 0-indexed
                  endIndex: row,
                },
              },
            },
          ],
        },
      })
    );

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error("DELETE /api/reviews error:", e);
    return NextResponse.json(
      { error: "Gagal menghapus ulasan. Coba lagi." },
      { status: 500 }
    );
  }
}
