import { createElement } from 'lwc';
import SacCharts from 'c/sacCharts';

describe('c-sac-charts', () => {
    afterEach(() => {
        // The jsdom instance is shared across test cases in a single file so reset the DOM
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('renders chart container', () => {
        const element = createElement('c-sac-charts', {
            is: SacCharts
        });
        document.body.appendChild(element);

        const chartDiv = element.shadowRoot.querySelector('div.chart1');
        expect(chartDiv).not.toBeNull();
    });
});