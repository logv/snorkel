### customizability

goal: create a version of snorkel that is easy to customize and extend

pieces:

* snorkel is called from the outside from its owner application
* the owner application configures datasets for snorkel
* the owner application configures plugins and views
* the owner application can style parts of snorkel (but how)

### work with presto

goal: work with prestodb which is popular in enterprise.

pieces:

* write a prestodb adapter
* write tests against what an adapter does
