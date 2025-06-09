# System Design for SAC Charts

## Overview
SAC Charts is built as a Salesforce DX project. It uses Lightning Web Components (LWCs) to render charts in the Salesforce UI. Chart data is fetched from CRM Analytics datasets using the `analyticsWaveApi` module, and the visuals are produced through the ApexCharts JavaScript library delivered as a static resource.

The default dataset for the application is **exped**, which contains climbing expedition information. Filters and queries are executed against this dataset in the sandbox environment.

The application is structured to allow rapid configuration of new charts by providing SAQL queries and chart options as parameters.

## High-Level Architecture
```
+------------------+       +--------------------+
|  Lightning Web   |       |  CRM Analytics     |
|  Components      |<----->|  (Wave API)        |
|  (chartAlpha,    |       +--------------------+
|   chartFramework)|
|                  |             ^
|                  |             |
|  ApexCharts JS   |<------------+
|  Static Resource |
+------------------+
```

- **Lightning Web Components** handle user interaction, assemble SAQL queries, execute them via `executeQuery`, and render chart results.
- **CRM Analytics** provides datasets and executes SAQL queries.
- **ApexCharts** is loaded as a static resource and performs client-side chart rendering.

## Component Responsibilities
### chartFramework
- Central component for loading datasets and building charts.
- Retrieves dataset IDs using `getDatasets`.
- Builds SAQL queries including user-selected filters.
- Initializes ApexCharts instances and updates them when data changes.

### chartAlpha, chartDemo1, sacCharts
- Examples or specific implementations that utilize the framework.
- Each component composes SAQL and chart options specific to a chart instance.

### Apex Classes
- `DPOStateMachine` exists as a placeholder Apex class (currently empty). Server-side logic can be added here as needed. Any Apex test classes should reside under `force-app/test`.

## Data Flow
1. **User Interaction** – Users select filter values (e.g., host, nation, season, ski) via the UI.
2. **SAQL Assembly** – Components construct SAQL queries based on selected filters and dataset ID.
3. **Query Execution** – The LWC calls `executeQuery` from `analyticsWaveApi` to run the SAQL query against CRM Analytics.
4. **Chart Rendering** – Retrieved records are mapped into chart series and categories, then passed to ApexCharts for rendering.
5. **Updates** – When filters change, new SAQL queries are generated and charts are refreshed.

## Testing Strategy
- **LWC Jest Tests** reside in `__tests__` folders alongside each component.
- **Apex Test Classes** must be created under `force-app/test` whenever new Apex functionality is added.

## Deployment
- Managed as a Salesforce DX project. The main package source lives in `force-app/main/default`.
- Static resources and LWC bundles are deployed using standard Salesforce CLI commands.

