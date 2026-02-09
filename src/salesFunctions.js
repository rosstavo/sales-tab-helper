export function compositeSalesScore(salesDataRow) {
    const qtyOnHand = Math.max(0, toNumber(salesDataRow?.QoH));
    const qtyOnOrder = Math.max(0, toNumber(salesDataRow?.QoO));
    const qtySold = toNumber(salesDataRow?.["Tot Sales"]);
    const soldToday = toNumber(salesDataRow?.ST);
    const soldThisWeek = toNumber(salesDataRow?.SW);
    const soldThisMonth = toNumber(salesDataRow?.SM);
    const soldThisYear = toNumber(salesDataRow?.STY);
    const gardDisc = toNumber(salesDataRow?.["Gard Disc"]);
    const lastSale = toStringSafe(salesDataRow?.["Last Sale"]);
    const lastDelivery = toStringSafe(salesDataRow?.["Last Delivery"]);
    const isCoreStock = toStringSafe(salesDataRow?.Core);
    const isPaperback = toStringSafe(salesDataRow?.Bg);
    const isCustomerOrder = toStringSafe(salesDataRow?.C) === "*";

    let score = 0;

    const weights = {
        // Tuned for typical ranges: QoH usually <= 3, weekly sales usually < 5.
        // Recent sales should dominate; any non-zero stock/on-order should be disfavoured.
        qtyOnHand: -1,
        qtyOnOrder: -0.5,
        qtySold: 0.05,
        soldToday: 0,
        soldThisWeek: 0.9,
        soldThisMonth: 0.6,
        soldThisYear: 0.02,
        lastSale: 0.05,
        lastDelivery: 0.05,
        isCoreStock: 0.2,
        isPaperback: 0.2,
    };

    const penalties = {
        hasOnHand: 0.75,
        hasOnOrder: 0.5,
    };

    const bonuses = {
        gardDiscOver40: 0.75,
    };

    score += weights.qtyOnHand * Math.max(0, qtyOnHand);
    score += weights.qtyOnOrder * Math.max(0, qtyOnOrder);
    score += weights.qtySold * qtySold;
    score += weights.soldToday * soldToday;
    score += weights.soldThisWeek * soldThisWeek;
    score += weights.soldThisMonth * soldThisMonth;
    score += weights.soldThisYear * soldThisYear;

    if (qtyOnHand > 0) score -= penalties.hasOnHand;
    if (qtyOnOrder > 0) score -= penalties.hasOnOrder;

    if (gardDisc > 40) score += bonuses.gardDiscOver40;

    const now = new Date();
    const lastSaleDate = parseDatePrefix(lastSale);
    const lastDeliveryDate = parseDatePrefix(lastDelivery);

    score += weights.lastSale * recencyScore(now, lastSaleDate);
    score += weights.lastDelivery * recencyScore(now, lastDeliveryDate);

    if (isCoreStock === "Y") score += weights.isCoreStock;
    if (isPaperback === "P") score += weights.isPaperback;

    if (isCustomerOrder) score = 0;

    return score;
}

function toNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function toStringSafe(value) {
    if (value == null) return "";
    return String(value);
}

function parseDatePrefix(value) {
    if (!value) return null;
    const prefix = value.split(" Qty. ")[0];
    const d = new Date(prefix);
    return Number.isNaN(d.getTime()) ? null : d;
}

function recencyScore(now, date) {
    if (!date) return 0;
    const ageYears =
        (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 365);
    const normalized = 1 - Math.min(Math.max(ageYears, 0), 1);
    return normalized;
}
