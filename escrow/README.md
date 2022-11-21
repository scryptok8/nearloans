# Near Loans Escrow Contract
The smart contract is designed for the NEAR network. It is an independent escrow contract owned by the nearloans core contract. It holds nearloans users deposit and collateral and takes care of transfering the funds back to nearloans users. It is fully controlled by the nearloans core contract.

## Interface

### NearLoan Escrow - Direct Calls

#### Call ft transfer
near call NEARLOANS_ESCROW_ACCOUNT call_ft_transfer '{\"ft\": \"FT_ACCOUNT\", \"to\": \"ACCOUNT_ID\", \"amount\": \"AMOUNT\"}' --accountId NEARLOANS_CORE_ACCOUNT