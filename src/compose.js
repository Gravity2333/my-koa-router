module.exports = function compose(middlewares) {
  let nextMiddlewareIndex = -1;
  return async (context, outerNext) => {
    const dispatch = async (index) => {
      if (index <= nextMiddlewareIndex)
        throw new Error("next can only call once!");
      if (index >= middlewares?.length) {
        /** 中间件执行完成，调用外层next */
        return await outerNext();
      }
      const currentMiddleware = middlewares[index];
      console.log(currentMiddleware)
      try {
        await currentMiddleware(context, dispatch.bind(null,index + 1));
      } catch (e) {
        return Promise.reject(e);
      }
    };

    return await dispatch(0);
  };
};
