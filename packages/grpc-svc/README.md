# TODO

## Accounts and Balances High level requests

### Check Payer Liquidity and Reserve - for transfer prepare step

Request to reserve payer funds, sent by the transfers BC during the prepare step.
This request should do in one (all or nothing) step:
- 1.1 - Assert that: payer.pos.post.dr + payer.pos.pend.dr - payer.pos.post.cr + trx.amount <= (payer.liq.post.cr - payer.liq.post.dr) - NDC
- 1.2 - Increase the pending debit balance of the payer's position account by the transfer amount (has the effect of reducing its position)
- 1.3 - Increase the pending credit balance of the Hub Joke account by the transfer amount (this hub account can be seen as the tally of the in flight) 

Inputs
- payer position account id - string
- payer liquidity account id - string
- Hub Joke account id - string 
- amount - string 
- currency code - string
- payer net debit cap - string

Output
- success - boolean

### Cancel Reservation and Commit - for transfer fulfil step

Request to revert the initial reservation, commit payer funds and credit the payee, send by the transfers BC during the prepare step.

This request should in two (all or nothing) step:
- 1.1 - Decrease the pending debit balance of the payer's position account by the transfer amount
- 1.2 - Decrease the pending credit balance of the Hub Joke account by the transfer amount
- 2.1 - Increase the posted debit balance of the payer's position account by the transfer amount
- 2.2 - Increase the posted credit balance of the payee's position account by the transfer amount

Inputs:
- payer position account id - string
- payee position account id - string
- Hub Joke account id - string
- amount - string
- currency code - string

Output
- success - boolean

## Accounts and Balances Low level requests

### Create accounts (array)
(to be documented)

### Create journal entries (array)
(to be documented)

### Get accounts by ids (array)
(to be documented)

### Get accounts by owner id (array)
(to be documented)

### Get entries by account id
(to be documented)