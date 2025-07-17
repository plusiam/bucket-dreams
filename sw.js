// 🎯 Bucket Dreams - Service Worker
// 캐시 버전 관리 시스템

const CACHE_VERSION = 'v2.0.1';
const CACHE_NAME = `bucket-dreams-${CACHE_VERSION}`;
const urlsToCache = [
    './',
    './index.html',
    './styles.css',
    './script.js',
    './manifest.json'
];

// 버전 정보 로깅
console.log(`🚀 Service Worker 시작: ${CACHE_NAME}`);

// 설치 이벤트
self.addEventListener('install', event => {
    console.log(`📦 SW: Install event (${CACHE_VERSION})`);
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log(`💾 SW: Caching files for ${CACHE_VERSION}`);
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log(`✅ SW: All files cached for ${CACHE_VERSION}`);
                return self.skipWaiting(); // 즉시 활성화
            })
            .catch(err => console.error(`❌ SW: 캐시 저장 실패 (${CACHE_VERSION}):`, err))
    );
});

// 활성화 이벤트 - 이전 버전 캐시 정리
self.addEventListener('activate', event => {
    console.log(`🔄 SW: Activate event (${CACHE_VERSION})`);
    event.waitUntil(
        caches.keys().then(cacheNames => {
            console.log('🔍 SW: 발견된 캐시들:', cacheNames);
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log(`🗑️ SW: 이전 캐시 삭제: ${cacheName}`);
                        return caches.delete(cacheName);
                    } else {
                        console.log(`✅ SW: 현재 캐시 유지: ${cacheName}`);
                    }
                })
            );
        }).then(() => {
            console.log(`🎯 SW: 캐시 정리 완료, 클라이언트 제어권 획득 (${CACHE_VERSION})`);
            return self.clients.claim(); // 즉시 제어권 획득
        })
    );
});

// 페치 이벤트
self.addEventListener('fetch', event => {
    // 같은 origin의 GET 요청만 처리
    if (event.request.method === 'GET' && 
        event.request.url.startsWith(self.location.origin)) {
        
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    if (response) {
                        console.log(`📋 SW: Cache hit (${CACHE_VERSION}):`, event.request.url);
                        return response;
                    }
                    
                    console.log(`🌐 SW: Cache miss, fetching (${CACHE_VERSION}):`, event.request.url);
                    return fetch(event.request).then(response => {
                        // 성공적인 응답만 캐시
                        if (response.status === 200 && response.type === 'basic') {
                            const responseClone = response.clone();
                            caches.open(CACHE_NAME).then(cache => {
                                cache.put(event.request, responseClone);
                            });
                        }
                        return response;
                    });
                })
                .catch(err => {
                    console.error(`❌ SW: Fetch failed (${CACHE_VERSION}):`, err);
                    
                    // 오프라인 상태에서 HTML 요청 시 index.html 반환
                    if (event.request.headers.get('accept').includes('text/html')) {
                        return caches.match('./index.html');
                    }
                    
                    // 다른 리소스는 기본 오류 응답
                    return new Response('오프라인 상태입니다.', {
                        status: 503,
                        statusText: 'Service Unavailable',
                        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
                    });
                })
        );
    }
});

// 메시지 이벤트 (앱과 통신)
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log(`⏭️ SW: Skip waiting 요청 (${CACHE_VERSION})`);
        self.skipWaiting();
    }
    
    // 버전 정보 요청 처리
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({
            version: CACHE_VERSION,
            cacheName: CACHE_NAME,
            timestamp: new Date().toISOString()
        });
    }
});

// 업데이트 감지
self.addEventListener('updatefound', () => {
    console.log(`🔄 SW: 새로운 버전 감지! 현재: ${CACHE_VERSION}`);
});

// 에러 처리
self.addEventListener('error', (event) => {
    console.error(`❌ SW: 에러 발생 (${CACHE_VERSION}):`, event.error);
});

// 전역 에러 핸들러
self.addEventListener('unhandledrejection', (event) => {
    console.error(`❌ SW: 처리되지 않은 Promise 에러 (${CACHE_VERSION}):`, event.reason);
});

// 개발자 도구용 헬퍼 함수
self.getVersionInfo = () => {
    return {
        version: CACHE_VERSION,
        cacheName: CACHE_NAME,
        timestamp: new Date().toISOString(),
        urlsToCache: urlsToCache
    };
};

console.log(`🎯 Service Worker 초기화 완료: ${CACHE_NAME}`);