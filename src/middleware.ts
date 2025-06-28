import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  // 如果访问的是 /mind-cube，重写到 /projects/mind-cube
  if (context.url.pathname === '/mind-cube') {
    return context.rewrite('/projects/mind-cube');
  }
  
  // 继续处理其他请求
  return next();
}); 