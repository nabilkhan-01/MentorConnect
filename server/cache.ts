// Demo build: caching disabled (no Redis required)
let inMemoryCache: Map<string, { value: any; expires: number }> | null = null;

// Cache configuration
export const CACHE_TTL = {
  user_notifications: 30,      // 30 seconds
  dashboard_stats: 300,        // 5 minutes
  at_risk_students: 600,       // 10 minutes
  academic_records: 1800,      // 30 minutes
  user_profiles: 3600,         // 1 hour
  subjects: 86400,             // 24 hours
  admin_mentor_messages: 30,   // 30 seconds
  group_chat_messages: 30,     // 30 seconds
  mentor_mentees: 300,         // 5 minutes
  admin_activities: 180,       // 3 minutes
} as const;

// Cache key generators
export const cacheKeys = {
  userNotifications: (userId: number) => `cache:notifications:${userId}`,
  userUnreadCount: (userId: number) => `cache:notifications:unread:${userId}`,
  adminDashboardStats: () => `cache:admin:dashboard:stats`,
  adminAtRiskStudents: () => `cache:admin:at-risk-students`,
  adminActivities: () => `cache:admin:activities`,
  mentorDashboardStats: (mentorId: number) => `cache:mentor:dashboard:stats:${mentorId}`,
  mentorAtRiskMentees: (mentorId: number) => `cache:mentor:at-risk-mentees:${mentorId}`,
  mentorMentees: (mentorId: number) => `cache:mentor:mentees:${mentorId}`,
  adminMentorMessages: () => `cache:admin-mentor-messages:all`,
  adminMentorMessagesUser: (userId: number) => `cache:admin-mentor-messages:${userId}`,
  groupChatMessages: (mentorId: number) => `cache:group-chat:${mentorId}`,
  userProfile: (userId: number) => `cache:user:profile:${userId}`,
  academicRecords: (menteeId: number) => `cache:academic-records:${menteeId}`,
  subjects: (semester?: number) => semester ? `cache:subjects:semester:${semester}` : `cache:subjects:all`,
} as const;

// Cache disabled for demo
let isConnected = false;

export const initCache = async () => {
  isConnected = false;
  inMemoryCache = null;
  console.log('ℹ️ Cache disabled (demo mode)');
};

export const closeCache = async () => {
  isConnected = false;
  inMemoryCache = null;
};

// Cache service class
export class CacheService {
  private static instance: CacheService;
  
  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  // Get data from cache
  async get<T>(key: string): Promise<T | null> {
    if (!isConnected) return null;
    
    try {
      if (inMemoryCache) {
        // In-memory mode
        const item = inMemoryCache.get(key);
        if (!item) return null;
        
        // Check if expired
        if (Date.now() > item.expires) {
          inMemoryCache.delete(key);
          return null;
        }
        
        return item.value;
      }
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  // Set data in cache with TTL
  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    if (!isConnected) return false;
    
    try {
      if (inMemoryCache) {
        // In-memory mode
        const expires = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : Number.MAX_SAFE_INTEGER;
        inMemoryCache.set(key, { value, expires });
      }
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  // Delete data from cache
  async del(key: string): Promise<boolean> {
    if (!isConnected) return false;
    
    try {
      if (inMemoryCache) {
        // In-memory mode
        inMemoryCache.delete(key);
      }
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  // Delete multiple keys
  async delMultiple(keys: string[]): Promise<boolean> {
    if (!isConnected) return false;
    
    try {
      if (inMemoryCache) {
        // In-memory mode
        keys.forEach(key => inMemoryCache!.delete(key));
      }
      return true;
    } catch (error) {
      console.error('Cache delete multiple error:', error);
      return false;
    }
  }

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    if (!isConnected) return false;
    
    try {
      if (inMemoryCache) {
        // In-memory mode
        const item = inMemoryCache.get(key);
        if (!item) return false;
        
        // Check if expired
        if (Date.now() > item.expires) {
          inMemoryCache.delete(key);
          return false;
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  // Get or set pattern (cache-aside)
  async getOrSet<T>(
    key: string, 
    fetchFn: () => Promise<T>, 
    ttlSeconds: number = 300
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - fetch from source
    const data = await fetchFn();
    
    // Store in cache
    await this.set(key, data, ttlSeconds);
    
    return data;
  }

  // Invalidate cache patterns
  async invalidatePattern(pattern: string): Promise<boolean> {
    if (!isConnected) return false;
    
    try {
      if (inMemoryCache) {
        // In-memory mode - simple pattern matching
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        const keysToDelete: string[] = [];
        
        for (const key of Array.from(inMemoryCache.keys())) {
          if (regex.test(key)) {
            keysToDelete.push(key);
          }
        }
        
        keysToDelete.forEach(key => inMemoryCache!.delete(key));
      }
      return true;
    } catch (error) {
      console.error('Cache invalidate pattern error:', error);
      return false;
    }
  }

  // Get cache statistics
  async getStats(): Promise<{ hits: number; misses: number; hitRate: number }> {
    // This would need to be implemented with a custom counter
    // For now, return placeholder stats
    return { hits: 0, misses: 0, hitRate: 0 };
  }
}

// Export singleton instance
export const cache = CacheService.getInstance();

// Cache invalidation helpers
export const invalidateUserCache = async (userId: number) => {
  const keys = [
    cacheKeys.userNotifications(userId),
    cacheKeys.userUnreadCount(userId),
    cacheKeys.userProfile(userId),
    cacheKeys.adminMentorMessagesUser(userId),
  ];
  await cache.delMultiple(keys);
};

export const invalidateAdminCache = async () => {
  const keys = [
    cacheKeys.adminDashboardStats(),
    cacheKeys.adminAtRiskStudents(),
    cacheKeys.adminActivities(),
  ];
  await cache.delMultiple(keys);
};

export const invalidateMentorCache = async (mentorId: number) => {
  const keys = [
    cacheKeys.mentorDashboardStats(mentorId),
    cacheKeys.mentorAtRiskMentees(mentorId),
    cacheKeys.mentorMentees(mentorId),
    cacheKeys.groupChatMessages(mentorId),
  ];
  await cache.delMultiple(keys);
};

export const invalidateMessageCache = async () => {
  const keys = [
    cacheKeys.adminMentorMessages(),
  ];
  await cache.delMultiple(keys);
  
  // Also invalidate user-specific message caches
  await cache.invalidatePattern('cache:admin-mentor-messages:*');
  await cache.invalidatePattern('cache:group-chat:*');
};

export const invalidateNotificationCache = async (userId?: number) => {
  if (userId) {
    await cache.delMultiple([
      cacheKeys.userNotifications(userId),
      cacheKeys.userUnreadCount(userId),
    ]);
  } else {
    await cache.invalidatePattern('cache:notifications:*');
  }
};
