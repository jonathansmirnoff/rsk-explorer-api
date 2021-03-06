import { EventEmitter } from 'events'
import { clearInterval } from 'timers'
import { serialize } from '../../../lib/utils'
import { filterParams } from '../apiTools'
import { Db } from 'mongodb'
import log from '../log'

class Emitter extends EventEmitter { }
const emitter = new Emitter()

export class DataCollector {
  constructor (db, options) {
    if (!(db instanceof Db)) { throw new Error('Db is not mongodb Db') }
    this.db = db
    this.options = options
    this.collection = null
    this._keyName = options.keyName || '_id'
    this.events = emitter
    this._interval = null
    this.modules = {}
    this.setCollection(options.collectionName)
    this.tickDelay = 1000
    this.serialize = serialize
    this.log = options.log || log
  }
  tick () { }
  stop () {
    if (this._interval) {
      this._interval = clearInterval(this._interval)
    }
  }

  start () {
    if (!this._interval) {
      this._interval = setInterval(() => {
        this.tick()
      }, this.tickDelay)
    }
  }

  setCollection (collectionName, name = 'collection') {
    if (collectionName && !this[name]) {
      this[name] = this.db.collection(collectionName)
    }
  }

  run () { }

  addModule (module, name) {
    try {
      name = name || module.getName()
      if (!name) throw new Error(`Invalid module name ${name}`)
      if (this.modules[name]) throw new Error(`The module: ${name} already exists`)
      module.serialize = this.serialize
      module.parent = this
      this.modules[name] = module
    } catch (err) {
      this.log.warn(err)
      throw err
    }
  }

  getModule (name) {
    const module = this.modules[name]
    // if (!module) throw new Error(`Unknown module ${name}`)
    return module
  }

  filterParams (params) {
    return filterParams(params)
  }

  formatData (data) {
    return { data }
  }
}

export default DataCollector
