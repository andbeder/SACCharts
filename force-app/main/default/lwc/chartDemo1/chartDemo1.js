import { LightningElement, api, wire } from 'lwc';
import { getDatasets, executeQuery } from "lightning/analyticsWaveApi";
import apexchartJs from '@salesforce/resourceUrl/ApexCharts';
import { loadScript } from 'lightning/platformResourceLoader';

export default class SacCharts extends LightningElement {
    @api reportClaimsName = "Report - Claim Layer";
    @api amcSAQL;
    @api divisionSAQL;
    @api saqlWith;
    @api saqlWithout;
    @api reportDatasetId;

    saql = `q = filter q by date(Date_of_Loss__c_Year, Date_of_Loss__c_Month, Date_of_Loss__c_Day) in ["5 years ago".."current day"];
            q = filter q by MCIC_Case_Type__c in ["Claim", "Suit"];
            q = filter q by (Snapshot_Date_Text == "2023-12-31" && Snapshot_Date_Year == "2023");
            q = group q by (Date_of_Loss__c_Year, Date_of_Loss__c_Quarter);
            q = foreach q generate Date_of_Loss__c_Year + "-" + number_to_string(string_to_number(Date_of_Loss__c_Quarter) * 3, "00")  + "-01" as xAxis, unique(Claim__c) as value;`;

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
      q: "Report - Claim Layer"
  })
  onGetReportDatasets({ data, error }) {
    if (error) {
      console.log("getDataset(${idOrApiName}) ERROR:", error);
  } else if (data) {
      console.log("getDataset(${idOrApiName}) RESPONSE:", data);
      for (let i = 0; i < data.datasets.length; i++) {
        if (data.datasets[i].label === this.reportClaimsName){
          this.reportDatasetId = data.datasets[i].id + "/" + data.datasets[i].currentVersionId;
        }
      }
    }
  }

    get amcQuery() {
        if (this.reportDatasetId){
            var saql = 'q = load "' + this.reportDatasetId + '";\nq = group q by MCIC_AMC_Node_Formula__c;\n q = foreach q generate MCIC_AMC_Node_Formula__c as AMC;';
            return {query: saql}
        }
    }

    get divisionQuery() {
        if (this.reportDatasetId){
            var saql = 'q = load "' + this.reportDatasetId + '";\nq = group q by MCIC_Abbreviation__c;\n q = foreach q generate MCIC_Abbreviation__c as Division;';
            return {query: saql}
        }
    }

    get chartA1Query() {
        if (!this.saqlWith) { return undefined; }
        return {
            query: this.saqlWith
        }
    }

    get chartA2Query() {
        if (!this.saqlWithout) { return undefined; }
        return {
            query: this.saqlWithout
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


    renderedCallback() {
        this.chartA1 = this.initChart('.chart1', this.chartAOptions, 'chartA1');
        this.chartA2 = this.initChart('.chart2', this.chartAOptions, 'chartA2');
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
        if (this.reportDatasetId){
          this.saqlWith = `q = load "${this.reportDatasetId}"; ${this.getFilters(true)} ${this.saql}`;
          this.saqlWithout = `q = load "${this.reportDatasetId}";${this.getFilters(false)} ${this.saql}`
        }
    }

}