#!/bin/sh

if [ $? -ne 0 ]; then
  echo ">> Error creating contract account"
  exit 1
fi

echo ">> Creating contract account"

near create-account escrow.scryptok8.testnet --masterAccount scryptok8.testnet