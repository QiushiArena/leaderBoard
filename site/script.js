const F1_WEIGHT = 0.7;
const AUC_WEIGHT = 0.3;
const MIX_WEIGHT = 0.5;
const ITER_WEIGHT = 0.3;
const RUBUSTNESS_WEIGHT = 0.2;
const EPS = 1e-8;

const MIX_WEIGHTS = { "1": 0.4, "2": 0.3, "3": 0.2, "4": 0.1 };
const ITER_WEIGHTS = { "1": 0.1, "2": 0.2, "3": 0.3, "4": 0.4 };

let allData = [];

async function loadAllDetectors() {
    const detectorNames = ["binoculars", "dna-gpt", "detectgpt", "fast-detectgpt", "roberta"];

    const promises = detectorNames.map(async (detector) => {
        const res = await fetch(`data/${detector}.json`);
        if (!res.ok) return null;
        const data = await res.json();
        return { detector, data };
    });

    const results = await Promise.all(promises);
    return results.filter(r => r !== null);
}

function hybridMetric(item) {
    const results = {};
    const levels = ["1", "2", "3", "4"];

    for (const level of levels) {
        let sumDivF1 = 0;
        let sumAuc = 0;
        for (const domain in item) {
            sumDivF1 += 1 / (item[domain][level].f1 + EPS);
            sumAuc += item[domain][level].auc;
        }
        results[level] = F1_WEIGHT * Object.keys(item).length / (EPS + sumDivF1)
                       + AUC_WEIGHT * sumAuc / (EPS + Object.keys(item).length);
    }

    return results;
}

function computeMixScore(mixScores) {
    return Object.keys(mixScores).reduce((sum, level) =>
        sum + MIX_WEIGHTS[level] * mixScores[level], 0);
}

function computeIterScore(iterScores) {
    return Object.keys(iterScores).reduce((sum, level) =>
        sum + ITER_WEIGHTS[level] * iterScores[level], 0);
}

function computeRubScore(mixScores, iterScores) {
    const levels = ["1", "2", "3", "4"];
    const mixX = [0.25, 0.5, 0.75, 1.0];
    const mixY = levels.map(l => mixScores[l]);
    const iterY = levels.map(l => iterScores[l]);

    // Linear regression slope
    const mean = arr => arr.reduce((s, v) => s + v, 0) / arr.length;
    const slope = (x, y) => {
        const n = x.length;
        const sumX = x.reduce((s, v) => s + v, 0);
        const sumY = y.reduce((s, v) => s + v, 0);
        const sumXY = x.reduce((s, xi, i) => s + xi * y[i], 0);
        const sumXX = x.reduce((s, xi) => s + xi * xi, 0);
        return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    };

    const slopeMix = slope(mixX, mixY);
    const slopeIter = slope(mixX, iterY);

    const varianceMix = Math.pow(mixY[0] - mixY[1], 2) + Math.pow(mixY[1] - mixY[2], 2) + Math.pow(mixY[2] - mixY[3], 2);
    const varianceIter = Math.pow(iterY[0] - iterY[1], 2) + Math.pow(iterY[1] - iterY[2], 2) + Math.pow(iterY[2] - iterY[3], 2);

    const penalty = 0.6 * (Math.abs(slopeMix) + Math.abs(slopeIter)) + 0.4 * (varianceMix + varianceIter);
    return Math.exp(-penalty);
}

function computeFinalScore(data) {
    const mixScores = hybridMetric(data.mix);
    const iterScores = hybridMetric(data.iter);
    const scoreMix = computeMixScore(mixScores);
    const scoreIter = computeIterScore(iterScores);
    const scoreRub = computeRubScore(mixScores, iterScores);
    const finalScore = MIX_WEIGHT * scoreMix + ITER_WEIGHT * scoreIter + RUBUSTNESS_WEIGHT * scoreRub;

    return { scoreMix, scoreIter, scoreRub, finalScore };
}

function renderTable(rows) {
    const tbody = document.querySelector("#leaderboard tbody");
    tbody.innerHTML = "";

    rows.forEach((d, i) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${i + 1}</td>
            <td><strong>${d.detector}</strong></td>
            <td>${d.scoreMix.toFixed(4)}</td>
            <td>${d.scoreIter.toFixed(4)}</td>
            <td>${d.scoreRub.toFixed(4)}</td>
            <td><strong>${d.finalScore.toFixed(4)}</strong></td>
        `;
        tbody.appendChild(tr);
    });
}

function filterData() {
    const searchTerm = document.getElementById("search").value.toLowerCase();
    const filtered = allData.filter(item =>
        item.detector.toLowerCase().includes(searchTerm)
    );
    renderTable(filtered);
}

function sortTable(metric) {
    allData.sort((a, b) => b[metric] - a[metric]);
    document.getElementById("sortBy").value = metric;
    filterData();
}

loadAllDetectors().then(detectors => {
    allData = detectors.map(({ detector, data }) => ({
        detector,
        ...computeFinalScore(data)
    }));
    allData.sort((a, b) => b.finalScore - a.finalScore);
    renderTable(allData);
});