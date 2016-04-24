## Heroku Support

(thanks @rameshvk)

1. create an app (`heroku apps:create snorkelista`, for example)
2. set environment variables on heroku for the app:
  1. `heroku config:add MONGOHQ\_URL=mongodb://user:pwd@host:port/db`
  2. `heroku config:add ENV=heroku`
  3. `heroku config:add HTTPHOST=snorkelista.herokuapp.com` (or whatever you use)
  4. `heroku config:add GPLUS\_DOMAIN=yourcompanydomain.com` (or change heroku.js to configure auth)
1. push everything under the snorkel directory (in particular the Procfile) to your heroku git repo. If you have git subtree, use: `git subtree push --prefix snorkel heroku master`

