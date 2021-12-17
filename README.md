# urlhost

A simple link hosting web service. Redirects an alias to a target URL.

## Configuration

Backed by mongodb, urlhost expects a connection string to a mongodb 
database to be passed in through the `MONGODB_URI` environment variable.

## Deploy to fly.io

```
flyctl launch # terminate after the app name is specified and fly.toml is set up.
flyctl secrets set MONGODB_URI="..."
flyctl launch # invoke launch again to deploy with variable
```
