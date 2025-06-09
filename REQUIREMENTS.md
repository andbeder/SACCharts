# System Requirements for SAC Charts

## Purpose
SAC Charts is a Lightning application for Salesforce that provides interactive charts using the ApexCharts JavaScript library. It sources data from CRM Analytics (Wave) datasets via SAQL queries. The project aims to enable quick creation of new charts by supplying basic input parameters such as chart type, colors, aesthetics, and SAQL queries.

## Functional Requirements
1. **Interactive Chart Display**
   - Render charts in the Salesforce UI using ApexCharts.
   - Support multiple chart types (e.g., bar, line, area) as provided by the underlying library.
2. **Dataset Integration**
   - Load CRM Analytics datasets by name or ID.
   - Execute SAQL queries to retrieve chart data.
   - Allow dynamic assembly of SAQL queries based on filter selections.
3. **User Filters**
   - Provide selectable filters for AMC, division, risk pool, and claim type.
   - Update chart results when filters change.
4. **Chart Configuration**
   - Accept customization parameters for colors, titles, and layout.
   - Display placeholder text while data is loading.
5. **Event Handling**
   - Dispatch events to communicate dataset information between components.
6. **Testing**
   - Unit tests for Lightning Web Components using Jest.
   - Apex test classes for server-side code placed under the `test` package (`force-app/test`).

## Non‑Functional Requirements
1. **Performance**
   - Charts should render within two seconds after data retrieval.
   - SAQL queries should be optimized for minimal response time.
2. **Reliability**
   - Handle query errors gracefully and log them to the browser console.
3. **Security**
   - Enforce Salesforce sharing rules and permissions.
   - Avoid exposing sensitive dataset IDs in the UI.
4. **Maintainability**
   - Follow standard Salesforce DX project structure.
   - Keep tests and documentation updated with code changes.

## Out of Scope
- Persisting user preferences across sessions.
- Creating or managing CRM Analytics datasets.

