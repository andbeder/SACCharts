import { LightningElement, api, wire } from 'lwc';
import { getDatasets, executeQuery } from "lightning/analyticsWaveApi";
import apexchartJs from '@salesforce/resourceUrl/ApexCharts';
import { loadScript } from 'lightning/platformResourceLoader';

export default class SacCharts extends LightningElement {
    @api reportClaimsName = "Report_Claim_Layer";
    @api amcSAQL;
    @api divisionSAQL;
    @api chartA1SAQL;
    @api chartA2SAQL;
    @api chartBSAQL;
    @api chartCSAQL;
    @api chartC2SAQL;
//    @api nextPage = undefined;
    @api reportDatasetIds;
    @api sacDatasetIds;

    amcSelections = new Array();
    divisionSelections = new Array();
    riskPoolSelection = new Array();
    claimTypeSelections = new Array();
    chartObject = new Object();

    amcOptions = undefined;
    divisionOptions = undefined;
    riskPoolOptions = [{ label: 'All', value: 'in all' }, { label: 'Shared', value: '== "Shared"' }, { label: 'Separate', value: '== "Separate"' }];
    claimTypeOptions = [{ label: 'Event', value: 'Event'}, { label: 'Claim', value: 'Claim'}, { label: 'Suit', value: 'Suit'}]
    reportClaimsId = undefined;


    @wire(getDatasets, {
        datasetTypes: ["Default", "Live"],
        licenseType: "EinsteinAnalytics",
        pageSize: 200,
        q: "Report"
    })
    onGetReportDatasets({ data, error }) {
        this.reportDatasetIds = this.onGetDatasets(data, error);
    }

    @wire(getDatasets, {
        datasetTypes: ["Default", "Live"],
        licenseType: "EinsteinAnalytics",
        pageSize: 200,
        q: 'SAC'
    })
    onGetSACDatasets({ data, error }) {
        this.sacDatasetIds = this.onGetDatasets(data, error);
        this.renderChartC();
    }

    onGetDatasets(data, error){
        if (error) {
            console.log("getDataset(${idOrApiName}) ERROR:", error);
        } else if (data) {
            console.log("getDataset(${idOrApiName}) RESPONSE:", data);

            var datasetIds = new Object();
            for (let i = 0; i < data.datasets.length; i++) {
                var name = data.datasets[i].name;
                var id = data.datasets[i].id;
                var versionId = data.datasets[i].currentVersionId;
                datasetIds[name] = id + '/' + versionId;
            }
            return datasetIds;
        }
    }

    get amcQuery() {
        if (this.reportDatasetIds){
            var saql = 'q = load "' + this.reportDatasetIds["Report_ClaimLayer"] + '";\nq = group q by MCIC_AMC_Node_Formula__c;\n q = foreach q generate MCIC_AMC_Node_Formula__c as AMC;';
            return {query: saql}
        }
    }

    get divisionQuery() {
        if (this.reportDatasetIds){
            var saql = 'q = load "' + this.reportDatasetIds["Report_ClaimLayer"] + '";\nq = group q by MCIC_Abbreviation__c;\n q = foreach q generate MCIC_Abbreviation__c as Division;';
            return {query: saql}
        }
    }

    get chartA1Query() {
        if (!this.chartA1SAQL) { return undefined; }
        return {
            query: this.chartA1SAQL
        }
    }

    get chartA2Query() {
        if (!this.chartA2SAQL) { return undefined; }
        return {
            query: this.chartA2SAQL
        }
    }

    get chartBQuery() {
        if (!this.chartBSAQL) { return undefined; }
        return {
            query: this.chartBSAQL
        }
    }

    get chartCQuery() {
        if (!this.chartCSAQL) { return undefined; }
        return {
            query: this.chartCSAQL
        }
    }

    @wire(executeQuery, {
        query: '$amcQuery'
    })
    onExecuteAMCQuery({ data, error }) {
        if (error) {
            console.log(`executeQuery() ERROR:`, error);
        } else if (data) {
            console.log('executeQuery results RESPONSE:', data.results.records);
            console.log('executeQuery metadata RESPONSE:', data.results.metadata);
            this.amcOptions = new Array()
            for (let i = 0; i < data.results.records.length; i++) {
                var amc = data.results.records[i].AMC;
                this.amcOptions.push({ label: amc, value: amc });
            }
        }
    }

