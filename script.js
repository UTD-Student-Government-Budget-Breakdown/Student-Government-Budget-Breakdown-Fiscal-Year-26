function getTotal(dataArray, key) {return dataArray.reduce((sum, item) => sum + (item[key] || 0), 0)}

function assignColors(data) {
    data.forEach((item, i) => { item.color = getSequenceColor(i); });
}

am5.ready(function() {

    const applyColor = (graphics, target) =>
        target.dataItem?.dataContext?.color ? am5.color(target.dataItem.dataContext.color) : graphics;

    function buildFY26Graphs(divID, datasetKey, isExpense, directData) {

        var root = am5.Root.new(divID);
        root.setThemes([ am5themes_Animated.new(root) ]);

        var mainContainer = root.container.children.push(am5.Container.new(root, {
            layout: root.horizontalLayout,
            width: am5.percent(100),
            height: am5.percent(100)
        }));

        var amountKey = isExpense ? "expenseAmount" : "revenueAmount";
        var typeKey   = isExpense ? "expenseType"   : "revenueType";
        var labelTitle = isExpense ? "TOTAL EXPENSE" : "TOTAL REVENUE";

        var barChart = mainContainer.children.push(am5xy.XYChart.new(root, {
            width: am5.percent(50),
            layout: root.verticalLayout,
            paddingRight: 20
        }));

        var yAxis = barChart.yAxes.push(am5xy.CategoryAxis.new(root, {
            categoryField: typeKey,
            renderer: am5xy.AxisRendererY.new(root, { inversed: true, cellStartLocation: 0.1, cellEndLocation: 0.9, minGridDistance: 20 })
        }));

        yAxis.get("renderer").labels.template.setAll({
            fontSize: 11, fontWeight: "500", maxWidth: 100,
            oversizedBehavior: "wrap", textAlign: "right", centerY: am5.p50
        });

        var xAxis = barChart.xAxes.push(am5xy.ValueAxis.new(root, {
            renderer: am5xy.AxisRendererX.new(root, { strokeOpacity: 0 }),
            min: 0, extraMax: 0.1, numberFormat: "$#.#a"
        }));

        var barSeries = barChart.series.push(am5xy.ColumnSeries.new(root, {
            xAxis: xAxis, yAxis: yAxis,
            valueXField: amountKey, categoryYField: typeKey,
            sequencedInterpolation: true
        }));

        barSeries.columns.template.setAll({ height: am5.percent(70), cornerRadiusBR: 5, cornerRadiusTR: 5 });
        barSeries.columns.template.adapters.add("fill", applyColor);
        barSeries.columns.template.adapters.add("stroke", applyColor);

        barSeries.set("maskBullets", false);
        barSeries.bullets.push(function() {
            return am5.Bullet.new(root, {
                locationX: 1,
                sprite: am5.Label.new(root, {
                    text: "{valueX.formatNumber('$#.#a')}",
                    centerY: am5.p50, centerX: am5.p0,
                    populateText: true, paddingLeft: 5,
                    fontSize: 12, fontWeight: "bold",
                    fill: am5.color(0x000000)
                })
            });
        });

        var pieChart = mainContainer.children.push(am5percent.PieChart.new(root, {
            layout: root.verticalLayout, innerRadius: am5.percent(60), width: am5.percent(50)
        }));

        var pieSeries = pieChart.series.push(am5percent.PieSeries.new(root, {
            categoryField: typeKey, valueField: amountKey, alignLabels: false
        }));

        pieSeries.slices.template.setAll({ stroke: am5.color(0xffffff), strokeWidth: 2 });
        pieSeries.slices.template.adapters.add("fill", applyColor);
        pieSeries.slices.template.adapters.add("stroke", applyColor);

        pieSeries.ticks.template.set("forceHidden", true);
        pieSeries.labels.template.setAll({
            text: "{valuePercentTotal.formatNumber('#.0')}%",
            fontSize: 14, fontWeight: "bold", radius: 5, inside: false
        });

        pieSeries.labels.template.adapters.add("forceHidden", function(forceHidden, target) {
            return target.dataItem.get("valuePercentTotal") < 1.5 ? true : forceHidden;
        });

        const processChartData = (currentData) => {
            assignColors(currentData);
            currentData.sort((a, b) => a[amountKey] - b[amountKey]);

            let totalVal = getTotal(currentData, amountKey);
            pieChart.seriesContainer.children.push(am5.Label.new(root, {
                textAlign: "center", centerY: am5.percent(50), centerX: am5.percent(50),
                text: `[fontSize:10px]${labelTitle}[/]\n[bold fontSize:16px]${root.numberFormatter.format(totalVal, "$#.0a")}[/]`
            }));

            pieSeries.data.setAll(currentData);
            barSeries.data.setAll(currentData);
            yAxis.data.setAll(currentData);

            pieSeries.appear(1000, 100);
            barSeries.appear(1000, 100);
        };

        if (directData) {
            processChartData(directData);
        } else {
            fetch("data.json")
            .then(response => response.json())
            .then(fullData => {
                let currentData = fullData[datasetKey];
                if(!currentData) { console.error("Missing data:", datasetKey); return; }
                processChartData(currentData);
            });
        }
    }

    function buildComparison(divId25, divId26, datasetKey25, datasetKey26, isExpense) {

        var amountKey = isExpense ? "expenseAmount" : "revenueAmount";
        var categoryKey = isExpense ? "expenseType" : "revenueType";
        var labelBase = isExpense ? "EXPENSE" : "REVENUE";

        fetch("data.json")
        .then(response => response.json())
        .then(fullData => {

            let data25 = fullData[datasetKey25];
            let data26 = fullData[datasetKey26];
            if (!data25 || !data26) { console.error(`Missing data: ${datasetKey25} or ${datasetKey26}`); return; }

            // Build unified color map so same category gets same color across both years
            var categorySet = new Set();
            data25.forEach(function(item) { categorySet.add(item[categoryKey]); });
            data26.forEach(function(item) { categorySet.add(item[categoryKey]); });
            var colorMap = {};
            Array.from(categorySet).forEach(function(category, index) {
                colorMap[category] = getSequenceColor(index);
            });
            data25.forEach(function(item) { item.color = colorMap[item[categoryKey]]; });
            data26.forEach(function(item) { item.color = colorMap[item[categoryKey]]; });

            data25.sort((a, b) => a[amountKey] - b[amountKey]);
            data26.sort((a, b) => a[amountKey] - b[amountKey]);

            let total25 = getTotal(data25, amountKey);
            let total26 = getTotal(data26, amountKey);

            let diffRaw = ((total26 - total25) / total25) * 100;
            let diffPct = diffRaw.toFixed(1);
            let diffColor = diffRaw >= 0 ? "[#109618]" : "[#e31a1c]";
            let diffSign = diffRaw >= 0 ? "+" : "";

            function createSubChart(divID, data, year, showChange) {

                var root = am5.Root.new(divID);
                root.setThemes([am5themes_Animated.new(root)]);

                var container = root.container.children.push(am5.Container.new(root, {
                    layout: root.horizontalLayout, width: am5.percent(100), height: am5.percent(100)
                }));

                var barChart = container.children.push(am5xy.XYChart.new(root, {
                    width: am5.percent(60), layout: root.verticalLayout, paddingRight: 50, paddingLeft: 10
                }));

                var yAxis = barChart.yAxes.push(am5xy.CategoryAxis.new(root, {
                    categoryField: categoryKey,
                    renderer: am5xy.AxisRendererY.new(root, { inversed: true, cellStartLocation: 0.1, cellEndLocation: 0.9, minGridDistance: 20 })
                }));

                yAxis.get("renderer").labels.template.setAll({
                    fontSize: 11, fontWeight: "500", maxWidth: 140,
                    oversizedBehavior: "wrap", textAlign: "right", centerY: am5.p50, paddingRight: 5
                });

                var xAxis = barChart.xAxes.push(am5xy.ValueAxis.new(root, {
                    renderer: am5xy.AxisRendererX.new(root, { strokeOpacity: 0 }),
                    min: 0, extraMax: 0.2, numberFormat: "#.#a"
                }));

                var barSeries = barChart.series.push(am5xy.ColumnSeries.new(root, {
                    xAxis: xAxis, yAxis: yAxis,
                    valueXField: amountKey, categoryYField: categoryKey,
                    sequencedInterpolation: true
                }));

                barSeries.columns.template.adapters.add("fill", applyColor);
                barSeries.columns.template.adapters.add("stroke", applyColor);
                barSeries.columns.template.setAll({ height: am5.percent(70), cornerRadiusBR: 5, cornerRadiusTR: 5 });

                barSeries.set("maskBullets", false);
                barSeries.bullets.push(function() {
                    var label = am5.Label.new(root, {
                        text: "{valueX.formatNumber('$#.#a')}",
                        centerY: am5.p50, centerX: am5.p0,
                        paddingLeft: 5, fontSize: 12, fontWeight: "bold",
                        populateText: true
                    });

                    label.adapters.add("text", function(text, target) {
                        if (!target.dataItem?.dataContext) return text;

                        let val = target.dataItem.dataContext[amountKey];
                        let formatted = root.numberFormatter.format(val, "$#.0a");
                        let change = target.dataItem.dataContext.percentChange;

                        if (showChange && change !== undefined) {
                            let cColor = change >= 0 ? "[#109618]" : "[#e31a1c]";
                            let cSign = change >= 0 ? "+" : "";
                            return `${formatted}  ${cColor}(${cSign}${change}%)[/]`;
                        }

                        return formatted;
                    });

                    return am5.Bullet.new(root, { locationX: 1, sprite: label });
                });

                var pieChart = container.children.push(am5percent.PieChart.new(root, {
                    layout: root.verticalLayout, innerRadius: am5.percent(60),
                    width: am5.percent(40), radius: am5.percent(80)
                }));

                var pieSeries = pieChart.series.push(am5percent.PieSeries.new(root, {
                    categoryField: categoryKey, valueField: amountKey, alignLabels: false
                }));

                pieSeries.slices.template.setAll({
                    stroke: am5.color(0xffffff), strokeWidth: 2,
                    tooltipText: "{category}: {valuePercentTotal.formatNumber('#.00')}%"
                });

                pieSeries.slices.template.adapters.add("fill", applyColor);
                pieSeries.slices.template.adapters.add("stroke", applyColor);

                pieSeries.labels.template.setAll({
                    text: "{valuePercentTotal.formatNumber('#.0')}%",
                    fontSize: 11, fontWeight: "bold", radius: 5, inside: false
                });
                pieSeries.ticks.template.set("forceHidden", true);
                pieSeries.labels.template.adapters.add("forceHidden", (forceHidden, target) =>
                    target.dataItem.get("valuePercentTotal") < 3 ? true : forceHidden
                );

                let totalFormatted = root.numberFormatter.format(year === 2025 ? total25 : total26, "$#.0a");
                let centerText = showChange
                    ? `[fontSize:10px]TOTAL ${year}\n${labelBase}[/]\n[bold fontSize:18px]${totalFormatted}[/]\n${diffColor}${diffSign}${diffPct}% vs 2025[/]`
                    : `[fontSize:10px]TOTAL ${year}\n${labelBase}[/]\n[bold fontSize:18px]${totalFormatted}[/]`;

                pieChart.seriesContainer.children.push(am5.Label.new(root, {
                    textAlign: "center", centerY: am5.percent(50), centerX: am5.percent(50),
                    text: centerText
                }));

                yAxis.data.setAll(data);
                barSeries.data.setAll(data);
                pieSeries.data.setAll(data);

                barSeries.appear(1000, 100);
                pieSeries.appear(1000, 100);
            }

            createSubChart(divId25, data25, 2025, false);
            createSubChart(divId26, data26, 2026, true);
        });
    }

    function buildBOTGraphs(divID, datasetKey, isExpense) {

        var root = am5.Root.new(divID);
        root.setThemes([am5themes_Animated.new(root)]);
        root.numberFormatter.setAll({
            numberFormat: "#.##a",
            bigNumberPrefixes: [
                { number: 1e3, suffix: "K" },
                { number: 1e6, suffix: "M" },
                { number: 1e9, suffix: "B" },
                { number: 1e12, suffix: "T" }
            ]
        });

        var mainContainer = root.container.children.push(am5.Container.new(root, {
            layout: root.verticalLayout,
            width: am5.percent(100),
            height: am5.percent(100)
        }));

        var amountKey = isExpense ? "expenseAmount" : "revenueAmount";
        var typeKey   = isExpense ? "expenseType"   : "revenueType";
        var yearKey   = "year";

        var barChart = mainContainer.children.push(am5xy.XYChart.new(root, {
            height: am5.percent(60), layout: root.verticalLayout,
            panX: false, panY: false
        }));

        var barXAxis = barChart.xAxes.push(am5xy.CategoryAxis.new(root, {
            categoryField: yearKey,
            renderer: am5xy.AxisRendererX.new(root, {})
        }));

        var barYAxis = barChart.yAxes.push(am5xy.ValueAxis.new(root, {
            renderer: am5xy.AxisRendererY.new(root, {}),
            min: 0, numberFormat: "$#.#a"
        }));

        var lineChart = mainContainer.children.push(am5xy.XYChart.new(root, {
            height: am5.percent(40), layout: root.verticalLayout,
            panX: false, panY: false
        }));

        var lineXAxis = lineChart.xAxes.push(am5xy.CategoryAxis.new(root, {
            categoryField: yearKey,
            renderer: am5xy.AxisRendererX.new(root, {})
        }));

        var lineYAxis = lineChart.yAxes.push(am5xy.ValueAxis.new(root, {
            renderer: am5xy.AxisRendererY.new(root, {}),
            numberFormat: "$#.#a"
        }));

        fetch("data.json")
        .then(r => r.json())
        .then(fullData => {

            var rawData = fullData[datasetKey];
            if (!rawData) { console.error("Missing data:", datasetKey); return; }

            // Sort within each year group (largest first), then flatten
            var grouped = {};
            rawData.forEach(d => {
                if (!grouped[d.year]) grouped[d.year] = [];
                grouped[d.year].push(d);
            });
            Object.values(grouped).forEach(arr => arr.sort((a, b) => b[amountKey] - a[amountKey]));
            rawData = Object.values(grouped).flat();

            var totalByYear = {};
            var yearHasNegative = {};
            rawData.forEach(d => {
                if (d[amountKey] < 0) yearHasNegative[d[yearKey]] = true;
                totalByYear[d[yearKey]] = (totalByYear[d[yearKey]] || 0) + Math.abs(d[amountKey]);
            });

            var years = [...new Set(rawData.map(d => d[yearKey]))];
            var types = [...new Set(rawData.map(d => d[typeKey]))];

            barXAxis.data.setAll(years.map(y => ({ [yearKey]: y })));
            lineXAxis.data.setAll(years.map(y => ({ [yearKey]: y })));

            types.forEach((type, i) => {

                var typeData = rawData.filter(d => d[typeKey] === type);
                var typeColor = getSequenceColor(i);

                var barSeries = barChart.series.push(am5xy.ColumnSeries.new(root, {
                    name: type, stacked: true,
                    xAxis: barXAxis, yAxis: barYAxis,
                    valueYField: amountKey, categoryXField: yearKey,
                    fill: am5.color(typeColor), stroke: am5.color(typeColor)
                }));

                if (yearHasNegative[typeData[0][yearKey]]) {
                    barYAxis.set("min", -totalByYear[typeData[0][yearKey]] * 0.2);
                }

                barSeries.columns.template.setAll({
                    tooltipText: "{name}\n{categoryX}: {valueY.formatNumber('$#,###')}",
                    cornerRadiusTL: 3, cornerRadiusTR: 3,
                    cornerRadiusBL: 3, cornerRadiusBR: 3
                });

                barSeries.bullets.push((root, series, dataItem) => {
                    if (dataItem.dataContext[amountKey] === 0) return null;
                    if (Math.abs(dataItem.dataContext[amountKey]) / totalByYear[dataItem.dataContext[yearKey]] < 0.02) return null;

                    var isNegative = dataItem.dataContext[amountKey] < 0;
                    return am5.Bullet.new(root, {
                        sprite: am5.Label.new(root, {
                            text: "{valueY.formatNumber('$#.0a')}",
                            fill: isNegative ? am5.color(0xe31a1c) : root.interfaceColors.get("alternativeText"),
                            centerY: am5.p50, centerX: am5.p50,
                            populateText: true,
                            fontSize: isNegative ? 11 : 14,
                            fontWeight: isNegative ? "1000" : "500"
                        })
                    });
                });

                barSeries.columns.template.adapters.add("fill", applyColor);
                barSeries.columns.template.adapters.add("stroke", applyColor);

                barSeries.data.setAll(typeData);
                barSeries.appear(800);

                var lineSeries = lineChart.series.push(am5xy.LineSeries.new(root, {
                    name: type,
                    xAxis: lineXAxis, yAxis: lineYAxis,
                    valueYField: amountKey, categoryXField: yearKey,
                    stroke: am5.color(typeColor)
                }));

                lineSeries.strokes.template.setAll({ strokeWidth: 3 });
                lineSeries.bullets.push(() =>
                    am5.Bullet.new(root, {
                        sprite: am5.Circle.new(root, { radius: 4, fill: lineSeries.get("stroke") })
                    })
                );

                lineSeries.data.setAll(typeData);
                lineSeries.appear(800);
            });

            barChart.children.push(am5.Legend.new(root, {
                centerX: am5.percent(50), x: am5.percent(50)
            })).data.setAll(barChart.series.values);

            lineChart.children.push(am5.Legend.new(root, {
                centerX: am5.percent(50), x: am5.percent(50)
            })).data.setAll(lineChart.series.values);
        });
    }

    var schoolDatasetMap = {
        "chart_JSOM_Expenses": "JSOM",
        "chart_NSM_Expenses":  "NSM",
        "chart_AHT_Expenses":  "AHT",
        "chart_BBS_Expenses":  "BBS",
        "chart_EPPS_Expenses": "EPPS",
        "chart_IS_Expenses":   "IS",
        "chart_ECS_Expenses":  "ECS"
    };

    function buildExpensesGraphs(divID) {
        var schoolName = schoolDatasetMap[divID];
        if (!schoolName) return;

        fetch("data.json")
        .then(res => res.json())
        .then(fullData => {
            var hierarchy = fullData["School_Expenses_Hierarchy"];
            var school = hierarchy.find(s => s.name === schoolName);
            if (!school || !school.children) return;

            var expenseData = school.children.map(child => ({
                expenseType: child.name,
                expenseAmount: child.value
            }));

            buildFY26Graphs(divID, null, true, expenseData);
        });
    }

    function buildRevenueGraphs(divID) {
        if (divID === "chart_AHT_Revenue") buildFY26Graphs(divID, "AHT_Revenue", false);
    }

    function buildExpensesBySchoolGraph(divID) {

        var root = am5.Root.new(divID);
        root.setThemes([am5themes_Animated.new(root)]);

        var container = root.container.children.push(am5.Container.new(root, {
            layout: root.horizontalLayout,
            width: am5.percent(100),
            height: am5.percent(100)
        }));

        fetch("data.json")
        .then(res => res.json())
        .then(fullData => {

            let hierarchy = fullData["School_Expenses_Hierarchy"];
            let data = hierarchy.map(s => ({
                school: s.name,
                expenseAmount: s.value
            }));
            data.forEach(item => { item.color = SCHOOL_COLORS[item.school] || getSequenceColor(0); });
            data.sort((a, b) => a.expenseAmount - b.expenseAmount);

            var barChart = container.children.push(am5xy.XYChart.new(root, {
                width: am5.percent(60), layout: root.verticalLayout, paddingRight: 30
            }));

            var yAxis = barChart.yAxes.push(am5xy.CategoryAxis.new(root, {
                categoryField: "school",
                renderer: am5xy.AxisRendererY.new(root, { inversed: true, cellStartLocation: 0.1, cellEndLocation: 0.9 })
            }));

            yAxis.get("renderer").labels.template.setAll({
                fontSize: 12, fontWeight: "500", maxWidth: 150,
                oversizedBehavior: "wrap", textAlign: "right"
            });

            var xAxis = barChart.xAxes.push(am5xy.ValueAxis.new(root, {
                renderer: am5xy.AxisRendererX.new(root, { strokeOpacity: 0 }),
                min: 0, extraMax: 0.1, numberFormat: "$#.#a"
            }));

            var barSeries = barChart.series.push(am5xy.ColumnSeries.new(root, {
                xAxis, yAxis,
                valueXField: "expenseAmount", categoryYField: "school",
                sequencedInterpolation: true
            }));

            barSeries.columns.template.setAll({ height: am5.percent(70), cornerRadiusBR: 5, cornerRadiusTR: 5 });
            barSeries.columns.template.adapters.add("fill", applyColor);
            barSeries.columns.template.adapters.add("stroke", applyColor);

            barSeries.set("maskBullets", false);
            barSeries.bullets.push(() =>
                am5.Bullet.new(root, {
                    locationX: 1,
                    sprite: am5.Label.new(root, {
                        text: "{valueX.formatNumber('$#.#a')}",
                        centerY: am5.p50, paddingLeft: 5,
                        fontWeight: "bold", populateText: true
                    })
                })
            );

            var pieChart = container.children.push(am5percent.PieChart.new(root, {
                layout: root.verticalLayout, innerRadius: am5.percent(60), width: am5.percent(40)
            }));

            var pieSeries = pieChart.series.push(am5percent.PieSeries.new(root, {
                categoryField: "school", valueField: "expenseAmount", alignLabels: false
            }));

            pieSeries.slices.template.adapters.add("fill", applyColor);
            pieSeries.slices.template.adapters.add("stroke", applyColor);

            pieSeries.labels.template.setAll({
                text: "{valuePercentTotal.formatNumber('#.0')}%",
                fontWeight: "bold", inside: false
            });
            pieSeries.ticks.template.set("forceHidden", true);

            let total = getTotal(data, "expenseAmount");
            pieChart.seriesContainer.children.push(am5.Label.new(root, {
                textAlign: "center", centerX: am5.percent(50), centerY: am5.percent(50),
                text: `[fontSize:10px]TOTAL EXPENSE[/]\n[bold fontSize:18px]${root.numberFormatter.format(total, "$#.0a")}[/]`
            }));

            yAxis.data.setAll(data);
            barSeries.data.setAll(data);
            pieSeries.data.setAll(data);

            barSeries.appear(1000, 100);
            pieSeries.appear(1000, 100);
        });
    }

    function buildStudentFeesTotals(divID, datasetKey) {

        var root = am5.Root.new(divID);
        root.setThemes([am5themes_Animated.new(root)]);

        var chart = root.container.children.push(am5xy.XYChart.new(root, {
            layout: root.verticalLayout,
            paddingLeft: 10, paddingRight: 10, paddingTop: 20
        }));

        var xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, {
            categoryField: "category",
            renderer: am5xy.AxisRendererX.new(root, { minGridDistance: 30 })
        }));

        xAxis.get("renderer").labels.template.setAll({
            fontSize: 12, fontWeight: "500", maxWidth: 160,
            oversizedBehavior: "wrap", textAlign: "center",
            centerX: am5.p50, paddingTop: 8
        });

        var yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, {
            renderer: am5xy.AxisRendererY.new(root, {}),
            min: 0, extraMax: 0.2, numberFormat: "$#.0a"
        }));

        var series = chart.series.push(am5xy.ColumnSeries.new(root, {
            xAxis: xAxis, yAxis: yAxis,
            valueYField: "amount", categoryXField: "category",
            sequencedInterpolation: true
        }));

        series.columns.template.setAll({ cornerRadiusTL: 6, cornerRadiusTR: 6, strokeOpacity: 0 });
        series.columns.template.adapters.add("fill", applyColor);
        series.columns.template.adapters.add("stroke", applyColor);

        series.set("maskBullets", false);
        series.bullets.push(function() {
            return am5.Bullet.new(root, {
                locationY: 1,
                sprite: am5.Label.new(root, {
                    text: "{valueY.formatNumber('$#.0a')}",
                    populateText: true, centerX: am5.p50, centerY: am5.p100,
                    dy: -10, fontSize: 14, fontWeight: "bold",
                    fill: am5.color(0x000000)
                })
            });
        });

        fetch("data.json")
        .then(response => response.json())
        .then(fullData => {

            let currentData = fullData[datasetKey];
            if(!currentData) { console.error("Missing data:", datasetKey); return; }

            assignColors(currentData);
            series.data.setAll(currentData);
            xAxis.data.setAll(currentData);

            series.appear(1000, 100);
        });
    }

    function buildFeesBreakdown(divID, datasetKey, labelTitle) {

        var root = am5.Root.new(divID);
        root.setThemes([ am5themes_Animated.new(root) ]);

        var mainContainer = root.container.children.push(am5.Container.new(root, {
            layout: root.horizontalLayout,
            width: am5.percent(100),
            height: am5.percent(100)
        }));

        var barChart = mainContainer.children.push(am5xy.XYChart.new(root, {
            width: am5.percent(70), layout: root.verticalLayout,
            paddingRight: 90, paddingLeft: 10
        }));

        var yAxis = barChart.yAxes.push(am5xy.CategoryAxis.new(root, {
            categoryField: "category",
            renderer: am5xy.AxisRendererY.new(root, { inversed: true, cellStartLocation: 0.1, cellEndLocation: 0.9, minGridDistance: 20 })
        }));

        yAxis.get("renderer").labels.template.setAll({
            fontSize: 11, fontWeight: "500", maxWidth: 170,
            oversizedBehavior: "wrap", textAlign: "right",
            centerY: am5.p50, paddingRight: 5
        });

        var xAxis = barChart.xAxes.push(am5xy.ValueAxis.new(root, {
            renderer: am5xy.AxisRendererX.new(root, { strokeOpacity: 0 }),
            min: 0, extraMax: 0.25, numberFormat: "$#.0a"
        }));

        var barSeries = barChart.series.push(am5xy.ColumnSeries.new(root, {
            xAxis: xAxis, yAxis: yAxis,
            valueXField: "amount", categoryYField: "category",
            sequencedInterpolation: true
        }));

        barSeries.columns.template.adapters.add("fill", applyColor);
        barSeries.columns.template.adapters.add("stroke", applyColor);
        barSeries.columns.template.setAll({ height: am5.percent(70), cornerRadiusBR: 5, cornerRadiusTR: 5 });

        barSeries.set("maskBullets", false);
        barSeries.bullets.push(function() {
            return am5.Bullet.new(root, {
                locationX: 1,
                sprite: am5.Label.new(root, {
                    text: "{valueX.formatNumber('$#.0a')}",
                    centerY: am5.p50, centerX: am5.p0,
                    populateText: true, paddingLeft: 5,
                    fontSize: 12, fontWeight: "bold",
                    fill: am5.color(0x000000)
                })
            });
        });

        var pieChart = mainContainer.children.push(am5percent.PieChart.new(root, {
            layout: root.verticalLayout, innerRadius: am5.percent(60),
            width: am5.percent(30), radius: am5.percent(85)
        }));

        var pieSeries = pieChart.series.push(am5percent.PieSeries.new(root, {
            categoryField: "category", valueField: "amount", alignLabels: false
        }));

        pieSeries.slices.template.setAll({
            stroke: am5.color(0xffffff), strokeWidth: 2,
            tooltipText: "{category}: {valuePercentTotal.formatNumber('#.00')}%"
        });

        pieSeries.slices.template.adapters.add("fill", applyColor);
        pieSeries.slices.template.adapters.add("stroke", applyColor);

        pieSeries.labels.template.setAll({
            text: "{valuePercentTotal.formatNumber('#.0')}%",
            fontSize: 11, fontWeight: "bold", radius: 5, inside: false
        });
        pieSeries.ticks.template.set("forceHidden", true);
        pieSeries.labels.template.adapters.add("forceHidden", (forceHidden, target) =>
            target.dataItem.get("valuePercentTotal") < 1.5 ? true : forceHidden
        );

        fetch("data.json")
        .then(response => response.json())
        .then(fullData => {

            let currentData = fullData[datasetKey];
            if(!currentData) { console.error("Missing data:", datasetKey); return; }

            assignColors(currentData);
            currentData.sort((a, b) => a.amount - b.amount);
            let totalVal = getTotal(currentData, "amount");

            pieChart.seriesContainer.children.push(am5.Label.new(root, {
                textAlign: "center", centerY: am5.percent(50), centerX: am5.percent(50),
                text: `[fontSize:10px]${labelTitle}[/]\n[bold fontSize:16px]${root.numberFormatter.format(totalVal, "$#.0a")}[/]`
            }));

            pieSeries.data.setAll(currentData);
            barSeries.data.setAll(currentData);
            yAxis.data.setAll(currentData);

            pieSeries.appear(1000, 100);
            barSeries.appear(1000, 100);
        });
    }

    function buildStudentFeesTable(containerId, totalsKey, mandatoryKey, programKey) {

        var el = document.getElementById(containerId);
        if (!el) return;

        const fmtMoney = (n) => {
            let num = Number(n || 0);
            return "$ " + num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        };

        const byOrder = (order) => {
            let pos = new Map(order.map((x, i) => [x, i]));
            return (a, b) => (pos.has(a.category) ? pos.get(a.category) : 999) - (pos.has(b.category) ? pos.get(b.category) : 999);
        };

        const mandatoryOrder = [
            "Advising Fee", "Athletic Program Fee", "Green Fee",
            "Information Technology Fee", "Infrastructure Fee",
            "Library Acquisition Fee", "Medical Services Fee",
            "Recreation Fee", "Student Business Services Fee",
            "Student Services Fee", "Student Services Building Fee",
            "Student Union Fee", "Transportation Fee", "Exemption"
        ];

        const programOrder = [
            "Application Fee", "Bursar Fees, Late Fees", "Chec Collin County",
            "CPT Fee Sharing", "Credit Card Services Fee",
            "EIPP Fee - Indust Practice Pgm", "Faculty Led Student Fee",
            "Ftrip Fee - Geosciences", "Ftrip Fee - JSOM Study Abroad",
            "General Studies Distance Education Fee", "Global MBA Distance Fee",
            "International Education Fee", "International Student Special Serv Fee",
            "International Travel Ins Fee", "Library Fines/Lost Book Fund",
            "Online Services Fee", "Physical Instruction Fee",
            "Practice Training Fee", "Record Late/Reinstatement Fee",
            "Records Processing Fee", "SA Fee - Application", "Student Teaching Fee"
        ];

        fetch("data.json")
        .then(r => r.json())
        .then(fullData => {

            let totals = fullData[totalsKey] || [];
            let mandatory = (fullData[mandatoryKey] || []).slice().sort(byOrder(mandatoryOrder));
            let program = (fullData[programKey] || []).slice().sort(byOrder(programOrder));

            let totalsMap = new Map(totals.map(x => [x.category, x.amount]));

            let netTuition = totalsMap.get("Net Tuition") || 0;
            let labSupp = totalsMap.get("Laboratory & Supplemental Fees") || 0;
            let mandatoryTotal = totalsMap.get("Mandatory Fee") || 0;
            let programTotal = totalsMap.get("Program, Course Related & Other Fees") || 0;
            let grandTotal = netTuition + labSupp + mandatoryTotal + programTotal;

            let html = "";
            html += `<div class="fees-row fees-head"><div>Division</div><div class="fees-num">Total</div></div>`;
            html += `<div class="fees-row fees-section"><div>Net Tuition</div><div class="fees-num">${fmtMoney(netTuition)}</div></div>`;
            html += `<div class="fees-row"><div>Laboratory & Supplemental Fees</div><div class="fees-num">${fmtMoney(labSupp)}</div></div>`;
            html += `<div class="fees-row fees-section"><div>Mandatory Fee</div><div class="fees-num">${fmtMoney(mandatoryTotal)}</div></div>`;
            for (let item of mandatory) {
                html += `<div class="fees-row fees-sub"><div>${item.category}</div><div class="fees-num">${fmtMoney(item.amount)}</div></div>`;
            }
            html += `<div class="fees-row fees-section"><div>Program, Course Related & Other Fees</div><div class="fees-num">${fmtMoney(programTotal)}</div></div>`;
            for (let item of program) {
                html += `<div class="fees-row fees-sub"><div>${item.category}</div><div class="fees-num">${fmtMoney(item.amount)}</div></div>`;
            }
            html += `<div class="fees-row fees-total"><div>Total Tuition and Student Fees</div><div class="fees-num">${fmtMoney(grandTotal)}</div></div>`;

            el.innerHTML = html;
        });
    }

    function buildAuxiliaryChart(divID, datasetKey, unitName) {

        var root = am5.Root.new(divID);
        root.setThemes([am5themes_Animated.new(root)]);
        root.numberFormatter.set("bigNumberPrefixes", [
            { number: 1e3, suffix: "K" },
            { number: 1e6, suffix: "M" },
            { number: 1e9, suffix: "B" }
        ]);

        var chart = root.container.children.push(am5xy.XYChart.new(root, {
            layout: root.verticalLayout,
            paddingTop: 40, paddingRight: 30, paddingLeft: 40, paddingBottom: 20
        }));

        var legend = chart.children.unshift(am5.Legend.new(root, {
            centerX: am5.percent(50), x: am5.percent(50),
            marginBottom: 18, paddingBottom: 8, layout: root.horizontalLayout
        }));
        legend.labels.template.setAll({ fontSize: 13, fontWeight: "500" });
        legend.valueLabels.template.set("forceHidden", true);

        var seriesDefs = [
            { field: "BudgetedExpenses", name: "Budgeted Expenses", color: PALETTE.teal },
            { field: "DebtService",      name: "Debt Service",      color: PALETTE.skyBlue },
            { field: "TotalTransfers",   name: "Total Transfers",   color: PALETTE.orange },
            { field: "Revenue",          name: "Revenue",           color: PALETTE.blue }
        ];

        fetch("data.json")
        .then(r => r.json())
        .then(fullData => {

            var units = fullData[datasetKey];
            if (!units) { console.error("Missing data:", datasetKey); return; }

            var unit = units.find(u => u.unit === unitName);
            if (!unit) { console.error("Missing unit:", unitName); return; }

            var chartData = [
                { category: "Expenses", BudgetedExpenses: unit.budgetedExpenses, DebtService: unit.debtService, TotalTransfers: unit.totalTransfers },
                { category: "Revenue",  Revenue: unit.revenue }
            ];

            var xRenderer = am5xy.AxisRendererX.new(root, { cellStartLocation: 0.1, cellEndLocation: 0.9, minGridDistance: 40 });
            var xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, { categoryField: "category", renderer: xRenderer }));
            xAxis.data.setAll(chartData);

            var yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, {
                renderer: am5xy.AxisRendererY.new(root, { strokeOpacity: 0.1 }),
                numberFormat: "$#.#a", min: 0, extraMax: 0.05
            }));

            seriesDefs.forEach(function(def) {
                var hasValue = chartData.some(item => item[def.field] !== undefined && item[def.field] > 0);

                var tooltip = am5.Tooltip.new(root, { paddingTop: 6, paddingBottom: 6, paddingLeft: 10, paddingRight: 10 });
                tooltip.label.setAll({ textAlign: "center", oversizedBehavior: "wrap", maxWidth: 220, fontSize: 12, fontWeight: "600" });
                tooltip.label.adapters.add("text", function(text, target) {
                    if (target.dataItem) {
                        var val = target.dataItem.get("valueY");
                        if (val) {
                            var absVal = Math.abs(val);
                            var formatted = absVal >= 1e9 ? "$" + absVal/1e9 + "B" : absVal >= 1e6 ? "$" + absVal/1e6 + "M" : "$" + absVal/1e3 + "K";
                            return def.name + ": [bold]" + formatted + "[/]";
                        }
                    }
                    return text;
                });

                var series = chart.series.push(am5xy.ColumnSeries.new(root, {
                    name: def.name, xAxis: xAxis, yAxis: yAxis,
                    valueYField: def.field, categoryXField: "category",
                    stacked: true, tooltip: tooltip
                }));

                if (!hasValue) series.set("visible", false);

                series.columns.template.setAll({
                    fill: am5.color(def.color), strokeOpacity: 0, width: am5.percent(50),
                    cornerRadiusTL: 7, cornerRadiusTR: 7, cornerRadiusBL: 7, cornerRadiusBR: 7
                });

                series.bullets.push(function() {
                    var label = am5.Label.new(root, {
                        text: def.name + "\n$[bold]{valueY.formatNumber('#.#a')}",
                        populateText: true, centerX: am5.percent(50), centerY: am5.percent(50),
                        fill: am5.color(0xffffff), fontSize: 13, fontWeight: "600",
                        textAlign: "center", oversizedBehavior: "wrap", maxWidth: 170
                    });
                    label.adapters.add("visible", function(_, target) {
                        return target.dataItem && (target.dataItem.get("valueY") || 0) > 0;
                    });
                    return am5.Bullet.new(root, { sprite: label, locationY: 0.5 });
                });

                series.data.setAll(chartData);
                if (hasValue) legend.data.push(series);
            });

            chart.set("cursor", am5xy.XYCursor.new(root, { behavior: "none" }));
            chart.appear(900, 120);
        });
    }

    // Page: Fall 25 - Spring 26 Budget
    if (document.getElementById("chart_Operating_Revenue26"))
        buildFY26Graphs("chart_Operating_Revenue26", "FY26_Operating_Revenue", false);

    if (document.getElementById("chart_Non-operating_Revenue26"))
        buildFY26Graphs("chart_Non-operating_Revenue26", "FY26_Non-operating_Revenue", false);

    if (document.getElementById("chart_Expense26"))
        buildFY26Graphs("chart_Expense26", "FY26_Expense", true);

    // Page: Budget Cuts
    if (document.getElementById("chart_Operating_Revenue25") && document.getElementById("chart_Operating_RevenueChange26"))
        buildComparison("chart_Operating_Revenue25", "chart_Operating_RevenueChange26", "FY25_Operating_Revenue", "FY26_Operating_Revenue", false);

    if (document.getElementById("chart_Non-operating_Revenue25") && document.getElementById("chart_Non-operating_RevenueChange26"))
        buildComparison("chart_Non-operating_Revenue25", "chart_Non-operating_RevenueChange26", "FY25_Non-operating_Revenue", "FY26_Non-operating_Revenue", false);

    if (document.getElementById("chart_Expense25") && document.getElementById("chart_ExpenseChange26"))
        buildComparison("chart_Expense25", "chart_ExpenseChange26", "FY25_Expense", "FY26_Expense", true);

    // Page: Budget Over Time
    if (document.getElementById("chart_budget_over_time_operating_revenue"))
        buildBOTGraphs("chart_budget_over_time_operating_revenue", "OperatingRevenue_Over_Time", true);

    if (document.getElementById("chart_budget_over_time_non_operating_revenue"))
        buildBOTGraphs("chart_budget_over_time_non_operating_revenue", "NonOperating_Over_Time", true);

    if (document.getElementById("chart_budget_over_time_expense"))
        buildBOTGraphs("chart_budget_over_time_expense", "Expense_Over_Time", true);

    // Page: Budget By School
    ["chart_JSOM_Expenses", "chart_NSM_Expenses", "chart_AHT_Expenses",
     "chart_BBS_Expenses", "chart_EPPS_Expenses", "chart_IS_Expenses"].forEach(id => {
        if (document.getElementById(id)) buildExpensesGraphs(id);
    });

    if (document.getElementById("chart_AHT_Revenue"))
        buildRevenueGraphs("chart_AHT_Revenue");

    if (document.getElementById("chart_Expenses_School"))
        buildExpensesBySchoolGraph("chart_Expenses_School");

    // Page: Student Fees
    if (document.getElementById("chart_StudentFeesTotals"))
        buildStudentFeesTotals("chart_StudentFeesTotals", "FY26_TuitionAndStudentFees_Totals");

    if (document.getElementById("chart_StudentFeesOverview"))
        buildFeesBreakdown("chart_StudentFeesOverview", "FY26_TuitionAndStudentFees_Totals", "TOTAL REVENUE");

    if (document.getElementById("chart_MandatoryFeeBreakdown"))
        buildFeesBreakdown("chart_MandatoryFeeBreakdown", "FY26_MandatoryFees", "TOTAL MANDATORY");

    if (document.getElementById("chart_ProgramFeesBreakdown"))
        buildFeesBreakdown("chart_ProgramFeesBreakdown", "FY26_ProgramCourseOtherFees", "TOTAL PROGRAM");

    if (document.getElementById("studentFeesTable"))
        buildStudentFeesTable("studentFeesTable", "FY26_TuitionAndStudentFees_Totals", "FY26_MandatoryFees", "FY26_ProgramCourseOtherFees");

    // Page: Auxiliary Budget
    if (document.getElementById("housingChart"))
        buildAuxiliaryChart("housingChart", "FY26_Auxiliary_Budget", "Housing");

    if (document.getElementById("urecChart"))
        buildAuxiliaryChart("urecChart", "FY26_Auxiliary_Budget", "University Recreation");

    if (document.getElementById("parkingChart"))
        buildAuxiliaryChart("parkingChart", "FY26_Auxiliary_Budget", "Parking & Transportation");

});
