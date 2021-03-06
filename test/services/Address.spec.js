import { expect } from 'chai'
import { randomAddress, randomBlockHash, testCollections, Spy, fakeBlock, fakeAddress, initConfig, fakeInternalTx } from '../shared'
import { fields, addrTypes } from '../../src/lib/types'
import Address from '../../src/services/classes/Address'

const nativeTestContract = '0x0000000000000000000000000000000001aaaaaa'
const block = fakeBlock()
const options = { collections: { Addr: null }, initConfig, block }
const contractAddress = randomAddress()
const fakeCode = '0x0102'
const nod3 = {
  eth: {
    async getCode (address) {
      return (address === contractAddress) ? fakeCode : null
    },
    async getBalance (address) {
      return '0x01'
    }
  }
}

describe(`# Address`, function () {
  describe(`address type`, function () {
    this.timeout(9000)
    const address = new Address(randomAddress(), options)

    it('address type should be account', () => {
      expect(address.getData().type).to.be.equal(addrTypes.ADDRESS)
    })

    it('address type should be account', () => {
      address.setData({ code: '0x0000' })
      expect(address.getData().type).to.be.equal(addrTypes.ADDRESS)
    })

    it('adress type should be contract', () => {
      address.setData({ code: '0xa' })
      expect(address.getData().type).to.be.equal(addrTypes.CONTRACT)
    })

    it('address suicide should set type to address', () => {
      let data = fakeInternalTx()
      address.suicide(data)
      expect(address.getData()[fields.DESTROYED_BY]).to.be.deep.equal(data)
      expect(address.getData().type).to.be.equal(addrTypes.ADDRESS)
    })

    it('suicided addresses should not reborn', () => {
      address.setData({ code: '0xffaabbcc' })
      expect(address.getData().type).to.be.equal(addrTypes.ADDRESS)
    })

    it('suicide data should not be changed', () => {
      let data = address.getData()
      expect(data[fields.DESTROYED_BY]).to.be.an('object')
      address.suicide(fakeInternalTx())
      expect(address.getData().type).to.be.equal(addrTypes.ADDRESS)
      expect(address.getData()[fields.DESTROYED_BY]).to.be.deep.equal(data[fields.DESTROYED_BY])
    })

  })

  describe(`lastBlock`, function () {
    this.timeout(9000)
    const a = randomAddress()
    const address = new Address(a, options)
    let data = address.getData()

    it(`lastBlock should be undefined`, () => {
      expect(data[fields.LAST_BLOCK_MINED]).to.be.equal(undefined)
    })

    const block = {
      number: 12,
      hash: randomBlockHash(),
      miner: a,
      transactions: []
    }
    it(`${fields.LAST_BLOCK_MINED} should be equal to block`, () => {
      address.setBlock(block)
      const data = address.getData()
      expect(data[fields.LAST_BLOCK_MINED]).to.be.deep.equal(block)
    })

    it(`${fields.LAST_BLOCK_MINED} should be block`, () => {
      address.setBlock({ number: 2, hash: randomBlockHash(), miner: a, transactions: [] })
      const data = address.getData()
      expect(data[fields.LAST_BLOCK_MINED]).to.be.deep.equal(block)
    })

    it(`${fields.LAST_BLOCK_MINED} should be block`, () => {
      address.setBlock({ number: 200, hash: randomBlockHash(), miner: randomAddress(), transactions: [] })
      const data = address.getData()
      expect(data[fields.LAST_BLOCK_MINED]).to.be.deep.equal(block)
    })

    it(`${fields.LAST_BLOCK_MINED} should be block`, () => {
      const test = { number: 200, hash: randomBlockHash(), miner: a, transactions: [] }
      address.setBlock(test)
      const data = address.getData()
      expect(data[fields.LAST_BLOCK_MINED]).to.be.deep.equal(test)
    })
  })

  describe(`searchDeploymentData()`, function () {
    this.timeout(9000)
    let method = 'searchDeploymentData'
    let cases = [
      [undefined, 1],
      [{ input: fakeCode, receipt: { contractAddress } }, 0],
      [{ type: 'create', action: { init: fakeCode }, result: { address: contractAddress } }, 0]
    ]

    for (let [tx, calls] of cases) {
      it(`${method} should be called ${calls} times`, async () => {
        let block = fakeBlock()
        let address = new Address(contractAddress, { tx, initConfig, collections: options.collections, nod3, block })
        let { spy, remove } = Spy(address, method)
        await address.fetch().catch(() => { })
        let { type } = address.getData()
        expect(type).to.be.equal(addrTypes.CONTRACT)
        expect(spy.args.length).to.be.equal(calls)
        remove()
      })
    }
  })
})