    @wire(executeQuery, {
        query: '$divisionQuery'
    })
    onExecuteDivisionQuery({ data, error }) {
        if (error) {
            console.log(`executeQuery() ERROR:`, error);
        } else if (data) {
            console.log('executeQuery results RESPONSE:', data.results.records);
            console.log('executeQuery metadata RESPONSE:', data.results.metadata);
            this.divisionOptions = new Array()
            for (let i = 0; i < data.results.records.length; i++) {
                var division = data.results.records[i].Division;
                this.divisionOptions.push({ label: division, value: division });
            }
        }
    }

    @wire(executeQuery, {
        query: '$chartA1Query'
    })
    onExecuteA1Query({ data, error }) {
        if (error) {
            console.log(`executeQuery() ERROR:`, error);
        } else if (data) {
            console.log('executeQuery results RESPONSE:', data.results.records);
            console.log('executeQuery metadata RESPONSE:', data.results.metadata);
            this.updateAQuery(data, 'chartA1', this.chartAOptions);
        }
    }

    @wire(executeQuery, {
        query: '$chartA2Query'
    })
    onExecuteA2Query({ data, error }) {
        if (error) {
            console.log(`executeQuery() ERROR:`, error);
        } else if (data) {
            console.log('executeQuery results RESPONSE:', data.results.records);
            console.log('executeQuery metadata RESPONSE:', data.results.metadata);
            this.updateAQuery(data, 'chartA2', this.chartAOptions);
        }
    }

    updateAQuery(data, chartName, options) {
        var dataMap = { chartLabels: new Array(), chartData: new Array() };
        for (let i = 0; i < data.results.records.length; i++) {
            dataMap.chartLabels.push(data.results.records[i].xAxis);
            dataMap.chartData.push(data.results.records[i].value);
        }

        let chartOptions = { ...options };
        this.groupByYear(chartOptions, dataMap.chartLabels);
        chartOptions.series = [{
            name: 'Reported Cases',
            data: dataMap.chartData
        }];
        this.chartObject[chartName].updateOptions(chartOptions);
    }


    groupByYear(options, chartLabels) {
        // Map number of years to columns groupings
        var years = new Object();
        for (let i = 0; i < chartLabels.length; i++) {
            var date = new Date(chartLabels[i]);
            var y = date.getFullYear();
            var c = 0;
            if (years[y]) {
                c = years[y];
            }
            c++;
            years[y] = c;
        }

        var groupings = new Array();
        for (let year of Object.keys(years)) {
            var c = years[year];
            groupings.push({ title: year, cols: c });
        }
        options.xaxis.categories = chartLabels;
        options.xaxis.group.groups = groupings;
    }


    @wire(executeQuery, {
        query: '$chartBQuery'
    })
    onExecuteBQuery({ data, error }) {
        if (error) {
            console.log(`executeQuery() ERROR:`, error);
        } else if (data) {
            console.log('executeQuery results RESPONSE:', data.results.records);
            console.log('executeQuery metadata RESPONSE:', data.results.metadata);
            //let options = { ...this.chartBOptions };
            let mapVector = new Object();
            for (let i = 0; i < data.results.records.length; i++) {
                var xAxis = data.results.records[i].xAxis;
                var value = data.results.records[i].value;
                if (mapVector[xAxis] == undefined) {
                    mapVector[xAxis] = new Array();
                }
                mapVector[xAxis].push(value);
            }
            var series = new Object();
            series.type = 'boxPlot';
            series.name = "Loss Ratios";
            series.data = new Array();
            var keyset = Object.getOwnPropertyNames(mapVector)
            keyset.forEach(function(amc) {
                series.data.push({x: amc, y: mapVector[amc]});
              })
             //this.chartBOptions.series = series;
            console.log('updateOptions():', JSON.stringify(series));
            this.chartObject['chartB'].updateSeries([series]);
            //this.initChart('.chartB', this.chartBOptions, 'chartB');
        }
    }

