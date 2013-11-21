snorkel
=======

<s>snorkel</s> is a real time data analysis tool, meant to answer
questions about the *now*.

## Quick Start

### 0) get it running

    git clone snorkel.git

    # install node (>= 0.8) and mongo-db (>= 2.2)

    # get the code and dependencies for snorkel
    cd snorkel/snorkel
    npm install

    # helper for restarting the server when js files change
    npm install -g nodemon

    # edit your config
    # make sure to enable proxy mode and set the hostname, if applicable
    cp config/config.js config/local/my_dev_env.js

    # create some self signed SSL certs
    scripts/setup_certificates.sh

    # setup your user (creates config/users.htpasswd with basic http auth)
    scripts/add_user.sh

    # start in development mode
    ENV=local/my_dev_env nodemon app.js

### 1a) generate some fake data

    # add 100,000 samples to a fake dataset
    open http://localhost:3000/data/generate?n=100000

### 1b) put your datas in it

    $.post("/data/import", {
      dataset: "mysql",
      subset: "slow_queries",
      samples: JSON.stringify([ // that's right, you send a JSON stringified array of samples at a time
        {
          integer: {
            'query_duration': 500,
            'query_count' : 10,
            // this sample is actually emitted on 1 / 1000 requests,
            // so we give it a 'weight' of 1000 or sample_rate of 1000
            'weight' : 1000, 
          },
          string: {
            'table' : 'a_mysql_table',
            'query_str' : 'select * from <TABLE>;',
            'host' : 'mysql001'
          },
          set: {
            'flags' : [
              'foo', 'bar', 'baz'
            ]
          },
        }
      ])});

### 2) know your data

open http://localhost:3000 in your browser and get started :-)

### 3) expand your data

    # bump the capped collection size to 200MB
    scripts/change_collection_size.sh test/data 200

## Heroku Support

(thanks @rameshvk)

1. create an app (`heroku apps:create snorkelista`, for example)
2. set environment variables on heroku for the app:
  1. `heroku config:add MONGOHQ\_URL=mongodb://user:pwd@host:port/db`
  2. `heroku config:add ENV=heroku`
  3. `heroku config:add HTTPHOST=snorkelista.herokuapp.com` (or whatever you use)
  4. `heroku config:add GPLUS\_DOMAIN=yourcompanydomain.com` (or change heroku.js to configure auth)
1. push everything under the snorkel directory (in particular the Procfile) to your heroku git repo. If you have git subtree, use: `git subtree push --prefix snorkel heroku master`

