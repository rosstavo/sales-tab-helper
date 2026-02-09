import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { arrayToCsv } from "./csv";
import { compositeSalesScore } from "./salesFunctions";
import { parseFirstSheetToJson } from "./xlsxUtils";

function App() {
    const [file, setFile] = useState(null);
    const [budget, setBudget] = useState(200);
    const [error, setError] = useState("");
    const [result, setResult] = useState(null);
    const [recommendedUrl, setRecommendedUrl] = useState("");
    const [backlogUrl, setBacklogUrl] = useState("");

    const dateSuffix = useMemo(
        () => new Date().toISOString().split("T")[0],
        [],
    );

    useEffect(() => {
        return () => {
            if (recommendedUrl) URL.revokeObjectURL(recommendedUrl);
            if (backlogUrl) URL.revokeObjectURL(backlogUrl);
        };
    }, [recommendedUrl, backlogUrl]);

    async function onProcess() {
        setError("");
        setResult(null);

        if (recommendedUrl) URL.revokeObjectURL(recommendedUrl);
        if (backlogUrl) URL.revokeObjectURL(backlogUrl);
        setRecommendedUrl("");
        setBacklogUrl("");

        if (!file) {
            setError("Upload an XLSX file first.");
            return;
        }

        const parsedBudget = Number(budget);
        if (!Number.isFinite(parsedBudget) || parsedBudget < 0) {
            setError("Budget must be a non-negative number.");
            return;
        }

        let rows;
        try {
            rows = await parseFirstSheetToJson(file);
        } catch (e) {
            setError(e?.message || "Failed to read XLSX file.");
            return;
        }

        if (!Array.isArray(rows) || rows.length === 0) {
            setError("No rows found in the first sheet.");
            return;
        }

        const scoredSalesData = rows
            .map((row) => ({
                ...row,
                compositeScore: compositeSalesScore(row),
            }))
            .sort((a, b) => (b.compositeScore ?? 0) - (a.compositeScore ?? 0));

        const recommendedReorders = scoredSalesData.reduce(
            (acc, row) => {
                const unitCost = Number(row?.Cost ?? row?.["Cost"]);
                const safeCost = Number.isFinite(unitCost) ? unitCost : 0;

                const qtyOnHand = Number(row?.["QoH"] ?? row?.OnHand) || 0;
                const qtyOnOrder = Number(row?.["QoO"] ?? row?.OnOrder) || 0;

                const soldThisWeek =
                    Number(row?.["SW"] ?? row?.SoldThisWeek) || 0;
                const soldThisMonth =
                    Number(row?.["SM"] ?? row?.SoldThisMonth) || 0;

                const isbn =
                    row?.EAN ?? row?.ean ?? row?.ISBN ?? row?.Isbn ?? "";
                const title = row?.Title ?? row?.TITLE ?? "";

                const line = {
                    ISBN: isbn,
                    Title: title,
                    "Unit Cost": safeCost,
                    "On Hand": qtyOnHand,
                    "On Order": qtyOnOrder,
                    "Sold This Week": soldThisWeek,
                    "Sold This Month": soldThisMonth,
                    "Composite Score": row.compositeScore,
                };

                if (acc.totalCost + safeCost <= parsedBudget) {
                    acc.reorders.push(line);
                    acc.totalCost += safeCost;
                    acc.linesToReorder++;
                } else {
                    acc.backlog.push(line);
                    acc.backlogCost += safeCost;
                }

                return acc;
            },
            {
                reorders: [],
                backlog: [],
                totalCost: 0,
                backlogCost: 0,
                linesToReorder: 0,
            },
        );

        const recommendedCsv = arrayToCsv(
            recommendedReorders.reorders.map((row) => ({
                ISBN: row.ISBN,
                Quantity: 1,
            })),
        );
        const backlogCsv = arrayToCsv(
            recommendedReorders.backlog.map((row) => ({
                ISBN: row.ISBN,
                Quantity: 1,
            })),
        );

        const recommendedBlob = new Blob([recommendedCsv], {
            type: "text/csv;charset=utf-8",
        });
        const backlogBlob = new Blob([backlogCsv], {
            type: "text/csv;charset=utf-8",
        });

        setRecommendedUrl(URL.createObjectURL(recommendedBlob));
        setBacklogUrl(URL.createObjectURL(backlogBlob));
        setResult(recommendedReorders);
    }

    return (
        <div className="app">
            <h1>Sales Reorder CSV Generator</h1>

            <div className="card">
                <div className="field">
                    <label htmlFor="xlsx">XLSX file</label>
                    <input
                        id="xlsx"
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                </div>

                <div className="field">
                    <label htmlFor="budget">Budget</label>
                    <input
                        id="budget"
                        type="number"
                        min="0"
                        step="0.01"
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                    />
                </div>

                <div className="actions">
                    <button onClick={onProcess} disabled={!file}>
                        Process XLSX
                    </button>
                </div>

                {error ? <p className="error">{error}</p> : null}
            </div>

            {result ? (
                <div className="card">
                    <h2>Output</h2>
                    <div className="summary">
                        <div>Lines to reorder: {result.linesToReorder}</div>
                        <div>
                            Total reorder cost: {result.totalCost.toFixed(2)}
                        </div>
                        <div>Backlog lines: {result.backlog.length}</div>
                        <div>Backlog cost: {result.backlogCost.toFixed(2)}</div>
                    </div>

                    <div className="recommended-list">
                        <h3>Recommended Reorders</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>ISBN</th>
                                    <th>Title</th>
                                    <th>Unit Cost</th>
                                    <th>On Hand</th>
                                    <th>On Order</th>
                                    <th>Sold This Week</th>
                                    <th>Sold This Month</th>
                                    <th>Composite Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.reorders.map((row, index) => (
                                    <tr key={index}>
                                        <td>{row.ISBN}</td>
                                        <td>{row.Title}</td>
                                        <td>{row["Unit Cost"]}</td>
                                        <td>{row["On Hand"]}</td>
                                        <td>{row["On Order"]}</td>
                                        <td>{row["Sold This Week"]}</td>
                                        <td>{row["Sold This Month"]}</td>
                                        <td>
                                            {Number(
                                                row["Composite Score"],
                                            ).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                                {result.backlog.map((row, index) => (
                                    <tr
                                        key={`backlog-${index}`}
                                        style={{ opacity: 0.5 }}
                                    >
                                        <td>{row.ISBN}</td>
                                        <td>{row.Title}</td>
                                        <td>{row["Unit Cost"]}</td>
                                        <td>{row["On Hand"]}</td>
                                        <td>{row["On Order"]}</td>
                                        <td>{row["Sold This Week"]}</td>
                                        <td>{row["Sold This Month"]}</td>
                                        <td>
                                            {Number(
                                                row["Composite Score"],
                                            ).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="actions">
                        <a
                            className={!recommendedUrl ? "disabled" : ""}
                            href={recommendedUrl || undefined}
                            download={`recommended_reorders_${dateSuffix}.csv`}
                        >
                            Download recommended CSV
                        </a>
                        <a
                            className={!backlogUrl ? "disabled" : ""}
                            href={backlogUrl || undefined}
                            download={`backlog_${dateSuffix}.csv`}
                        >
                            Download backlog CSV
                        </a>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

export default App;
