pragma solidity ^0.4.18;

import "./ERC223.sol";
import "./SafeMath.sol";

contract SaturnPresale is ContractReceiver {
  using SafeMath for uint256;

  bool public active = false;
  mapping(address=>uint256) private purchased;
  mapping(address=>uint256) private lockup;

  address public tokenAddress;

  uint256 private priceDiv;
  uint256 private purchaseLimit;
  uint256 public hardCap;
  uint256 public sold;

  address private owner;
  address private treasury;

  event Activated(uint256 time);
  event Finished(uint256 time);
  event Purchase(address indexed purchaser, uint256 amount, uint256 purchasedAt, uint256 redeemAt);

  function SaturnPresale(address token, address ethRecepient, uint256 minPurchase, uint256 presaleHardCap, uint256 price) public {
    tokenAddress  = token;
    priceDiv      = price;
    owner         = msg.sender;
    purchaseLimit = minPurchase;
    treasury      = ethRecepient;
    hardCap       = presaleHardCap;
  }

  function tokenFallback(address /* _from */, uint _value, bytes /* _data */) public {
    // Accept only SATURN ERC223 token
    if (msg.sender != tokenAddress) { revert(); }
    // If the Presale is active do not accept incoming transactions
    if (active) { revert(); }
    // Only accept one transaction in the amount of
    if (_value != hardCap) { revert(); }

    active = true;
    Activated(now);
  }

  function balanceOf(address person) constant public returns (uint balance) {
    return purchased[person];
  }

  function lockupOf(address person) constant public returns (uint timestamp) {
    return lockup[person];
  }

  function () external payable {
    buyTokens();
  }

  function buyTokens() payable public {
    if (!active) { revert(); }
    if (msg.value < purchaseLimit) { revert(); }

    uint256 purchasedAmount = msg.value.div(priceDiv);
    if (purchasedAmount == 0) { revert(); }
    if (purchasedAmount > hardCap - sold) { revert(); }

    if (lockup[msg.sender] == 0) {
      lockup[msg.sender] = now + 1 years;
    }
    purchased[msg.sender] = purchased[msg.sender] + purchasedAmount;
    sold = sold + purchasedAmount;
    treasury.transfer(msg.value);
    Purchase(msg.sender, purchasedAmount, now, lockup[msg.sender]);
  }

  function endPresale() public {
    // only the creator of the smart contract
    // can end the crowdsale prematurely
    if (msg.sender != owner) { revert(); }
    // can only stop an active crowdsale
    if (!active) { revert(); }
    _end();
  }

  function redeem() public {
    if (purchased[msg.sender] == 0) { revert(); }
    if (now < lockup[msg.sender]) { revert(); }

    uint256 withdrawal = purchased[msg.sender];
    purchased[msg.sender] = 0;

    ERC223 token = ERC223(tokenAddress);
    token.transfer(msg.sender, withdrawal);
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
