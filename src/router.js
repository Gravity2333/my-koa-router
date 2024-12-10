const Layer = require("./layer");
const compose = require("./compose");

const METHODS_LIST = ["GET", "POST", "PUT", "DELETE"];
/**
 * Router对象
 */
class Router {
  constructor(opts={}) {
    /** 设置支持的Methods */
    this.methods = METHODS_LIST;
    /** 设置opts */
    this.opts = opts;
    /** 设置params 保存param处理中间件 */
    this.params = {};
    /** 设置stack 保存layer */
    this.stack = [];
  }

  /** 注册中间件方法 */
  use(...middlewares) {
    /** use的重载包含
     *  1. 单独path,middleware1,middleware2 ...
     *  2. path数组,middleware1,middleware2 ...
     *  3. middleware1,middleware2,middleware3 这种就是匹配任意路径的
     */

    /** 检测是不是path数组 */
    if (
      Array.isArray(middlewares[0]) &&
      typeof middlewares[0][0] === "string"
    ) {
      // 如果是 则递归调用use方法，把数组类型的path转换成多个单一path的use注册
      return middlewares[0].forEach((_path) => {
        this.use(_path, middlewares.slice(1));
      });
    }

    let path = "";
    /** 不是path数组的情况,检查是不是单一path的情况 */
    if (typeof middlewares[0] === "string") {
      path = middlewares[0];
      // 截取middlewares
      middlewares = middlewares.slice(1);
    }

    /** 执行到这个位置，对参数统一完成 即
     * path为对应的路径，可以为空
     * middlewares为中间件数组
     */

    /** 遍历middleware数组，查看是否存在嵌套路由
     *  Router.prototype.routes在组合路由的时候，会在组合后的中间件上添加一个router对象，指向当前的Router对象
     *  所以这里借用middleware.router来判断是不是嵌套的路由
     */
    for (const m of middlewares) {
      if (m.router) {
        /** 嵌套的情况 */
        /** 如果是嵌套的情况，需要将嵌套router的stack，结合use的前缀 以及router的前缀 加入到当前的router对象的stack
         *  这里需要注意，不能直接操作m.router对象，因为可能会影响到其他嵌套m.router的路由，需要clone一份
         */
        const clonedRouter = Object.assign(
          Object.create(Router.prototype),
          m.router,
          {
            /** 注意，这里stack中的layer对象，也需要clone，在下面处理 */
            stack: [...m.router.stack],
          }
        );

        /** 处理clonedRouter中的layer对象 */
        clonedRouter.stack.forEach((layer, index) => {
          /** 创建cloneLayer */
          const clonedLayer = Object.assign(
            Object.create(Layer.prototype),
            layer
          );
          /** 把创建好的layer 设置use和router对象的prefix，并且加入stack */
          clonedLayer.setPrefix(path);
          if (this.opts.prefix) {
            // 设置router对象的prefix
            clonedLayer.setPrefix(this.opts.prefix);
          }

          /** 把param处理函数注册进clonedLayer */
          Object.keys(this.params).forEach((paramName) => {
            clonedLayer.param(paramName, this.params[paramName]);
          });

          // 加入当前router对象的stack
          this.stack.push(clonedLayer);
          // 把克隆的layer对象存到clonedRouter
          clonedRouter.stack[index] = clonedLayer;
        });
      } else {
        /** 非嵌套 */
        /** 调register函数 完成layer对象的创建，由于use是不限制方法的，所以methods为空数组 */
        this.register(path || "*", [], [m]);
      }
    }
    /** 返回this 以实现链调用 */
    return this;
  }

  /** 创建layer对象 注册函数 */
  register(path, methods, middlewares) {
    /** 创建layer对象 */
    const layer = new Layer(path, methods, middlewares);
    /** 设置prefix */
    if (this.opts.prefix) {
      layer.setPrefix(this.opts.prefix);
    }
    /** 把param处理函数注册进layer */
    Object.keys(this.params).forEach((paramName) => {
      layer.param(paramName, this.params[paramName]);
    });
    /** 加入stack */
    this.stack.push(layer);
    return this;
  }