    @wire(executeQuery, {
        query: '$chartCQuery'
    })
    onExecuteCQuery({ data, error }) {
        if (error) {
            console.log(`executeQuery() ERROR:`, error);
        } else if (data) {
            console.log('executeQuery results RESPONSE:', data.results.records);
            console.log('executeQuery metadata RESPONSE:', data.results.metadata);
            var options = {...this.chartCOptions};
            var series = options.series;
            options.xaxis.categories = new Array();
            var max1 = 0;
            var max2 = 0;
            var min2 = 1;
            for (let i = 0;i < data.results.records.length;i++){
                var record = data.results.records[i];
                options.xaxis.categories.push(record.xAxis);
                var capital = record["Capital"];
                var gains = record["Unrealized Gains"];
                var ctor = record["Capital to Reserves"];
                series[0].data.push(capital);
                series[1].data.push(gains);
                series[2].data.push(ctor);
                var height = capital + gains
                max1 = (max1 >  height) ? max1 : height;
                max2 = (max2 > ctor) ? max2 : ctor;
                min2 = (min2 < ctor) ? min2 : ctor;
            }
            //alert(max);
            max1 /= 0.7;
            max1 = Math.ceil(max1 / 100000000) * 100000000;
            max2 = Math.ceil(max2 * 10) / 10;
            min2 = Math.floor(min2 * 10) / 10;
            options.yaxis[0].min = 0
            options.yaxis[1].min = 0
            options.yaxis[0].max = max1;
            options.yaxis[1].max = max1;
            options.yaxis[2].min = min2 - ((max2 - min2) * 2);
            options.yaxis[2].max = max2 * 1;
            //options.yaxis[0].stepSize = 150000000;
            //options.yaxis[1].stepSize = 150000000;

            //this.chartObject['chartC'].updateOptions(options);
            this.initChart('.chartC', options, 'chartC');
        }
    }


    renderedCallback() {
        this.chartA1 = this.initChart('.chart1', this.chartAOptions, 'chartA1');
        this.chartA2 = this.initChart('.chart2', this.chartAOptions, 'chartA2');
        this.chartB = this.initChart('.chartB', this.chartBOptions, 'chartB');
        //this.chartC = this.initChart('.chartC', this.chartCOptions, 'chartC');
    }

    initChart(chartName, options, name) {

        loadScript(this, apexchartJs + '/dist/apexcharts.js')
            .then(() => {
                //alert(options);
                const div = this.template.querySelector(chartName);
                const chart = new ApexCharts(div, options);
                chart.render();
                this.chartObject[name] = chart;
            })
            .catch((error) => {
                console.error('Failed: ' + error);
            });
    }

    handleAMCChange(e) {
        this.amcSelections = e.detail.value;
    }
    handleDivisionChange(e) {
        this.divisionSelections = e.detail.value;
    }
    handleRiskPoolChange(e) {
        this.riskPoolSelection = e.detail.value;
    }
    handleClaimTypeChange(e) {
        this.claimTypeSelections = e.detail.value;
    }

    filtersUpdated() {
        this.renderChartA();
        this.renderChartB();
    }


    getFilters(isAMC) {
        var SAQL = "";
        if (this.amcSelections.length > 0) {
            if (isAMC) {
                SAQL += 'q = filter q by MCIC_AMC_Node_Formula__c in ' + JSON.stringify(this.amcSelections) + ';\n';
            } else {
                SAQL += 'q = filter q by MCIC_AMC_Node_Formula__c not in ' + JSON.stringify(this.amcSelections) + ';\n';
            }
        }

        if (this.divisionSelections.length > 0) {
            if (isAMC) {
                SAQL += 'q = filter q by MCIC_Abbreviation__c in ' + JSON.stringify(this.divisionSelections) + ';\n';
            } else {
                SAQL += 'q = filter q by MCIC_Abbreviation__c not in ' + JSON.stringify(this.divisionSelections) + ';\n';
            }
        }
        if (this.riskPoolSelection.length > 0){
            SAQL += 'q = filter q by MCIC_Risk_Pool__c ' + this.riskPoolSelection + ';\n';
        }
        if (this.claimTypeSelections.length > 0){
            SAQL += 'q = filter q by MCIC_Case_Type__c in ' + JSON.stringify(this.claimTypeSelections) + ';\n';
        }
        return SAQL;
    }


