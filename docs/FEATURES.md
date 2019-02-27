## Features

### ported from original snorkel

* table, time, dist and samples views
* timeline view (for browsing samples)
* filters and filter helpers
* saved query dialog
* custom time inputs
* advanced views: forecasting, drilldown, weco

### re-implemented in snorkel.pudgy

* custom aggregations (p63(foo), for example)
* comparison queries (run and compare two queries side by side)
* query sidebar and view controls
* query builder (query spec -> sybil invocation)
* dataset landing page
* bring over more views (scatter, multihist, bars)
* user auth (with flask_security)
* customize which views a dataset uses
* no samples view
* user roles
* data ingestion that passes data from slite to sybil
* dataset presenters
* per table user permissions
* dashboards endpoint for use with grafana


### planned

* robust error handling
* dataset settings page
* graph views: datamaps

### unknown

* rss feed support in time series views
* presto or other backend adapters
* favorite queries
* query audit log

