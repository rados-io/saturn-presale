var AnotherToken = artifacts.require("./AnotherToken.sol")
var Presale      = artifacts.require("./SaturnPresale.sol")
var Saturn       = artifacts.require("./Saturn.sol")

const initialTreasuryBalance = web3.eth.getBalance(web3.eth.accounts[2])
const weeks = 60 * 60 * 24 * 7

// helper functions
function assertJump(error) {
  let revertOrInvalid = error.message.search('invalid opcode|revert')
  assert.isAbove(revertOrInvalid, -1, 'Invalid opcode error must be returned')
}

function increaseSeconds(duration) {
  const id = Date.now()

  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      params: [duration],
      id: id,
    }, err1 => {
      if (err1) return reject(err1)

      web3.currentProvider.sendAsync({
        jsonrpc: '2.0',
        method: 'evm_mine',
        id: id+1,
      }, (err2, res) => {
        return err2 ? reject(err2) : resolve(res)
      })
    })
  })
}

contract('Presale', function(accounts) {
  it("Knows what token it is selling", async () => {
    const presale = await Presale.deployed()
    const saturn = await Saturn.deployed()

    let tkn = await presale.tokenAddress()
    assert.equal(tkn, saturn.address)
  })

  it("Rejects transfer of wrong amount of SATURN tokens", async () => {
    const presale = await Presale.deployed()
    const saturn = await Saturn.deployed()

    try {
      await saturn.transfer(presale.address, 1)
      assert.fail('Rejected!')
    } catch(error) {
      assertJump(error)
    }
  })

  it("Doesn't allow to end presale before it started", async () => {
    const presale = await Presale.deployed()

    let active = await presale.active()
    assert.equal(active, false)

    try {
      await presale.endPresale()
      assert.fail('Rejected!')
    } catch(error) {
      assertJump(error)
    }
  })

  it("Rejects purchases in an inactive crowdsale", async () => {
    const presale = await Presale.deployed()

    try {
      await web3.eth.sendTransaction({from: accounts[0], to: presale.address, value: web3.toWei(25, "ether")});
      assert.fail('Rejected!')
    } catch(error) {
      assertJump(error)
    }
  })

  // presale activated

  it("Activates presale if the right amount of SATURN tokens is received", async () => {
    const presale = await Presale.deployed()
    const saturn = await Saturn.deployed()

    let hardCap = await presale.hardCap()

    let activeBefore = await presale.active()
    assert.equal(activeBefore, false)

    await saturn.transfer(presale.address, hardCap)

    let activeAfter = await presale.active()
    assert.equal(activeAfter, true)
  })

  it("Doesn't allow strangers to end presale", async () => {
    const presale = await Presale.deployed()

    try {
      await presale.endPresale({from: accounts[1]})
      assert.fail('Rejected!')
    } catch(error) {
      assertJump(error)
    }
  })

  it("Rejects token transfers to an active presale", async () => {
    const presale = await Presale.deployed()
    const saturn = await Saturn.deployed()

    let hardCap = await presale.hardCap()

    try {
      await saturn.transfer(presale.address, hardCap)
      assert.fail('Rejected!')
    } catch(error) {
      assertJump(error)
    }
  })

  it("Rejects transfers of other ERC223 tokens", async () => {
    const presale = await Presale.deployed()
    const ant = await AnotherToken.deployed()

    try {
      await ant.transfer(presale.address, 50000)
      assert.fail('Rejected!')
    } catch(error) {
      assertJump(error)
    }
  })

  it("Rejects money transfers outside of smart contract functionality", async () => {
    const presale = await Presale.deployed()

    try {
      await web3.eth.sendTransaction({from: accounts[0], to: presale.address, value: 20});
      assert.fail('Rejected!')
    } catch(error) {
      assertJump(error)
    }
  })

  it("Processes short purchase", async () => {
    const presale = await Presale.deployed()
    const saturn = await Saturn.deployed()

    var ts = Math.round((new Date()).getTime() / 1000)
    var send = await presale.shortBuy({value: web3.toWei(1, 'ether')})
    var purchase = send.logs[0].args

    assert.equal(purchase.purchaser, accounts[0])
    assert.equal(purchase.amount.toString(), '550000000')
    assert.equal(purchase.redeemAt.minus(purchase.purchasedAt).toString(), 12 * weeks)

    var amount  = await presale.amountOf(purchase.id)
    var lockup  = await presale.lockupOf(purchase.id)
    var owner   = await presale.ownerOf(purchase.id)
    var claimed = await presale.isClaimed(purchase.id)

    assert.equal(amount.toString(), purchase.amount.toString())
    assert.equal(lockup.toString(), purchase.redeemAt.toString())
    assert.equal(owner, web3.eth.coinbase)
    assert.equal(claimed, false)

    //cannot redeem before the deadline
    try {
      await presale.redeem(purchase.id)
      assert.fail('Rejected!')
    } catch(error) {
      assertJump(error)
    }

    increaseSeconds(12 * weeks + 100)

    let sold = await presale.sold()
    let tokenBalanceBefore = await saturn.balanceOf(presale.address)
    await presale.redeem(purchase.id)
    let tokenBalanceAfter = await saturn.balanceOf(presale.address)

    assert.equal(tokenBalanceBefore.minus(sold).toString(), tokenBalanceAfter.toString())

    let updatedTreasuryBalance = web3.eth.getBalance(web3.eth.accounts[2])
    let balanceDiff = parseInt(updatedTreasuryBalance.minus(initialTreasuryBalance).toString())
    assert.equal(balanceDiff, web3.toWei(1, 'ether'))
    assert.equal(sold.toString(), purchase.amount.toString())

    claimed = await presale.isClaimed(purchase.id)
    assert.equal(claimed, true)

    //cannot redeem again
    try {
      await presale.redeem(purchase.id)
      assert.fail('Rejected!')
    } catch(error) {
      assertJump(error)
    }
  })

  it("Processes medium purchase", async () => {
    const presale = await Presale.deployed()
    const saturn = await Saturn.deployed()

    var ts = Math.round((new Date()).getTime() / 1000)
    var send = await presale.mediumBuy({value: web3.toWei(1, 'ether')})
    var purchase = send.logs[0].args

    assert.equal(purchase.purchaser, accounts[0])
    assert.equal(purchase.amount.toString(), '625000000')
    assert.equal(purchase.redeemAt.minus(purchase.purchasedAt).toString(), 24 * weeks)
  })

  it("Processes long purchase", async () => {
    const presale = await Presale.deployed()
    const saturn = await Saturn.deployed()

    var ts = Math.round((new Date()).getTime() / 1000)
    var send = await presale.longBuy({value: web3.toWei(1, 'ether')})
    var purchase = send.logs[0].args

    assert.equal(purchase.purchaser, accounts[0])
    assert.equal(purchase.amount.toString(), '750000000')
    assert.equal(purchase.redeemAt.minus(purchase.purchasedAt).toString(), 52 * weeks)
  })

  it("Rejects transaction if ETH amount sent is too small", async () => {
    const presale = await Presale.deployed()

    try {
      await web3.eth.sendTransaction({from: accounts[0], to: presale.address, value: 10000, gas: 900000});
      assert.fail('Rejected!')
    } catch(error) {
      assertJump(error)
    }
  })

  it("Doesn't allow to redeem unrealistic purchase ids", async () => {
    const presale = await Presale.deployed()

    try {
      await presale.redeem(99999999)
      assert.fail('Rejected!')
    } catch(error) {
      assertJump(error)
    }
  })

  it("Doesn't allow random people to end presale", async () => {
    const presale = await Presale.deployed()

    let active = await presale.active()
    assert.equal(active, true)

    try {
      await presale.endPresale({from: accounts[1]})
      assert.fail('Rejected!')
    } catch(error) {
      assertJump(error)
    }
  })

  it("Allows the owner to end presale", async () => {
    const presale = await Presale.deployed()

    let activeBefore = await presale.active()
    assert.equal(activeBefore, true)

    await presale.endPresale()

    let activeAfter = await presale.active()
    assert.equal(activeAfter, false)
  })

})