    renderChartA() {
        if (this.reportDatasetIds){
            this.chartA1SAQL = 'q = load "' + this.reportDatasetIds["Report_ClaimLayer"] + '";'
                + ' q = filter q by date(Date_of_Loss__c_Year, Date_of_Loss__c_Month, Date_of_Loss__c_Day) in ["5 years ago".."current day"];'
                + this.getFilters(true)
                + ' q = filter q by MCIC_Case_Type__c in ["Claim", "Suit"];'
                + ' q = filter q by (Snapshot_Date_Text == "2023-12-31" && Snapshot_Date_Year == "2023");'
                + ' q = group q by (Date_of_Loss__c_Year, Date_of_Loss__c_Quarter);'
                + ' q = foreach q generate Date_of_Loss__c_Year + "-" + number_to_string(string_to_number(Date_of_Loss__c_Quarter) * 3, "00")  + "-01" as xAxis, unique(Claim__c) as value;';

            this.chartA2SAQL = 'q = load "' + this.reportDatasetIds["Report_ClaimLayer"] + '";'
                + ' q = filter q by date(Date_of_Loss__c_Year, Date_of_Loss__c_Month, Date_of_Loss__c_Day) in ["5 years ago".."current day"];'
                + this.getFilters(false)
                + ' q = filter q by MCIC_Case_Type__c in ["Claim", "Suit"];'
                + ' q = filter q by (Snapshot_Date_Text == "2023-12-31" && Snapshot_Date_Year == "2023");'
                + ' q = group q by (Date_of_Loss__c_Year, Date_of_Loss__c_Quarter);'
                + ' q = foreach q generate Date_of_Loss__c_Year + "-" + number_to_string(string_to_number(Date_of_Loss__c_Quarter) * 3, "00")  + "-01" as xAxis, unique(Claim__c) as value;';
        }
    }

    renderChartB() {
        if (this.sacDatasetIds){
            this.chartBSAQL = 'q = load "' + this.sacDatasetIds['SAC_Metric_R'] + '";'
            + ' q = filter q by Risk_Pool_Final == "Shared";'
            + ' q = filter q by Policy_Year_Final in ["2000", "2001", "2002", "2003", "2004", "2005", "2006", "2007", "2008", "2009", "2010", "2011", "2012", "2013", "2014", "2015", "2016", "2017", "2018", "2019"];'
            + ' q = filter q by Snapshot_Date_Key_Final in ["20230430", "NULL"];'
            + ' q = group q by (Premium_Group_Final, Policy_Year_Final);'
            + ' q = foreach q generate q.Premium_Group_Final as Premium_Group_Final, q.Policy_Year_Final as Policy_Year_Final, sum(q.\'Premium.SUM_Deposit_Premium\') as B, sum(q.SUM_Incurred) as C, sum(q.\'Premium.SUM_Audit_Premium\') as D, sum(q.\'Premium.SUM_Retro_Premium\') as E;'
            + ' q = group q by (Premium_Group_Final, Policy_Year_Final);'
            + ' q = foreach q generate Premium_Group_Final, Policy_Year_Final, sum(C)/(sum(B)+sum(D)+sum(E)) as A;'
            + ' q = filter q by A > 0 and A < 4;'
            + ' q = group q by (Premium_Group_Final, Policy_Year_Final);'
            + ' q = foreach q generate Premium_Group_Final, Policy_Year_Final, sum(A) as A, row_number() over([..] partition by Premium_Group_Final order by sum(A)) as B, count() over ([..] partition by Premium_Group_Final) as C;'
            + ' q = foreach q generate Premium_Group_Final, Policy_Year_Final, A, B, C, case when (B/C) <= 0.25 then B else 0 end as Q1, case when (B/C) <= 0.5 then B else 0 end as Q2, case when (B/C) <= 0.75 then B else 0 end as Q3;'
            + ' q = group q by (Premium_Group_Final, Policy_Year_Final);'
            + ' q = foreach q generate Premium_Group_Final, Policy_Year_Final, sum(A) as A, sum(B) as B, sum(C) as C, max(sum(Q1)) over ([..] partition by Premium_Group_Final) as Q1, max(sum(Q2)) over ([..] partition by Premium_Group_Final) as Q2, max(sum(Q3)) over ([..] partition by Premium_Group_Final) as Q3;'
            + ' p1 = filter q by B == 1;'
            + ' p2 = filter q by B == Q1;'
            + ' p3 = filter q by B == Q2;'
            + ' p4 = filter q by B == Q3;'
            + ' p5 = filter q by B == C;'
            + ' q = union p1, p2, p3, p4, p5;'
            + ' q = foreach q generate Premium_Group_Final as xAxis, A as value;'
            + ' q = order q by (xAxis, value)';
        }
    }

