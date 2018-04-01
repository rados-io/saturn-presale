## Saturn Strategic presale smart contract

A thoroughly tested smart contract used to conduct discounted presales with a lockup period.

Having a time lockup ensures two things:

1. Investors will not participate in a presale with the sole purpose of dumping their tokens on the market, exploiting the early bonus advantage.
2. Investors that do participate have an aligned vision and are comfortable supporting the project long term.

### Test coverage report

![test-coverage](https://forum.rados.io/uploads/default/original/1X/a1d8c4f7728c0f15c07812bdce5296ef6df1fded.png)

### Events
```
// called when presale is activated
event Activated(uint256 time);
// called when presale is stopped
event Finished(uint256 time);
// called when somebody makes a purchase. can use to show purchase history
event Purchase(address indexed purchaser, uint256 amount, uint256 purchasedAt, uint256 redeemAt);
```

### Useful methods

```
presale = contract(abi); // load the contract interface in web3.js

// buy tokens
presale.buyTokens({value: purchase_amount_in_wei})
// emits purchase event, updates lockup and balance

presale.balanceOf(address) // check how much a person bought
presale.lockupOf(address) // check when they can withdraw. returns a UNIX timestamp

presale.redeem() // When lockup period ends, calling this function will transfer
```
