import { Request, Response, NextFunction } from 'express';
import { cache, CACHE_TTL } from './cache';

// Cache middleware factory
export const cacheMiddleware = (ttlSeconds: number = 300) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key based on path and user
    const userId = (req as any).user?.id || 'anonymous';
    const cacheKey = `cache:${req.path}:${userId}`;

    try {
      // Try to get from cache
      const cached = await cache.get(cacheKey);
      if (cached !== null) {
        // Cache hit - return cached data
        return res.json(cached);
      }

      // Cache miss - continue to handler
      // Store cache key and TTL in request for later use
      (req as any).cacheKey = cacheKey;
      (req as any).cacheTTL = ttlSeconds;
      
      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

// Specific cache middlewares for different endpoints
export const notificationCacheMiddleware = cacheMiddleware(CACHE_TTL.user_notifications);
export const dashboardStatsCacheMiddleware = cacheMiddleware(CACHE_TTL.dashboard_stats);
export const atRiskStudentsCacheMiddleware = cacheMiddleware(CACHE_TTL.at_risk_students);
export const adminMentorMessagesCacheMiddleware = cacheMiddleware(CACHE_TTL.admin_mentor_messages);
export const groupChatCacheMiddleware = cacheMiddleware(CACHE_TTL.group_chat_messages);
export const mentorMenteesCacheMiddleware = cacheMiddleware(CACHE_TTL.mentor_mentees);
export const adminActivitiesCacheMiddleware = cacheMiddleware(CACHE_TTL.admin_activities);

// Cache response middleware (to be used after route handler)
export const cacheResponse = (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json;
  
  res.json = function(body: any) {
    // Store response in cache if cache key exists
    const cacheKey = (req as any).cacheKey;
    const cacheTTL = (req as any).cacheTTL;
    
    if (cacheKey && cacheTTL) {
      cache.set(cacheKey, body, cacheTTL).catch(error => {
        console.error('Cache response error:', error);
      });
    }
    
    return originalJson.call(this, body);
  };
  
  next();
};

// Cache invalidation middleware for write operations
export const invalidateCacheOnWrite = (invalidationKeys: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json;
    
    res.json = function(body: any) {
      // Invalidate cache after successful write operation
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.delMultiple(invalidationKeys).catch(error => {
          console.error('Cache invalidation error:', error);
        });
      }
      
      return originalJson.call(this, body);
    };
    
    next();
  };
};

// Smart cache middleware that chooses TTL based on endpoint
export const smartCacheMiddleware = (req: Request, res: Response, next: NextFunction) => {
  let ttl = 300; // Default 5 minutes
  
  // Choose TTL based on endpoint
  if (req.path.includes('/notifications')) {
    ttl = CACHE_TTL.user_notifications;
  } else if (req.path.includes('/dashboard/stats')) {
    ttl = CACHE_TTL.dashboard_stats;
  } else if (req.path.includes('/at-risk')) {
    ttl = CACHE_TTL.at_risk_students;
  } else if (req.path.includes('/admin-mentor-messages')) {
    ttl = CACHE_TTL.admin_mentor_messages;
  } else if (req.path.includes('/group-chat')) {
    ttl = CACHE_TTL.group_chat_messages;
  } else if (req.path.includes('/mentees')) {
    ttl = CACHE_TTL.mentor_mentees;
  } else if (req.path.includes('/activities')) {
    ttl = CACHE_TTL.admin_activities;
  }
  
  return cacheMiddleware(ttl)(req, res, next);
};
