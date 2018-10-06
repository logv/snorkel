## snorkel.pudgy

snorkel.pudgy is a re-implementation of [snorkel](https://github.com/logv/snorkel) in python


### installation

```
git clone https://git.kthxb.ai/okay/snorkel.pudgy
cd snorkel.pudgy
make build
make run
```

### motivation

the reasons for moving to python are severalfold:

* nodejs apps are annoying to maintain and deploy, as there is too much churn in the nodejs ecosystem
* backend devs don't like writing javascript, but don't seem to mind writing python
* writing an app just for sybil lets us move past old baggage of supporting mongodb and postgres

### goals

* write an easy to deploy UI for browsing data kept in sybil
* make it easy to extend and write new views: the client should feel empowered
* make an app that is easy to white label (and self host inside organizations)
* re-use as much work from original snorkel while keeping the implementation clean (ish)
* minimize external dependencies: use sqlite for data store, flask for web, etc

## features

### ported from original snorkel

* table, time, dist and samples views
* timeline view (for browsing samples)
* filters and filter helpers
* saved query dialog
* custom time inputs

### re-implemented in snorkel.pudgy

* query sidebar and view controls
* query builder (query spec -> sybil invocation)
* dataset landing page
* user auth (with flask_security)


### planned

* robust error handling
* comparison queries (run and compare two queries side by side)
* dataset presenters
* dataset settings page
* custom aggregations (p63(foo), for example)
* per dataset view listings
* bring over more views (scatter, multihist, forecasting, bars, mapview, drilldown, etc)
* user roles and per table permissions

### unknown

* presto or other adapters
* rss feeds
* dashboards (grafana?)
* favorite queries
* query audit log
