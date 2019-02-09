## snorkel.lite

snorkel.lite is a re-implementation of [snorkel](https://github.com/logv/snorkel) in python


### installation

```
git clone --single-branch -b slite git@github.com:logv/snorkel.git slite
cd slite
make setup
make run
```

### configuration

see docs/SETUP.md


### status


**Feb 2nd 2019**

snorkel.lite is now in Alpha status. All but two views (digraph and map view)
have been ported over from snorkel, data ingestion works and grafana endpoints
are compatible. I have switched over from using the original snorkel to using
snorkel.lite since November of 2018.


### motivation

the reasons for moving to python are severalfold:

* nodejs apps are annoying to maintain and deploy, as there is too much churn in the nodejs ecosystem
* backend devs don't like writing javascript, but don't seem to mind writing python
* writing an app just for sybil lets us move past old baggage of supporting mongodb and postgres

### goals

* write an easy to deploy UI for browsing data kept in sybil
* make it easy to extend and write new views
* make an app that is easy to white label (and self host inside organizations)
* re-use as much work from original snorkel while keeping the implementation clean
* minimize external dependencies: use sqlite for data store, flask for web, etc

## features

see docs/FEATURES.md

## screengifs

<img src="https://i.imgur.com/7E4vKK2.gif" width="800"/>
