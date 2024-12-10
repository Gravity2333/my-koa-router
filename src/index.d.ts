declare module "my-koa-router" {
  import { Middleware } from "koa";

  type HTTPMethods = "GET" | "POST" | "PUT" | "DELETE";

  interface RouterOptions {
    prefix?: string;
  }

  interface Matched {
    path: Layer[];
    pathAndMethod: Layer[];
    route: boolean;
  }

  class Layer {
    path: string;
    regexp: RegExp;
    paramNames: Key[];
    methods: string[];
    stack: Middleware[];

    /**
     * 创建一个新的 Layer 实例
     * @param path 匹配的路径，默认为 "*"
     * @param methods 支持的请求方法
     * @param middlewares 包含的中间件函数
     */
    constructor(path?: string, methods?: string[], middlewares?: Middleware[]);

    /**
     * 根据路径匹配并返回参数
     * @param path 路径字符串
     * @returns 参数对象
     */
    params(path?: string): Record<string, any>;

    /**
     * 注册参数处理函数
     * @param paramName 参数名
     * @param paramHandler 参数处理函数
     */
    param(
      paramName: string,
      paramHandler: (
        param: any,
        context: Context,
        next: () => Promise<void>
      ) => any
    ): void;

    /**
     * 设置前缀路径
     * @param prefix 前缀字符串
     */
    setPrefix(prefix?: string): void;
  }

  class Router {
    constructor(opts?: RouterOptions);

    methods: HTTPMethods[];
    opts: RouterOptions;
    params: Record<string, Middleware>;
    stack: Layer[];

    /** 注册中间件 */
    use(...middlewares: Middleware[]): this;
    use(path: string | string[], ...middlewares: Middleware[]): this;

    /** 注册路由 */
    get(path: string | string[], ...middlewares: Middleware[]): this;
    post(path: string | string[], ...middlewares: Middleware[]): this;
    put(path: string | string[], ...middlewares: Middleware[]): this;
    delete(path: string | string[], ...middlewares: Middleware[]): this;

    /** 注册动态路径参数中间件 */
    param(id: string, paramHandler: Middleware): void;

    /** 设置前缀 */
    prefix(prefix: string): void;

    /** 路由匹配 */
    match(path: string, method: string): Matched;

    /** 生成中间件组合函数 */
    routes(): Middleware;
    middleware(): Middleware;
  }

  export = Router;
}
