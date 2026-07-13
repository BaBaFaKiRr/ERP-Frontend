#!/bin/bash
while true; do
  echo "Starting localtunnel..."
  npx --yes localtunnel --port 3000 --subdomain hedgeone-frontend-stable
  echo "Localtunnel crashed or disconnected. Restarting in 2 seconds..."
  sleep 2
done
