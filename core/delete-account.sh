#!/bin/sh

if [ $? -ne 0 ]; then
  echo ">> Error deleting account"
  exit 1
fi

echo ">> Deleting account"

near delete nearloans.scryptok8.testnet scryptok8.testnet