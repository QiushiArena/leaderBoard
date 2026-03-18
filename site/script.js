let allData = [];

// 获取数据
fetch("data/leaderboard.json")
    .then(res => res.json())
    .then(json => {
        allData = json;
        renderTable(allData);
    });

function renderTable(rows) {
    let tbody = document.querySelector("#leaderboard tbody");
    tbody.innerHTML = "";

    rows.forEach((d, i) => {
        let tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${i + 1}</td>
            <td><strong>${d.detector}</strong></td>
            <td>${d.organization}</td>
            <td>${d.AUC.toFixed(3)}</td>
            <td>${d.F1.toFixed(3)}</td>
            <td>${d.dataset}</td>
        `;
        tbody.appendChild(tr);
    });
}

// 搜索与过滤逻辑
function filterData() {
    const searchTerm = document.getElementById("search").value.toLowerCase();
    const datasetValue = document.getElementById("datasetFilter").value;

    const filtered = allData.filter(item => {
        const matchesSearch = item.detector.toLowerCase().includes(searchTerm) || 
                              item.organization.toLowerCase().includes(searchTerm);
        const matchesDataset = datasetValue === "all" || item.dataset === datasetValue;
        return matchesSearch && matchesDataset;
    });

    renderTable(filtered);
}

// 排序逻辑
function sortTable(metric) {
    allData.sort((a, b) => {
        if (typeof a[metric] === 'string') return a[metric].localeCompare(b[metric]);
        return b[metric] - a[metric];
    });
    filterData(); // 排序后保持过滤状态
}