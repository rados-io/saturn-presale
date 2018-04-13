## Saturn Strategic presale smart contract

A thoroughly tested smart contract used to conduct discounted presales with a lockup period.

Having a time lockup ensures two things:

1. Investors will not participate in a presale with the sole purpose of dumping their tokens on the market, exploiting the early bonus advantage.
2. Investors that do participate have an aligned vision and are comfortable supporting the project long term.

### Events
```
// called when presale is activated
event Activated(uint256 time);
// called when presale is stopped
event Finished(uint256 time);
// called when somebody makes a purchase. can use to show purchase history
event Purchase(address indexed purchaser, uint256 id, uint256 amount, uint256 purchasedAt, uint256 redeemAt);
// called when somebody withdraws their SATURN
event Claim(address indexed purchaser, uint256 id, uint256 amount);
```

### Useful methods

```
presale = contract(abi); // load the contract interface in web3.js

// buy tokens
presale.buyShort({value: purchase_amount_in_wei})
// presale.buyMedium({value: purchase_amount_in_wei})
// presale.buyLong({value: purchase_amount_in_wei})
// emits purchase event, updates lockup and balance
// this event reports the purchaseId

presale.lockupOf(id) // check when they can withdraw. returns a UNIX timestamp
presale.amountOf(id) // check how much SATURN in a purchase
presale.redeem(id) // When lockup period ends, calling this function will withdraw tokens to your wallet
```