describe(`# Address, requires db connection`, function () {
  this.timeout(20000)
  const a = randomAddress()
  let blockA = {
    number: 3,
    hash: randomBlockHash(),
    miner: randomAddress(),
    transactions: []
  }
  let block = {
    number: 10,
    hash: randomBlockHash(),
    miner: a,
    transactions: []
  }

  const options2 = { nod3, initConfig, block: blockA }
  const lastBlockMined = fields.LAST_BLOCK_MINED

  it(`should set ${lastBlockMined} and save the address`, async () => {
    options2.collections = await testCollections(true)
    const address = new Address(a, options2)
    address.setBlock(block)
    expect(address.getData()[lastBlockMined].number).to.be.equal(block.number)
    await address.save()
  })

  it(`${lastBlockMined} should be the highest block mined`, async () => {
    options2.collections = await testCollections()
    const address = new Address(a, options2)
    await address.fetch()
    expect(address.getData()[lastBlockMined].number).to.be.equal(block.number)
    block.number = 14
    address.setBlock(block)
    await address.fetch()
    expect(address.getData()[lastBlockMined].number).to.be.equal(14)
    await address.save()
  })

  it(`${lastBlockMined} should not be replaced by a lower block`, async () => {
    options2.collections = await testCollections()
    const address = new Address(a, options2)
    await address.fetch()
    expect(address.getData()[lastBlockMined].number).to.be.equal(block.number)
    block.number = 10
    address.setBlock(block)
    await address.fetch()
    const data = address.getData()
    expect(address.blockNumber, 'block number').to.be.equal(block.number)
    expect(data[lastBlockMined].number).to.be.equal(14)
  })

  it(`${lastBlockMined} should be replaced by a higher block`, async () => {
    options2.collections = await testCollections()
    const address = new Address(a, options2)
    block.number = 300
    address.setBlock(block)
    await address.fetch()
    const data = address.getData()
    expect(address.blockNumber).to.be.equal(block.number)
    expect(data[lastBlockMined].number).to.be.equal(block.number)
  })

  it(`should return a native contract address document`, async () => {
    const collections = await testCollections()
    const block = fakeBlock()
    const address = new Address(nativeTestContract, { block, collections, nod3, initConfig: { nativeContracts: { nativeTestContract } } })
    await address.fetch()
    const data = address.getData()
    expect(data).haveOwnProperty('isNative').equal(true)
    expect(data.type).to.be.equal(addrTypes.CONTRACT)
    expect(data.name).to.be.equal('nativeTestContract')
  })
  describe('Update balance', function () {
    const block = fakeBlock()
    const address = fakeAddress()
    let balance = 0
    const nod3balances = { eth: Object.assign({}, nod3.eth) }
    nod3balances.eth.getBalance = address => {
      balance = ++balance
      return Number(balance).toString(16)
    }

    it('Low block should be skipped', async () => {
      const collections = await testCollections(true)
      block.number = 2
      let Addr = new Address(address.address, { block, nod3: nod3balances, collections, initConfig: {} })
      await Addr.save()
      block.number = 1
      Addr = new Address(address.address, { block, nod3: nod3balances, collections, initConfig: {} })
      let data = await Addr.fetch()
      expect(Number(data.balance)).to.be.equal(1)
    })

    it('High block should update the balance', async () => {
      const collections = await testCollections()
      let Addr = new Address(address.address, { block, nod3: nod3balances, collections, initConfig: {} })
      let data = await Addr.fetch()
      await Addr.save()
      expect(Number(data.balance)).to.be.equal(1)
      block.number = 3
      Addr = new Address(address.address, { block, nod3: nod3balances, collections, initConfig: {} })
      data = await Addr.fetch()
      await Addr.save()
      expect(Number(data.balance)).to.be.equal(2)
      let stored = await collections.Addrs.findOne({ address: address.address })
      expect(stored.balance).to.be.equal('2')
    })

    it('Same block should update the balance', async () => {
      const collections = await testCollections()
      let Addr = new Address(address.address, { block, nod3: nod3balances, collections, initConfig: {} })
      let data = await Addr.fetch()
      await Addr.save()
      expect(Number(data.balance)).to.be.equal(3)
      let stored = await collections.Addrs.findOne({ address: address.address })
      expect(stored.balance).to.be.equal('3')
    })
  })
})
