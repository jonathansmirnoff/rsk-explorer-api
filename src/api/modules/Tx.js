import { DataCollectorItem } from '../lib/DataCollector'
import { isBlockHash } from '../../lib/utils'

export class Tx extends DataCollectorItem {
  constructor (collection, key, parent) {
    // const sortable = { timestamp: -1 }
    super(collection, key, parent)
    const PendingTxs = this.parent.getItem({ key: 'TxPending' })
    this.PendingTxs = PendingTxs.publicActions
    this.publicActions = {
      /**
       * @swagger
       * /api?module=transactions&action=getTransactions:
       *    get:
       *      description: get transactions
       *      tags:
       *        - transactions
       *      produces:
       *        - application/json
       *      parameters:
       *        - name: module
       *          in: query
       *          required: true
       *          enum: [transactions]
       *        - name: action
       *          in: query
       *          required: true
       *          enum: [getTransactions]
       *        - name: query
       *          in: query
       *          required: false
       *          schema:
       *            type: object
       *            example:
       *              txType:normal
       *        - $ref: '#/parameters/limit'
       *        - $ref: '#/parameters/next'
       *        - $ref: '#/parameters/prev'
       *      responses:
       *        200:
       *          $ref: '#/definitions/ResponseList'
       *        400:
       *          $ref: '#/responses/BadRequest'
       *        404:
       *          $ref: '#/responses/NotFound'
      */
      getTransactions: params => {
        let query = {}
        let txType = (params.query) ? params.query.txType : null
        console.log('txTYPE', txType)
        if (txType) {
          query = this.fieldFilterParse('txType', txType)
        }
        return this.getPageData(query, params)
      },
      /**
     * @swagger
     * /api?module=transactions&action=getTransaction:
     *    get:
     *      description: get transaction
     *      tags:
     *        - transactions
     *      parameters:
     *        - name: module
     *          in: query
     *          required: true
     *          enum: [transactions]
     *        - name: action
     *          in: query
     *          required: true
     *          enum: [getTransaction]
     *        - $ref: '#/parameters/txHash'
     *      responses:
     *        200:
     *          $ref: '#/definitions/Response'
     *        400:
     *          $ref: '#/responses/BadRequest'
     *        404:
     *          $ref: '#/responses/NotFound'
   */

      getTransaction: async params => {
        const hash = params.hash
        if (hash) {
          let tx
          tx = await this.getPrevNext({ hash }, { hash: 1 })
          if (!tx || !tx.data) tx = await this.PendingTxs.getPendingTransaction(params)
          return tx
        }
      },

      /**
      * @swagger
      * /api?module=transactions&action=getTransactionWithAddressData:
      *    get:
      *      description: get transaction
      *      tags:
      *        - transactions
      *      parameters:
      *        - name: module
      *          in: query
      *          required: true
      *          enum: [transactions]
      *        - name: action
      *          in: query
      *          required: true
      *          enum: [getTransactionWithAddressData]
      *        - name: hash
      *          in: query
      *          required: true
      *          schema:
      *            type: string
      *      responses:
      *        200:
      *          $ref: '#/definitions/Response'
      *        400:
      *          $ref: '#/responses/BadRequest'
      *        404:
      *          $ref: '#/responses/NotFound'
    */
      getTransactionWithAddressData: async params => {
        let data = await this.publicActions.getTransaction(params)
        let tx = (data) ? data.data : null
        if (tx) {
          let logs = (tx.receipt) ? tx.receipt.logs : []
          let addresses = new Set(logs.map(log => log.address))
          addresses.add(tx.from)
          addresses.add(tx.to)
          let Address = this.parent.Address
          let res = await Promise.all([...addresses.values()].map(address => Address.run('getAddress', { address })))
          if (res) {
            res = res.reduce((v, a, i) => {
              let d = a.data
              if (d && d.address) v[d.address] = d
              return v
            }, {})

            tx._addresses = res
          }
          return data
        }
      },

      /**
      * @swagger
      * /api?module=transactions&action=getTransactionsByBlock:
      *    get:
      *      description: get transaction
      *      tags:
      *        - transactions
      *      parameters:
      *        - name: module
      *          in: query
      *          required: true
      *          enum: [transactions]
      *        - name: action
      *          in: query
      *          required: true
      *          enum: [getTransactionsByBlock]
      *        - $ref: '#/parameters/hashOrNumber'
      *        - $ref: '#/parameters/limit'
      *        - $ref: '#/parameters/next'
      *        - $ref: '#/parameters/prev'
      *      responses:
      *        200:
      *          $ref: '#/definitions/ResponseList'
      *        400:
      *          $ref: '#/responses/BadRequest'
      *        404:
      *          $ref: '#/responses/NotFound'
      */
      getTransactionsByBlock: params => {
        const hashOrNumber = params.hashOrNumber || params.number

        if (isBlockHash(hashOrNumber)) {
          params.blockHash = hashOrNumber
          return this.getTransactionsByBlockHash(params)
        } else {
          params.blockNumber = parseInt(hashOrNumber)
          return this.getTransactionsByBlockNumber(params)
        }
      },
      /**
      * @swagger
      * /api?module=transactions&action=getTransactionsByAddress:
      *    get:
      *      description: get transactions by address
      *      tags:
      *        - transactions
      *      parameters:
      *        - name: module
      *          in: query
      *          required: true
      *          enum: [transactions]
      *        - name: action
      *          in: query
      *          required: true
      *          enum: [getTransactionsByAddress]
      *        - $ref: '#/parameters/address'
      *      responses:
      *        200:
      *          $ref: '#/definitions/ResponseList'
      *        400:
      *          $ref: '#/responses/BadRequest'
      *        404:
      *          $ref: '#/responses/NotFound'
    */
      getTransactionsByAddress: params => {
        let address = params.address
        return this.getPageData(
          {
            $or: [{ from: address }, { to: address }]
          },
          params
        )
      }
    }
  }

  getTransactionsByBlockNumber (params) {
    const blockNumber = parseInt(params.blockNumber || params.number)
    if (undefined !== blockNumber) {
      return this.getPageData({ blockNumber }, params)
    }
  }

  getTransactionsByBlockHash (params) {
    const blockHash = params.blockHash
    if (blockHash) {
      return this.getPageData({ blockHash }, params)
    }
  }
}

export default Tx
