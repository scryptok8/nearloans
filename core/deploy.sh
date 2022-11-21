#!/bin/sh

./build.sh

if [ $? -ne 0 ]; then
  echo ">> Error building contract"
  exit 1
fi

echo ">> Deploying contract"

# https://docs.near.org/tools/near-cli#near-dev-deploy
near deploy nearloans.scryptok8.testnet build/near-loans.wasm --accountId scryptok8.testnet