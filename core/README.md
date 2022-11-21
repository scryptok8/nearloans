# Near Loans Core Contract

The smart contract is designed for the NEAR network. It exposes the core contract methods of nearloans, interface accessible at [nearloans.finance](https://nearloans.finance)

## Interface

### NearLoans Smart Contract - Direct Calls

#### Get loans
near view NEARLOANS_CORE_ACCOUNT get_loans

#### Get loan
near view NEARLOANS_CORE_ACCOUNT get_loan '{"id":"LOAN_ID"}'

#### Get loan available interest
near view NEARLOANS_CORE_ACCOUNT get_loan_interest '{"id":"LOAN_ID"}'

#### Collect loan interest 
near call NEARLOANS_CORE_ACCOUNT collect_loan_interest '{"id":"LOAN_ID"}' --accountId ACCOUNT_ID --gas 300000000000000

#### Cancel loan 
near call NEARLOANS_CORE_ACCOUNT cancel_loan '{"id":"LOAN_ID"}' --accountId ACCOUNT_ID --gas 300000000000000

### FT Smart Contract - Transfer Calls

#### Create new loan ( as borrower )
near call FT_ACCOUNT ft_transfer_call '{"receiver_id":"NEARLOANS_CORE_ACCOUNT", "amount":"1000", "msg":"{ \"operation\":\"create_loan\", \"params\": { \"currency\": \"NEAR\", \"capital\":\"1000\", \"rate\":\"0.01\", \"mode\":\"BORROW\", \"duration\":\"360\" } }"}' --accountId ACCOUNT_ID --depositYocto 1 --gas 300000000000000

#### Create new loan ( as lender )
near call FT_ACCOUNT ft_transfer_call '{"receiver_id":"NEARLOANS_CORE_ACCOUNT", "amount":"1000", "msg":"{ \"operation\":\"create_loan\", \"params\": { \"currency\": \"NEAR\", \"capital\":\"1000\", \"rate\":\"0.01\", \"mode\":\"LEND\", \"duration\":\"360\" } }"}' --accountId ACCOUNT_ID --depositYocto 1 --gas 300000000000000

#### Accept new loan 
near call FT_ACCOUNT ft_transfer_call '{"receiver_id":"NEARLOANS_CORE_ACCOUNT", "amount":"1000", "msg":"{ \"operation\":\"accept_loan\", \"params\": { \"id\": \"LOAN_ID\" } }"}' --accountId ACCOUNT_ID --depositYocto 1 --gas 300000000000000

#### Increase loan deposit 
near call FT_ACCOUNT ft_transfer_call '{"receiver_id":"NEARLOANS_CORE_ACCOUNT", "amount":"1000", "msg":"{ \"operation\":\"increase_loan_deposit\", \"params\": { \"id\": \"LOAN_ID\" } }"}' --accountId ACCOUNT_ID --depositYocto 1 --gas 300000000000000
