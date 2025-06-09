import { LightningElement, wire } from 'lwc';
import { getDatasets, executeQuery } from 'lightning/analyticsWaveApi';
import apexchartJs from '@salesforce/resourceUrl/ApexCharts';
import { loadScript } from 'lightning/platformResourceLoader';

export default class SacCharts extends LightningElement {
    datasetIds;

    hostSelections = [];
    nationSelections = [];
    seasonSelections = [];
    skiSelection = [];

    hostOptions;
    nationOptions;
    seasonOptions;
    skiOptions = [
        { label: 'All', value: 'in all' },
        { label: 'Yes', value: '== "Yes"' },
        { label: 'No', value: '== "No"' }
    ];

    chartObject = {};

    @wire(getDatasets, {
        datasetTypes: ['Default', 'Live'],
        licenseType: 'EinsteinAnalytics',
        pageSize: 200,
        q: 'exped'
    })
    onGetDataset({ data, error }) {
        if (error) {
            // eslint-disable-next-line no-console
            console.log('getDatasets ERROR:', error);
        } else if (data) {
            this.datasetIds = {};
            data.datasets.forEach(ds => {
                this.datasetIds[ds.name] = `${ds.id}/${ds.currentVersionId}`;
            });
        }
    }

    // Option queries
    get hostQuery() {
        if (this.datasetIds) {
            const id = this.datasetIds.exped;
            return {
                query: `q = load "${id}"; q = group q by 'host'; q = foreach q generate q.'host' as host;`
            };
        }
        return undefined;
    }

    get nationQuery() {
        if (this.datasetIds) {
            const id = this.datasetIds.exped;
            return {
                query: `q = load "${id}"; q = group q by 'nation'; q = foreach q generate q.'nation' as nation;`
            };
        }
        return undefined;
    }

    get seasonQuery() {
        if (this.datasetIds) {
            const id = this.datasetIds.exped;
            return {
                query: `q = load "${id}"; q = group q by 'season'; q = foreach q generate q.'season' as season;`
            };
        }
        return undefined;
    }

    @wire(executeQuery, { query: '$hostQuery' })
    onHostQuery({ data, error }) {
        if (data) {
            this.hostOptions = data.results.records.map(r => ({ label: r.host, value: r.host }));
        }
    }

    @wire(executeQuery, { query: '$nationQuery' })
    onNationQuery({ data, error }) {
        if (data) {
            this.nationOptions = data.results.records.map(r => ({ label: r.nation, value: r.nation }));
        }
    }

    @wire(executeQuery, { query: '$seasonQuery' })
    onSeasonQuery({ data, error }) {
        if (data) {
            this.seasonOptions = data.results.records.map(r => ({ label: r.season, value: r.season }));
        }
    }

    // Chart query
    get chartAQuery() {
        if (!this.datasetIds) {
            return undefined;
        }
        const id = this.datasetIds.exped;
        let saql = `q = load "${id}";\n`;
        saql += this.getFilters();
        saql += "q = group q by 'nation';\n";
        saql += "q = foreach q generate q.'nation' as nation, count(q) as Climbs;\n";
        saql += "q = order q by 'Climbs' desc;\n";
        saql += 'q = limit q 2000;';
        return { query: saql };
    }

    @wire(executeQuery, { query: '$chartAQuery' })
    onChartA({ data, error }) {
        if (data) {
            const labels = [];
            const values = [];
            data.results.records.forEach(r => {
                labels.push(r.nation);
                values.push(r.Climbs);
            });
            const options = { ...this.chartAOptions };
            options.xaxis.categories = labels;
            options.series = [{ name: 'Climbs', data: values }];
            if (this.chartObject.chartA) {
                this.chartObject.chartA.updateOptions(options);
            }
        }
    }

    renderedCallback() {
        if (!this.chartObject.chartA) {
            this.initChart('.chart1', this.chartAOptions, 'chartA');
        }
    }

    initChart(selector, options, name) {
        loadScript(this, apexchartJs + '/dist/apexcharts.js')
            .then(() => {
                const div = this.template.querySelector(selector);
                const chart = new ApexCharts(div, options);
                chart.render();
                this.chartObject[name] = chart;
            })
            .catch(error => {
                // eslint-disable-next-line no-console
                console.error('Chart load failed', error);
            });
    }

    handleHostChange(event) {
        this.hostSelections = event.detail.value;
    }
    handleNationChange(event) {
        this.nationSelections = event.detail.value;
    }
    handleSeasonChange(event) {
        this.seasonSelections = event.detail.value;
    }
    handleSkiChange(event) {
        this.skiSelection = event.detail.value;
    }

    filtersUpdated() {
        // trigger refresh of chart
        this.onChartA({ data: undefined, error: undefined });
    }

    getFilters() {
        let saql = '';
        if (this.hostSelections.length > 0) {
            saql += `q = filter q by 'host' in ${JSON.stringify(this.hostSelections)};\n`;
        }
        if (this.nationSelections.length > 0) {
            saql += `q = filter q by 'nation' in ${JSON.stringify(this.nationSelections)};\n`;
        }
        if (this.seasonSelections.length > 0) {
            saql += `q = filter q by 'season' in ${JSON.stringify(this.seasonSelections)};\n`;
        }
        if (this.skiSelection.length > 0) {
            saql += `q = filter q by 'ski' ${this.skiSelection};\n`;
        }
        return saql;
    }

    chartAOptions = {
        chart: { type: 'bar', height: 410 },
        series: [],
        xaxis: { categories: [] },
        noData: { text: 'Loading...' }
    };
}
