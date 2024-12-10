# My Koa Router

A lightweight and flexible router for Koa.js applications, inspired by popular routing libraries. Supports features like middleware chaining, route nesting, parameter handling, and route prefixes.

## Installation

Install the package via npm:

```bash
npm install my-koa-router
```

## Usage
```javascript
const KoaRouter = require("my-koa-router");
const Koa = require("koa");

const koaServer = new Koa();

// Create a router with a prefix
const apiRouter = new KoaRouter({
  prefix: "/api",
});

// Use middleware for all routes in this router
apiRouter.use((ctx, next) => {
  console.log("common use api");
  next();
});

// Define a parameter handler
apiRouter.param("id", (id, ctx, next) => {
  ctx.id = id; // Attach the ID to the context
  next();
});

// Create a nested router for user-related routes
const userRouter = new KoaRouter();
userRouter.prefix("/user/");

// Define user routes
userRouter.get(
  ["/list", "/lists"],
  (ctx, next) => {
    console.log("pre user list");
    next();
  },
  (ctx) => {
    ctx.body = [{
        name: 'bill',
        age: 19,
        score: 100,
    }];
  }
);

userRouter.get("/:id/info", (ctx, next) => {
  console.log("query userID = " + ctx.id);
  ctx.body = ctx.id;
});

// Nest the user router inside the API router
apiRouter.use(userRouter.routes());

// Use the API router in the Koa server
koaServer.use(apiRouter.routes());

// Start the server
koaServer.listen(9999, () => {
  console.log("listening on  http://127.0.0.1:9999");
});
```