## Quick Start

### 0) get snorkel running

    git clone https://github.com/logv/snorkel
    # install node (>= 0.8) and mongo-db (>= 2.2)

    # get the code and dependencies for snorkel
    cd snorkel/snorkel
    npm install

    # helper for restarting the server when js files change
    # (for production, i recommend using pm2 with a memory limit on processes)
    npm install -g nodemon

    # edit your config
    # make sure to enable proxy mode and set the hostname, if applicable
    cp config/config.js config/local/my_dev_env.js

    # create some self signed SSL certs
    scripts/setup_certificates.sh

    # setup a user (creates config/users.htpasswd with basic http auth)
    bash scripts/add_user.sh

    # start in development mode
    ENV=local/my_dev_env nodemon app.js

### 1) put your data in snorkel

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

open http://localhost:3000 in your browser and get started

### 3) expand your data

    # bump the capped collection size to 200MB in mongo
    scripts/change_collection_size.sh test/data 200

