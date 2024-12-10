const KoaRouter = require("./src/index");
const Koa = require("koa");

const koaServer = new Koa();

const apiRouter = new KoaRouter({
  prefix: "/api",
});

apiRouter.use((ctx, next) => {
  console.log("common use api");
  next();
});

/** 处理id */
apiRouter.param("id", (id, ctx, next) => {
  ctx.id = id;
  next();
});

const userRouter = new KoaRouter();
userRouter.prefix("/user/");

userRouter.get(
  ["/list", "/lists"],
  (ctx, next) => {
    console.log("pre user list");
    next();
  },
  (ctx) => {
    ctx.body = [];
  }
);

userRouter.get("/:id/info", (ctx, next) => {
  console.log("query userID = " + ctx.id);
  ctx.body = ctx.id;
});

apiRouter.use(userRouter.routes());

koaServer.use(apiRouter.routes());

koaServer.listen(9999, () => {
  console.log("listening on  http://127.0.0.1:9999");
});
