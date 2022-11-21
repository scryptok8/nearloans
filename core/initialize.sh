#!/bin/sh

./build.sh

if [ $? -ne 0 ]; then
  echo ">> Error building contract"
  exit 1
fi

echo ">> Initializing contract"

# https://docs.near.org/tools/near-cli#near-dev-deploy
near deploy nearloans.scryptok8.testnet build/near-loans.wasm --initFunction init --initArgs '{"message":"Near Loans listening..."}'