    renderChartC() {
        if (this.sacDatasetIds){
            this.chartCSAQL = 'q = load "' + this.sacDatasetIds['External_SAC_Financials_Capital_Ratio_Trend_YJ'] + '";'
            + 'q = filter q by \'AMC\' in ["Columbia", "Cornell", "JHM", "NYP", "URM", "Unrealized", "YNHH", "YU"];'
            + 'q = filter q by \'Calendar_Year\' in ["2014", "2015", "2016", "2017", "2018", "2019", "2020", "2021", "2022", "2023"];'
            + 'q = group q by \'Calendar_Year\';'
            + 'q = foreach q generate q.\'Calendar_Year\' as \'Calendar_Year\', sum(q.\'Capital\') as \'B\', sum(q.\'Reserves\') as \'C\', sum(q.\'Unrealized_GainLoss\') as \'D\';'
            + 'q = foreach q generate \'Calendar_Year\' as xAxis, \'B\' as Capital, \'D\' as \'Unrealized Gains\', B/C as \'Capital to Reserves\';'
        }
    }

    chartCOptions = {
        series: [{
            name: 'Capital',
            type: 'column',
            data: []
        }, {
            name: 'Unrealized Gain/Loss',
            type: 'column',
            data: []
        }, {
            name: 'Capital to Reserves',
            type: 'line',
            data: []
        }],
        chart: {
            height: 410,
            type: 'line',
            stacked: true,
            dropShadow: {
                enabled: true,
                color: '#000',
                top: 5,
                left: 3,
                blur: 3,
                opacity: 0.2
            },
        },
        colors: ["#002060", "#175F68", "#EF6B4D"],
        plotOptions: {
            bar: {
                opacity: 1,
                columnWidth: '85%',
                dataLabels: {
                    position: 'center'
                }
            }
        },
        fill: {
            opacity: 1

        },
        stroke: {
            width: [1, 1, 4]
        },
        title: {
            text: 'Capital Ratio Trend',
            align: 'center'
        },
        dataLabels: {
            enabled: true,
            enabledOnSeries: [0, 1, 2],            
            background: {
                enabled: true,
                borderWidth: 0,
                opacity: 0.9
            },
            formatter: function(value, { seriesIndex, dataPointIndex, w }) {
                if (seriesIndex <  2){
                    return '$' + (value / 1000000).toFixed(1) + 'M';
                } else {
                    return (value * 100).toFixed(0) + '%';
                }
            }
        },
        xaxis: {
            type: 'datetime'
        },
        yaxis: [
            {
                stepSize: 150000000,
                title: {
                    text: 'Dollars',
                },
                labels: {
                    formatter: function(val, index) {return '$' + (val / 1000000).toFixed(1) + 'M'} 
                }
            }, 
            {
                stepSize: 150000000,
                show: false,
                title: {
                    text: 'Dollars',
                },
                labels: {
                    formatter: function(val, index) {return '$' + (val / 1000000).toFixed(1) + 'M'} 
                }
            }, 
                {
            opposite: true,
            title: {
                text: 'Ratio'
            },
            labels: {
                formatter: function(val, index) {return (val * 100).toFixed(0) + '%'}
            }
        }],
        noData: {
            text: 'Loading...'
        }
    }


    chartBOptions = {
        chart: {
            type: 'boxPlot',
            height: 410
        },
        series: [],
        title: {
            text: 'Basic BoxPlot Chart',
            align: 'center'
        },
        yaxis:{
            labels: {
                formatter: function(val, index) {return (val * 100).toFixed(0) + '%'}
            }
        },
        plotOptions: {
            boxPlot: {
                colors: {
                    upper: '#3C5B81',
                    lower: '#97C1DA'
                }
            }
        },
        noData: {
            text: 'Loading...'
        }
    }

    chartAOptions = {
        chart: {
            type: 'bar',
            height: 410
        },
        series: [],
        plotOptions: {
            bar: {
                columnWidth: '85%',
                dataLabels: {
                    position: 'top'
                }
            },
        },
        colors: ['#002060'],
        dataLabels: {
            enabled: true,
            offsetY: 10,
            style: {
                fontSize: '12px',
                colors: ["#FFFFFF"]
            }
        },
        title: {
            text: 'Reported Cases by Quarter - ',
            align: 'center'
        },
        xaxis: {
            labels: {
                formatter: function (timestamp) {
                    var date = new Date(timestamp);
                    var quarter = Math.floor((date.getMonth() + 3) / 3);
                    //return date.getFullYear() + " Q" + quarter;
                    return "Q" + quarter;
                }
            },
            group: {
                style: {
                    fontSize: '12px',
                    fontWeight: 700
                }
            }
        },
        fill: {
            opacity: 1

        },
        noData: {
            text: 'Loading...'
        }
    };

}
