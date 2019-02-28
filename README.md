## snorkel.lite

snorkel is a real time data analysis tool, meant to answer questions about the
now. At its heart, snorkel is built on the idea that iterative analysis is key
to understanding. In other words - when graphs move, it should be easy to drill
down on what is happening and why, not a frustrating exercise in adjusting
failed queries.

Using [sybil](https://github.com/logv/sybil) as a backend, snorkel can support
querying datasets with tens of millions of samples in realtime.

snorkel.lite is a re-implementation of snorkel in python, to read more
about why we moved to python from nodejs, [see the motivation
docs](https://github.com/logv/snorkel/blob/slite/docs/MOTIVATION.md)

### status

**Feb 2019**

snorkel.lite is now in Alpha status. All but one view (map view) has been
ported over from snorkel, data ingestion works and grafana endpoints are
compatible. I have switched over from using the original snorkel to using
snorkel.lite since November of 2018.

**Sept. 2018**

Development has started on porting snorkel to python.

### installation

#### Deployment

The simplest way to deploy snorkel will be to use the
[snorkel-deploy](https://github.com/logv/snorkel.deploy) repository. The deploy
repository uses the snorkel-lite pypi package and lets you configure
snorkel separately from its code.

#### Development

To develop on snorkel, clone snorkel and get going:

```
git clone --single-branch -b slite git@github.com:logv/snorkel.git slite
cd slite
make setup
make run
```

### configuration

[see docs/SETUP.md](https://github.com/logv/snorkel/blob/slite/docs/SETUP.md)

## documents

[motivation](https://github.com/logv/snorkel/blob/slite/docs/MOTIVATION.md) and
[features](https://github.com/logv/snorkel/blob/slite/docs/FEATURES.md)

[try a demo](https://github.com/logV/snorkel/wiki/Demo)

[read the quick start](https://github.com/logV/snorkel/wiki/QuickStart)

[usage guide](https://github.com/logV/snorkel/wiki/Guide)

[grafana snorkel datasource](https://github.com/logV/grafana-snorkel-datasource) is a plugin for grafana (3.0+) to query snorkel. While this plugin is in early stages, grafana is quite amazing.

## screengifs

<img src="https://i.imgur.com/7E4vKK2.gif" width="800"/>
