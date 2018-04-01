pragma solidity ^0.4.18;

import "./ERC223.sol";

contract Saturn is ERC223Token {
  string public name = "Saturn DAO Token";
  string public symbol = "SATURN";
  uint public decimals = 4;
  uint public totalSupply = 1000000000 * 10**4;

  function Saturn() {
    balances[msg.sender] = totalSupply;
  }
}
