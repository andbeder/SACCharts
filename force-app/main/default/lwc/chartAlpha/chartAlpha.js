import { LightningElement, api, wire } from 'lwc';
import { executeQuery } from "lightning/analyticsWaveApi";

export default class ChartAlpha extends LightningElement {
  dsName = "Report - Claim Layer";
  @api dsId;
  @api amcSelections;
  @api divisionSelections;
  @api riskPoolSelection;
  @api claimTypeSelections;

  chartObject = new Object();

  saql = `q = filter q by date(Date_of_Loss__c_Year, Date_of_Loss__c_Month, Date_of_Loss__c_Day) in ["5 years ago".."current day"];
    q = filter q by MCIC_Case_Type__c in ["Claim", "Suit"];
    q = filter q by (Snapshot_Date_Text == "2023-12-31" && Snapshot_Date_Year == "2023");
    q = group q by (Date_of_Loss__c_Year, Date_of_Loss__c_Quarter);
    q = foreach q generate Date_of_Loss__c_Year + "-" + number_to_string(string_to_number(Date_of_Loss__c_Quarter) * 3, "00")  + "-01" as xAxis, unique(Claim__c) as value;`;

  renderedCallback() {
    // Creates the event with the contact ID data.
    const selectedEvent = new CustomEvent("datasetNameRequest", { detail: this.dsName });

    // Dispatches the event.
    this.dispatchEvent(selectedEvent);
  }

  get chartWithQuery() {
    if (!this.dsId) { return undefined; }
    var saql = `q = load "${this.dsId}"; ${this.getFilters(true)} ${this.saql}`;
      return {
          query: saql
      };
  }

  get chartWithoutQuery() {
    if (!this.dsId) { return undefined; }
    var saql = `q = load "${this.dsId}"; ${this.getFilters(false)} ${this.saql}`;
      return {
          query: saql
      };
  }

  @wire(executeQuery, {
      query: '$chartWithQuery'
  })
  onExecuteWithQuery({ data, error }) {
      if (error) {
          console.log(`executeQuery() ERROR:`, error);
      } else if (data) {
          console.log('executeQuery results RESPONSE:', data.results.records);
          console.log('executeQuery metadata RESPONSE:', data.results.metadata);
          this.updateChart(data, 'chart1', this.chartAOptions);
      }
  }

  @wire(executeQuery, {
      query: '$chartWithoutQuery'
  })
  onExecuteWithoutQuery({ data, error }) {
      if (error) {
          console.log(`executeQuery() ERROR:`, error);
      } else if (data) {
          console.log('executeQuery results RESPONSE:', data.results.records);
          console.log('executeQuery metadata RESPONSE:', data.results.metadata);
          this.updateChart(data, 'chart2', this.chartAOptions);
      }
  }

  updateWith(data, chartName, options) {
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

  chartOptions = {
    chart: {
        type: 'bar',
        height: 410,
        dropShadow: {
          enabled: true,
          color: '#000',
          top: 5,
          left: 3,
          blur: 3,
          opacity: 0.2
        }
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