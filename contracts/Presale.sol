pragma solidity ^0.4.18;

import "./ERC223.sol";
import "./SafeMath.sol";

contract SaturnPresale is ContractReceiver {
  using SafeMath for uint256;

  bool    public active = false;
  address public tokenAddress;
  uint256 public hardCap;
  uint256 public sold;

  struct Order {
    address owner;
    uint256 amount;
    uint256 lockup;
    bool    claimed;
  }

  mapping(uint256 => Order) private orders;
  uint256 private latestOrderId = 0;
  address private owner;
  address private treasury;

  event Activated(uint256 time);
  event Finished(uint256 time);
  event Purchase(address indexed purchaser, uint256 id, uint256 amount, uint256 purchasedAt, uint256 redeemAt);
  event Claim(address indexed purchaser, uint256 id, uint256 amount);

  function SaturnPresale(address token, address ethRecepient, uint256 presaleHardCap) public {
    tokenAddress  = token;
    owner         = msg.sender;
    treasury      = ethRecepient;
    hardCap       = presaleHardCap;
  }

  function tokenFallback(address /* _from */, uint _value, bytes /* _data */) public {
    // Accept only SATURN ERC223 token
    if (msg.sender != tokenAddress) { revert(); }
    // If the Presale is active do not accept incoming transactions
    if (active) { revert(); }
    // Only accept one transaction of the right amount
    if (_value != hardCap) { revert(); }

    active = true;
    Activated(now);
  }

  function amountOf(uint256 orderId) constant public returns (uint256 amount) {
    return orders[orderId].amount;
  }

  function lockupOf(uint256 orderId) constant public returns (uint256 timestamp) {
    return orders[orderId].lockup;
  }

  function ownerOf(uint256 orderId) constant public returns (address orderOwner) {
    return orders[orderId].owner;
  }

  function isClaimed(uint256 orderId) constant public returns (bool claimed) {
    return orders[orderId].claimed;
  }

  function () external payable {
    revert();
  }

  function shortBuy() public payable {
    // 10% bonus
    uint256 lockup = now + 12 weeks;
    uint256 priceDiv = 1818181818;
    processPurchase(priceDiv, lockup);
  }

  function mediumBuy() public payable {
    // 25% bonus
    uint256 lockup = now + 24 weeks;
    uint256 priceDiv = 1600000000;
    processPurchase(priceDiv, lockup);
  }

  function longBuy() public payable {
    // 50% bonus
    uint256 lockup = now + 52 weeks;
    uint256 priceDiv = 1333333333;
    processPurchase(priceDiv, lockup);
  }

  function processPurchase(uint256 priceDiv, uint256 lockup) private {
    if (!active) { revert(); }
    if (msg.value == 0) { revert(); }
    ++latestOrderId;

    uint256 purchasedAmount = msg.value.div(priceDiv);
    if (purchasedAmount == 0) { revert(); } // not enough ETH sent
    if (purchasedAmount > hardCap - sold) { revert(); } // too much ETH sent

    orders[latestOrderId] = Order(msg.sender, purchasedAmount, lockup, false);
    sold += purchasedAmount;

    treasury.transfer(msg.value);
    Purchase(msg.sender, latestOrderId, purchasedAmount, now, lockup);
  }

  function redeem(uint256 orderId) public {
    if (orderId > latestOrderId) { revert(); }
    Order storage order = orders[orderId];

    // only owner can withdraw
    if (msg.sender != order.owner) { revert(); }
    if (now < order.lockup) { revert(); }
    if (order.claimed) { revert(); }
    order.claimed = true;

    ERC223 token = ERC223(tokenAddress);
    token.transfer(order.owner, order.amount);

    Claim(order.owner, orderId, order.amount);
  }

  function endPresale() public {
    // only the creator of the smart contract
    // can end the crowdsale prematurely
    if (msg.sender != owner) { revert(); }
    // can only stop an active crowdsale
    if (!active) { revert(); }
    _end();
  }

  function _end() private {
    // if there are any tokens remaining - return them to the owner
    if (sold < hardCap) {
      ERC223 token = ERC223(tokenAddress);
      token.transfer(treasury, hardCap.sub(sold));
    }
    active = false;
    Finished(now);
  }
}
