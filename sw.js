const CACHE_NAME = 'bucket-dreams-v1.3';
const urlsToCache = [
    './',
    './index.html',
    './styles.css',
    './script.js',
    './manifest.json'
];

// 설치 이벤트
self.addEventListener('install', event => {
    console.log('SW: Install event');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('SW: Caching files');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('SW: All files cached');
                return self.skipWaiting(); // 즉시 활성화
            })
            .catch(err => console.error('SW: 캐시 저장 실패:', err))
    );
});

// 활성화 이벤트
self.addEventListener('activate', event => {
    console.log('SW: Activate event');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('SW: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('SW: Claiming clients');
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
                        console.log('SW: Cache hit for:', event.request.url);
                        return response;
                    }
                    
                    console.log('SW: Cache miss, fetching:', event.request.url);
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
                    console.error('SW: Fetch failed:', err);
                    
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
        self.skipWaiting();
    }
});