"use strict";Object.defineProperty(exports, "__esModule", { value: true });exports.default = void 0;var _express = _interopRequireDefault(require("express"));function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}
const router = _express.default.Router();

const Routes = ({ log, api }) => {
  router.use('/', (req, res, next) => {
    try {
      const params = req.query;
      if (Object.keys(params).length === 0) {
        res.send(api.info());
      } else {
        const { module, action } = req.query;
        if (!module) throw new Error(`invalid module: ${module}`);
        if (!action) throw new Error(`invalid action: ${action}`);
        next();
      }
    } catch (err) {
      log.debug(err);
      res.status(400).send();
    }
  });

  router.get('/', async (req, res, next) => {
    try {
      const params = req.query;
      const { module, action } = req.query;
      delete params.module;
      delete params.action;
      const { result } = await api.run({ module, action, params });
      if (!result) throw new Error('Missing result');
      if (!result.data) throw new Error('Missing data');
      res.send(result);
    } catch (err) {
      res.status(404).send();
      log.error(err);
    }
  });
  return router;
};var _default =

Routes;exports.default = _default;