## snorkel.pudgy

snorkel.pudgy is a re-implementation of [snorkel](https://github.com/logv/snorkel) in python


### installation

```
git clone https://git.kthxb.ai/okay/snorkel.pudgy
cd snorkel.pudgy
make build
make run
```

### configuration

see docs/SETUP.md

### motivation

the reasons for moving to python are severalfold:

* nodejs apps are annoying to maintain and deploy, as there is too much churn in the nodejs ecosystem
* backend devs don't like writing javascript, but don't seem to mind writing python
* writing an app just for sybil lets us move past old baggage of supporting mongodb and postgres

### goals

* write an easy to deploy UI for browsing data kept in sybil
* make it easy to extend and write new views
* make an app that is easy to white label (and self host inside organizations)
* re-use as much work from original snorkel while keeping the implementation clean (ish)
* minimize external dependencies: use sqlite for data store, flask for web, etc

## screengifs

<img src="https://git.kthxb.ai/okay/snorkel.pudgy/raw/docs/images/table.gif" width="800"/>

## features

see docs/FEATURES.md
