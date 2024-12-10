const { pathToRegexp } = require("path-to-regexp");

/**
 * Layer对象，用来记录中间件信息
 */
class Layer {
  constructor(path = "*", methods = [], middlewares = []) {
    /** 处理路径为*的情况 */
    if (path === "*") {
      // 代表任意匹配
      this.path = "";
      this.end = false;
    } else {
      /** 记录当前路径 */
      this.path = path;
    }
    /** 根据当前路径，生成regexp */
    const { regexp, keys } = pathToRegexp(this.path, {
      end: this.end,
    });
    /** 记录正则 */
    this.regexp = regexp;
    /** 记录所有的paramName */
    this.paramNames = keys;
    /** 记录支持的请求方法 */
    this.methods = methods;
    /** 记录layer包含的中间件 */
    this.stack = middlewares;
  }

  /** params 根据path匹配params */
  params(path = "") {
    const captures = path.match(this.regexp)?.slice(1);
    return captures.reduce((memo, c, index) => {
      return {
        ...memo,
        [this.paramNames[index].name]: c,
      };
    }, {});
  }

  /** 注册param处理函数 */
  param(paramName, paramHandler) {
    /** 将处理函数封装成中间件 */
    const paramHandleMiddleware = (context, next) => {
      const params = context.params;
      return paramHandler(params[paramName], context, next);
    };

    const names = this.paramNames.map((p) => p.name);

    const x = names.indexOf(paramName);

    paramHandleMiddleware.param = paramName;

    /** 说明paramName在layer对应的paramNames内，加入到stack最前面， */
    if (x >= 0) {
      this.stack.some((fn, i) => {
        if (!fn.param || names.indexOf(fn.param) >= x) {
          this.stack.splice(i, 0, paramHandleMiddleware);
          return true;
        }
      });
    }
  }

  /** 设置前缀 */
  setPrefix(prefix = "") {
    /** 去掉结尾的 / 如果存在的话 避免/重复 */
    prefix = prefix.replace(/\/$/, "");
    /** 生成新的paths */
    this.path = `${prefix}${this.path}`;
    const { regexp, keys } = pathToRegexp(this.path, {
      end: this.end,
    });
    /** 记录正则 */
    this.regexp = regexp;
    /** 记录所有的paramName */
    this.paramNames = keys;
  }
}

module.exports = Layer;
