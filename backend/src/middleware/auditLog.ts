import { Request } from 'express';

/**
 * Utilitário para extrair o IP do cliente da requisição.
 * Avalia o header X-Forwarded-For, essencial para proxies reversos (NGINX/AWS).
 */
export const extractClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded)) {
    return forwarded[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
};
