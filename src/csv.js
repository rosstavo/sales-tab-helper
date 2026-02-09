function escapeCsvValue(value) {
    const s = value == null ? "" : String(value);
    if (/[\n\r",]/.test(s)) {
        return `"${s.replaceAll('"', '""')}"`;
    }
    return s;
}

export function arrayToCsv(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
        return "";
    }

    const lines = [];
    for (const row of rows) {
        lines.push(
            [escapeCsvValue(row?.ISBN), escapeCsvValue(row?.Quantity)].join(
                ",",
            ),
        );
    }
    return lines.join("\n") + "\n";
}
