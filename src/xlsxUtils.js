import * as XLSX from "xlsx";

export async function parseFirstSheetToJson(file) {
    if (!file) throw new Error("No file provided.");

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheetName = workbook.SheetNames?.[0];
    if (!sheetName) return [];

    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) return [];

    return XLSX.utils.sheet_to_json(worksheet, { defval: "" });
}
