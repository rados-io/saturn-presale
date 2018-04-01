var AnotherToken = artifacts.require("./AnotherToken.sol")
var Presale      = artifacts.require("./SaturnPresale.sol")
var Saturn       = artifacts.require("./Saturn.sol")

const initialBalance = web3.eth.getBalance(web3.eth.accounts[2])
const secondsInYear = 31536000

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

  it("Rejects transfers of small sums of money", async () => {
    const presale = await Presale.deployed()

    try {
      await web3.eth.sendTransaction({from: accounts[0], to: presale.address, value: 20});
      assert.fail('Rejected!')
    } catch(error) {
      assertJump(error)
    }
  })

  it("Properly assigns balances and lockups for a purchase", async () => {
    const presale = await Presale.deployed()
    let purchaseAmount = 1000000000 * 100

    var ts = Math.round((new Date()).getTime() / 1000);

    var send = await web3.eth.sendTransaction({from: accounts[0], to: presale.address, value: purchaseAmount, gas: 900000});

    let purchased = await presale.balanceOf(accounts[0])
    let lockup = await presale.lockupOf(accounts[0])
    let sold = await presale.sold()

    let updatedTreasuryBalance = web3.eth.getBalance(web3.eth.accounts[2])
    let balanceDiff = parseInt(updatedTreasuryBalance.minus(initialBalance).toString())
    assert.equal(balanceDiff, purchaseAmount)

    assert.equal(purchased.toString(), sold.toString())
    assert.equal(purchased.toString(), '100')

    let hodlDuration = parseInt(lockup.toString()) - ts
    assert.isBelow(hodlDuration - secondsInYear, 10)
  })

  it("Does not increase lockup period for subsequent investment", async () => {
    const presale = await Presale.deployed()
    let purchaseAmount = 1000000000 * 100

    let lockupBefore = await presale.lockupOf(accounts[0])

    var send = await web3.eth.sendTransaction({from: accounts[0], to: presale.address, value: purchaseAmount, gas: 900000});

    let lockupAfter = await presale.lockupOf(accounts[0])
    let sold = await presale.sold()
    let purchased = await presale.balanceOf(accounts[0])

    assert.equal(purchased.toString(), sold.toString())
    assert.equal(purchased.toString(), '200')

    assert.equal(lockupAfter.toString(), lockupBefore.toString())
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

  it("Rejects transaction if ETH amount sent is too large", async () => {
    const presale = await Presale.deployed()

    try {
      await web3.eth.sendTransaction({from: accounts[1], to: presale.address, value: web3.toWei(80, 'ether'), gas: 900000});
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

  it("Doesn't allow to redeem anything if you didn't invest", async () => {
    const presale = await Presale.deployed()

    try {
      await presale.redeem({from: accounts[3]})
      assert.fail('Rejected!')
    } catch(error) {
      assertJump(error)
    }
  })

  it("Doesn't allow to redeem before lockup is up", async () => {
    const presale = await Presale.deployed()

    try {
      await presale.redeem()
      assert.fail('Rejected!')
    } catch(error) {
      assertJump(error)
    }
  })

  it("Allows you to redeem after the lockup is over", async () => {
    const presale = await Presale.deployed()
    const saturn = await Saturn.deployed()

    let saturnBalanceBefore = await saturn.balanceOf(accounts[0])
    let presaleBalanceBefore = await presale.balanceOf(accounts[0])
    increaseSeconds(secondsInYear)

    await presale.redeem()
    let saturnBalanceAfter = await saturn.balanceOf(accounts[0])
    let presaleBalanceAfter = await presale.balanceOf(accounts[0])

    assert.equal(presaleBalanceAfter.toString(), '0')
    assert.equal(saturnBalanceAfter.toString(), saturnBalanceBefore.plus(presaleBalanceBefore).toString())
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