  /** 匹配layer
   *  返回一个matched对象，包含
   *  {
   *    path: [] 路径匹配上的layer对象
   *    pathAndMethod: [] 路径和方法都匹配上的layer对象
   *    route: [] isRouter即，路径和方法是否都匹配上，如果path或method 有一个没匹配上，都算匹配失败
   *  }
   */
  match(path, method) {
    /** 创建一个macthed对象 */
    const matched = {
      path: [],
      pathAndMethod: [],
      route: false,
    };

    /** 遍历stack，使用regexp匹配路径 */
    this.stack.forEach((layer) => {
      if (layer.regexp.test(path)) {
        // 路径匹配上了，加入matched.path
        matched.path.push(layer);
        /** 检查方法是否匹配上，注意，对于无方法的use，直接加入pathAndMethod 但是只有匹配到一个具体的method，才会把route=true
         * 对于route=false的matched对象，其pathAndMethod中的layer不会最终被compose执行
         */
        if (layer.methods?.length === 0 || layer.methods?.includes(method)) {
          matched.pathAndMethod.push(layer);
          if (layer.methods?.length > 0) {
            /** 匹配到了具体的方法，算匹配上 */
            matched.route = true;
          }
        }
      }
    });

    /** 返回matched对象 */
    return matched;
  }

  /** 生成composed中间件函数 */
  routes() {
    /** routes调用middleware来组合中间件 */
    return this.middleware();
  }

  /** 组合中间件函数
   *  其功能为，返回一个中间件函数，在其中根据path，组合匹配到的中间件
   */
  middleware() {
    // 由于不知道dispatch函数的调用方式，所以这里使用router保存this
    const router = this;
    const dispatch = (ctx, next) => {
      const path = ctx.path;
      const method = ctx.method.toLocaleLowerCase();
      const matched = router.match(path, method);

      // 判断一下，如果matched.route 为false 则代表最终没有匹配上，后面不会再生成layer链,直接next
      if (matched.route === false) {
        return next();
      }

      // 生成layer中stack的调用链
      const layerMiddlewareChain = matched.pathAndMethod.reduce(
        (memo, currentLayer) => {
          // 在每个layer被加入到layerChain之前，生成一个预处理中间件，把一些比如params的处理信息，挂到ctx
          function _preHandleMiddleware(ctx, next) {
            // 调用params 获取路径匹配到的params
            ctx.params = currentLayer.params(ctx.path, ctx.params || {});

            return next();
          }

          return [...memo, _preHandleMiddleware, ...currentLayer.stack];
        },
        []
      );

      /** 调用koa-compose 把layerMiddlewareChain组合起来并执行 */
      return compose(layerMiddlewareChain)(ctx, next);
    };

    dispatch.router = router;
    return dispatch;
  }

  /** 设置param处理中间件 */
  param(id, paramhandler) {
    // 记录param
    this.params[id] = paramhandler;
    this.stack.forEach((layer) => {
      layer.param(id, paramhandler);
    });
  }

  /** 设置router的prefix 增加 */
  prefix(_prefix = "") {
    _prefix = _prefix.replace(/\/$/, "");
    this.opts.prefix = `${_prefix}${this.opts?.prefix || ""}`;
    this.stack.forEach((layer) => {
      layer.setPrefix(_prefix);
    });
  }
}

/** 动态生成 GET POST PUt DELETE 函数 */
METHODS_LIST.forEach((method) => {
  const fnName = method.toLocaleLowerCase();
  Router.prototype[fnName] = function (path, ...middlewares) {
    /** 判断path是不是数组，如果是则递归调用method方法 */
    if (Array.isArray(path)) {
      return path.forEach((p) => {
        Router.prototype[fnName].call(this, p, ...middlewares);
      });
    }

    /** 注册layer */
    Router.prototype.register.call(this, path, [fnName], middlewares);
  };
});

module.exports = Router;
