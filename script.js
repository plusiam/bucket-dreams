        // ========== 전역 에러 핸들링 및 보안 강화 ==========
        
        // 전역 에러 핸들러
        window.addEventListener('error', function(e) {
            console.error('앱 오류 발생:', e.error);
            // 사용자에게 친화적인 알림 (스크립트 에러 제외)
            if (!e.error.message.includes('Script error')) {
                // 개발 환경에서만 상세 에러 표시
                const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                if (isDev) {
                    console.error('상세 에러 정보:', e.error);
                }
                alert('일시적인 오류가 발생했습니다. 페이지를 새로고침해주세요.');
            }
        });

        // Unhandled Promise Rejection 핸들러
        window.addEventListener('unhandledrejection', function(e) {
            console.error('처리되지 않은 Promise 에러:', e.reason);
            e.preventDefault(); // 브라우저 기본 에러 처리 방지
        });

        // localStorage 안전 사용 함수
        function safeLocalStorage(action, key, data = null) {
            try {
                if (action === 'get') return localStorage.getItem(key);
                if (action === 'set') return localStorage.setItem(key, data);
                if (action === 'remove') return localStorage.removeItem(key);
            } catch (e) {
                console.warn('localStorage 사용 불가:', e);
                // 쿠키로 폴백 (간단한 데이터만)
                if (action === 'get' && key.length < 50) {
                    return getCookie(key);
                }
                return null;
            }
        }

        // 쿠키 폴백 함수들
        function setCookie(name, value, days = 30) {
            const expires = new Date(Date.now() + days * 864e5).toUTCString();
            document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Strict`;
        }

        function getCookie(name) {
            return document.cookie.split('; ').reduce((r, v) => {
                const parts = v.split('=');
                return parts[0] === name ? decodeURIComponent(parts[1]) : r;
            }, '');
        }

        // 이미지 파일 검증 함수 (강화)
        function validateImageFile(file) {
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
            const maxSize = 10 * 1024 * 1024; // 10MB
            
            if (!validTypes.includes(file.type)) {
                alert('JPG, PNG, WebP 파일만 업로드 가능합니다.');
                return false;
            }
            
            if (file.size > maxSize) {
                alert('파일 크기는 10MB 이하만 가능합니다.');
                return false;
            }

            // 파일 이름 검증 (보안)
            const fileName = file.name.toLowerCase();
            const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
            if (dangerousExtensions.some(ext => fileName.includes(ext))) {
                alert('허용되지 않는 파일 형식입니다.');
                return false;
            }
            
            return true;
        }

        // 디바운싱 함수 (메모리 최적화)
        function debounce(func, wait, immediate = false) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    timeout = null;
                    if (!immediate) func(...args);
                };
                const callNow = immediate && !timeout;
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
                if (callNow) func(...args);
            };
        }

        // 쓰로틀링 함수 (스크롤 이벤트 최적화)
        function throttle(func, limit) {
            let inThrottle;
            return function(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        }

        // 이미지 지연 로딩 함수 (Intersection Observer 사용)
        function addLazyLoading() {
            if ('IntersectionObserver' in window) {
                const imageObserver = new IntersectionObserver((entries, observer) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const img = entry.target;
                            if (img.dataset.src) {
                                img.src = img.dataset.src;
                                img.removeAttribute('data-src');
                            }
                            imageObserver.unobserve(img);
                        }
                    });
                });

                document.querySelectorAll('img[data-src]').forEach(img => {
                    imageObserver.observe(img);
                });
            } else {
                // 폴백: Intersection Observer 지원하지 않는 브라우저
                document.querySelectorAll('img[data-src]').forEach(img => {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                });
            }
        }

        // 메모리 사용량 모니터링 (개발 모드)
        function monitorMemoryUsage() {
            if (performance.memory && window.location.hostname === 'localhost') {
                const memory = performance.memory;
                console.log('메모리 사용량:', {
                    used: Math.round(memory.usedJSHeapSize / 1048576) + 'MB',
                    total: Math.round(memory.totalJSHeapSize / 1048576) + 'MB',
                    limit: Math.round(memory.jsHeapSizeLimit / 1048576) + 'MB'
                });
            }
        }

        // XSS 방지를 위한 HTML 이스케이프
        function escapeHtml(text) {
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return text.replace(/[&<>"']/g, m => map[m]);
        }

        // 이미지 압축 함수 (Canvas 사용)
        function compressImage(file, maxWidth = 1200, quality = 0.8) {
            return new Promise((resolve) => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();
                
                img.onload = function() {
                    // 비율 계산
                    let { width, height } = img;
                    if (width > height) {
                        if (width > maxWidth) {
                            height = height * (maxWidth / width);
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxWidth) {
                            width = width * (maxWidth / height);
                            height = maxWidth;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    // 이미지 그리기
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // 압축된 데이터 URL 반환
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                
                img.src = URL.createObjectURL(file);
            });
        }

        // ========== 기존 코드 시작 ==========

        // 전역 변수
        let profiles = [];
        let currentProfile = null;
        let currentFilter = 'all';
        let currentGoalId = null;
        let deferredPrompt = null;
        let autoLogoutTimer = null;
        let autoLogoutWarningTimer = null;
        let isGuestMode = false;
        let isEditMode = false;

        // 성능 최적화를 위한 캐시 변수들
        let renderedBucketListHTML = '';
        let lastFilterState = '';
        let resizeObserver = null;

        // 자동완성용 일반적인 목표들
        const commonGoals = [
            '세계여행하기', '마라톤 완주하기', '새로운 언어 배우기',
            '책 100권 읽기', '요리 배우기', '악기 배우기', 
            '스카이다이빙하기', '오로라 보기', '등산하기',
            '새로운 취미 시작하기', '건강한 생활 유지하기',
            '봉사활동 참여하기', '새로운 도시 탐험하기', '독서 모임 참여하기'
        ];

        // 카테고리 이름 매핑
        const categoryNames = {
            travel: '🌍 여행',
            hobby: '🎨 취미',
            career: '💼 커리어',
            relationship: '👥 인간관계',
            health: '💪 건강',
            other: '✨ 기타'
        };

        // 카테고리별 축하 메시지
        const congratulationMessages = {
            travel: '세상은 넓고, 당신의 발자국은 특별합니다',
            hobby: '일상에 작은 행복을 더하는 순간',
            career: '한 걸음 더 성장한 당신을 응원합니다',
            relationship: '함께여서 더 따뜻한 순간들',
            health: '건강한 몸과 마음, 당신의 가장 큰 자산',
            other: '꿈을 현실로 만든 당신이 멋집니다'
        };

        // 모바일 여부 확인 (개선된 버전)
        function isMobile() {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                   (navigator.maxTouchPoints && navigator.maxTouchPoints > 2) ||
                   window.matchMedia('(max-width: 768px)').matches;
        }

        // 다크모드 감지
        function isDarkMode() {
            return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        }

        // 리듀스 모션 감지
        function prefersReducedMotion() {
            return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        }

        // 초기화 (최적화된 버전)
        function init() {
            try {
                loadProfiles();
                setupEventListeners();
                setupPWA();
                showProfileSelector();
                setupAutoLogout();
                setupGoalInputPlaceholder();
                setupPerformanceMonitoring();
                setupAccessibility();
                
                // 개발 모드에서 메모리 모니터링
                if (window.location.hostname === 'localhost') {
                    setInterval(monitorMemoryUsage, 30000); // 30초마다
                }
            } catch (error) {
                console.error('초기화 중 오류 발생:', error);
                alert('앱 초기화 중 오류가 발생했습니다. 페이지를 새로고침해주세요.');
            }
        }

        // 성능 모니터링 설정
        function setupPerformanceMonitoring() {
            // 성능 관찰자 설정 (지원하는 브라우저에서만)
            if ('PerformanceObserver' in window) {
                try {
                    const perfObserver = new PerformanceObserver((list) => {
                        const entries = list.getEntries();
                        entries.forEach(entry => {
                            if (entry.entryType === 'measure') {
                                console.log(`Performance: ${entry.name} took ${entry.duration}ms`);
                            }
                        });
                    });
                    
                    perfObserver.observe({ entryTypes: ['measure'] });
                } catch (e) {
                    console.log('Performance Observer 설정 실패:', e);
                }
            }
        }

        // 접근성 설정
        function setupAccessibility() {
            // 키보드 네비게이션 개선
            document.addEventListener('keydown', function(e) {
                // ESC 키로 모달 닫기
                if (e.key === 'Escape') {
                    const modals = document.querySelectorAll('.modal[style*="display: block"]');
                    modals.forEach(modal => {
                        modal.style.display = 'none';
                        modal.setAttribute('aria-hidden', 'true');
                    });
                }
                
                // Tab 키 순환 개선
                if (e.key === 'Tab') {
                    const focusableElements = document.querySelectorAll(
                        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                    );
                    const firstElement = focusableElements[0];
                    const lastElement = focusableElements[focusableElements.length - 1];
                    
                    if (e.shiftKey && document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    } else if (!e.shiftKey && document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            });

            // 포커스 관리
            document.addEventListener('focusin', function(e) {
                if (e.target.closest('.modal')) {
                    // 모달 내부 포커스 유지
                    const modal = e.target.closest('.modal');
                    modal.setAttribute('aria-hidden', 'false');
                }
            });
        }

        // 목표 입력창 placeholder 설정 (최적화)
        function setupGoalInputPlaceholder() {
            const goalInput = document.getElementById('goalInput');
            if (goalInput) {
                const updatePlaceholder = () => {
                    const randomGoal = commonGoals[Math.floor(Math.random() * commonGoals.length)];
                    goalInput.placeholder = `예: ${randomGoal}`;
                };
                
                updatePlaceholder();
                
                // 포커스시 placeholder 변경 (디바운스 적용)
                const debouncedUpdate = debounce(updatePlaceholder, 300);
                goalInput.addEventListener('focus', debouncedUpdate);
            }
        }

        // 프로필 데이터 로드 (안전한 localStorage 사용)
        function loadProfiles() {
            const saved = safeLocalStorage('get', 'bucketListProfiles');
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    profiles = data.profiles || [];
                    cleanOldProfiles();
                } catch (e) {
                    console.error('프로필 데이터 파싱 오류:', e);
                    profiles = [];
                    // 백업 데이터 시도
                    tryRestoreFromBackup();
                }
            } else {
                profiles = [];
            }
        }

        // 백업에서 복원 시도
        function tryRestoreFromBackup() {
            const backup = safeLocalStorage('get', 'bucketListProfiles_backup');
            if (backup) {
                try {
                    const data = JSON.parse(backup);
                    profiles = data.profiles || [];
                    console.log('백업에서 데이터 복원 완료');
                } catch (e) {
                    console.error('백업 데이터도 손상됨:', e);
                }
            }
        }

        // 오래된 프로필 정리 (최적화)
        function cleanOldProfiles() {
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            const originalLength = profiles.length;
            profiles = profiles.filter(profile => {
                return new Date(profile.lastAccess).getTime() > thirtyDaysAgo;
            });
            
            if (profiles.length !== originalLength) {
                console.log(`${originalLength - profiles.length}개의 오래된 프로필 정리 완료`);
                saveProfiles();
            }
        }

        // 프로필 데이터 저장 (안전한 localStorage 사용, 백업 포함)
        function saveProfiles() {
            if (isGuestMode) return;
            
            const data = {
                profiles: profiles,
                lastCleaned: new Date().toISOString(),
                version: '1.0'
            };
            
            const dataString = JSON.stringify(data);
            
            // 메인 저장
            const result = safeLocalStorage('set', 'bucketListProfiles', dataString);
            
            // 백업 저장 (비동기)
            setTimeout(() => {
                safeLocalStorage('set', 'bucketListProfiles_backup', dataString);
            }, 100);
            
            if (result === null) {
                console.warn('프로필 저장 실패 - localStorage 사용 불가');
                // 쿠키 폴백은 데이터 크기 제한으로 사용하지 않음
            }
        }

        // 자동 로그아웃 설정 (최적화)
        function setupAutoLogout() {
            resetAutoLogout();
            
            // 쓰로틀링 적용하여 성능 최적화
            const throttledReset = throttle(resetAutoLogout, 1000);
            
            ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
                document.addEventListener(event, throttledReset, { passive: true });
            });
        }

        // 자동 로그아웃 리셋 (최적화)
        function resetAutoLogout() {
            clearTimeout(autoLogoutTimer);
            clearTimeout(autoLogoutWarningTimer);
            
            const notice = document.getElementById('autoLogoutNotice');
            if (notice) notice.style.display = 'none';
            
            // 25분 후 경고, 30분 후 로그아웃
            autoLogoutWarningTimer = setTimeout(() => {
                showAutoLogoutWarning();
            }, 25 * 60 * 1000);
            
            autoLogoutTimer = setTimeout(() => {
                autoLogout();
            }, 30 * 60 * 1000);
        }

        // 자동 로그아웃 경고 (메모리 최적화)
        function showAutoLogoutWarning() {
            const notice = document.getElementById('autoLogoutNotice');
            if (notice) {
                notice.style.display = 'block';
                notice.setAttribute('aria-hidden', 'false');
                let countdown = 5 * 60;
                
                const updateCountdown = () => {
                    const minutes = Math.floor(countdown / 60);
                    const seconds = countdown % 60;
                    const textElement = document.getElementById('autoLogoutText');
                    if (textElement) {
                        textElement.textContent = 
                            `${minutes}:${seconds.toString().padStart(2, '0')} 후 자동 로그아웃됩니다`;
                    }
                    countdown--;
                    
                    if (countdown < 0) {
                        clearInterval(countdownInterval);
                    }
                };
                
                const countdownInterval = setInterval(updateCountdown, 1000);
                updateCountdown();
                
                // 메모리 누수 방지
                setTimeout(() => {
                    clearInterval(countdownInterval);
                }, 6 * 60 * 1000);
            }
        }

        // 자동 로그아웃 실행
        function autoLogout() {
            alert('오랫동안 사용하지 않아 자동으로 로그아웃됩니다.');
            finishSession();
        }

        // 이벤트 리스너 설정 (최적화된 버전)
        function setupEventListeners() {
            // 입력 이벤트들 (디바운스 적용)
            const goalInput = document.getElementById('goalInput');
            if (goalInput) {
                goalInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        addGoal();
                    }
                });
            }

            const newUserNameInput = document.getElementById('newUserNameInput');
            if (newUserNameInput) {
                newUserNameInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        createNewUser();
                    }
                });
            }

            // 필터 버튼들 (이벤트 위임 사용)
            const filtersContainer = document.querySelector('.filters');
            if (filtersContainer) {
                filtersContainer.addEventListener('click', function(e) {
                    const filterBtn = e.target.closest('.filter-btn');
                    if (filterBtn) {
                        // 모든 필터 버튼에서 active 클래스 제거
                        filtersContainer.querySelectorAll('.filter-btn').forEach(btn => {
                            btn.classList.remove('active');
                            btn.setAttribute('aria-pressed', 'false');
                        });
                        
                        // 클릭된 버튼에 active 클래스 추가
                        filterBtn.classList.add('active');
                        filterBtn.setAttribute('aria-pressed', 'true');
                        
                        currentFilter = filterBtn.dataset.category;
                        renderBucketList();
                    }
                });
            }

            // 모달 외부 클릭 이벤트 (이벤트 위임)
            document.addEventListener('click', function(e) {
                if (e.target.classList.contains('modal')) {
                    e.target.style.display = 'none';
                    e.target.setAttribute('aria-hidden', 'true');
                }
            });

            // 리사이즈 관찰자 설정 (지원하는 브라우저에서만)
            if ('ResizeObserver' in window) {
                resizeObserver = new ResizeObserver(debounce(() => {
                    // 화면 크기 변경 시 레이아웃 재조정
                    renderBucketList();
                }, 250));
                
                resizeObserver.observe(document.body);
            }
        }

        // PWA 설정 (보안 강화)
        function setupPWA() {
            if ('serviceWorker' in navigator) {
                const swCode = `
                    const CACHE_NAME = 'bucket-dreams-v1.1';
                    const urlsToCache = [
                        '/',
                        '/index.html',
                        '/styles.css',
                        '/script.js'
                    ];
                    
                    self.addEventListener('install', event => {
                        event.waitUntil(
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    return cache.addAll(urlsToCache);
                                })
                                .catch(err => console.error('캐시 저장 실패:', err))
                        );
                    });
                    
                    self.addEventListener('fetch', event => {
                        // HTTPS만 캐시
                        if (event.request.url.startsWith('https:')) {
                            event.respondWith(
                                caches.match(event.request)
                                    .then(response => {
                                        return response || fetch(event.request);
                                    })
                                    .catch(err => {
                                        console.error('Fetch 실패:', err);
                                        return new Response('오프라인 상태입니다.', {
                                            status: 503,
                                            statusText: 'Service Unavailable'
                                        });
                                    })
                            );
                        }
                    });
                `;
                
                const blob = new Blob([swCode], { type: 'application/javascript' });
                const swUrl = URL.createObjectURL(blob);
                
                navigator.serviceWorker.register(swUrl)
                    .then(registration => {
                        console.log('SW registered:', registration.scope);
                    })
                    .catch(error => {
                        console.log('SW registration failed:', error);
                    });
            }

            // PWA 설치 프롬프트
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                deferredPrompt = e;
                const installBtn = document.getElementById('installBtn');
                if (installBtn) {
                    installBtn.style.display = 'block';
                    installBtn.setAttribute('aria-hidden', 'false');
                }
            });

            // 설치 완료 감지
            window.addEventListener('appinstalled', (e) => {
                console.log('PWA가 설치되었습니다');
                const installBtn = document.getElementById('installBtn');
                if (installBtn) {
                    installBtn.style.display = 'none';
                    installBtn.setAttribute('aria-hidden', 'true');
                }
            });
        }

        // PWA 설치 (개선된 버전)
        function installPWA() {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                        console.log('사용자가 PWA 설치를 승인했습니다');
                    } else {
                        console.log('사용자가 PWA 설치를 거부했습니다');
                    }
                    deferredPrompt = null;
                    const installBtn = document.getElementById('installBtn');
                    if (installBtn) {
                        installBtn.style.display = 'none';
                        installBtn.setAttribute('aria-hidden', 'true');
                    }
                });
            } else {
                // 설치 프롬프트가 없는 경우 안내
                alert('이 브라우저에서는 앱 설치가 지원되지 않거나 이미 설치되었습니다.');
            }
        }

        // 프로필 선택 화면 표시
        function showProfileSelector() {
            const profileSelector = document.getElementById('profileSelector');
            const mainApp = document.getElementById('mainApp');
            
            if (profileSelector) {
                profileSelector.style.display = 'block';
                profileSelector.setAttribute('aria-hidden', 'false');
            }
            if (mainApp) {
                mainApp.classList.remove('active');
                mainApp.setAttribute('aria-hidden', 'true');
            }
            
            renderProfileOptions();
            
            // 포커스 관리
            setTimeout(() => {
                const firstProfile = document.querySelector('.profile-card');
                if (firstProfile) firstProfile.focus();
            }, 100);
        }

        // 프로필 선택 옵션 렌더링 (XSS 방지 적용)
        function renderProfileOptions() {
            const container = document.getElementById('profileOptions');
            if (!container) return;
            
            let optionsHTML = '';
            
            profiles.forEach(profile => {
                const safeName = escapeHtml(profile.name);
                const lastAccess = new Date(profile.lastAccess).toLocaleDateString('ko-KR');
                const goalCount = profile.bucketList.length;
                const completedCount = profile.bucketList.filter(goal => goal.completed).length;
                
                optionsHTML += `
                    <button class="profile-card" onclick="selectProfile('${profile.id}')" aria-label="${safeName} 프로필 선택">
                        <h3>👤 ${safeName}</h3>
                        <p>목표: ${goalCount}개 | 완료: ${completedCount}개</p>
                        <div class="profile-meta">마지막 접속: ${lastAccess}</div>
                    </button>
                `;
            });
            
            optionsHTML += `
                <button class="profile-card new-user" onclick="showNewUserModal()" aria-label="새 사용자 생성">
                    <h3>➕ 새 사용자</h3>
                    <p>새로운 버킷리스트 시작하기</p>
                </button>
            `;
            
            optionsHTML += `
                <button class="profile-card guest" onclick="startGuestMode()" aria-label="게스트 모드로 시작">
                    <h3>👤 게스트 모드</h3>
                    <p>임시 사용 (데이터 저장 안됨)</p>
                </button>
            `;
            
            container.innerHTML = optionsHTML;
        }

        // 프로필 선택
        function selectProfile(profileId) {
            const profile = profiles.find(p => p.id === profileId);
            if (profile) {
                currentProfile = profile;
                profile.lastAccess = new Date().toISOString();
                isGuestMode = false;
                saveProfiles();
                showMainApp();
            }
        }

        // 새 사용자 모달 표시
        function showNewUserModal() {
            const modal = document.getElementById('newUserModal');
            const input = document.getElementById('newUserNameInput');
            
            if (modal) {
                modal.style.display = 'block';
                modal.setAttribute('aria-hidden', 'false');
            }
            if (input) {
                input.focus();
                input.value = '';
            }
        }

        // 새 사용자 생성 (보안 강화)
        function createNewUser() {
            const nameInput = document.getElementById('newUserNameInput');
            if (!nameInput) return;
            
            const userName = nameInput.value.trim();
            
            // 입력 검증 강화
            if (!userName) {
                alert('이름을 입력해주세요!');
                nameInput.focus();
                return;
            }
            
            if (userName.length < 1 || userName.length > 20) {
                alert('이름은 1자 이상 20자 이하로 입력해주세요.');
                nameInput.focus();
                return;
            }
            
            // 특수문자 검증
            const invalidChars = /[<>\"'&]/;
            if (invalidChars.test(userName)) {
                alert('이름에 특수문자는 사용할 수 없습니다.');
                nameInput.focus();
                return;
            }
            
            if (profiles.some(p => p.name === userName)) {
                alert('이미 존재하는 이름입니다. 다른 이름을 사용해주세요.');
                nameInput.focus();
                return;
            }
            
            const newProfile = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                name: userName,
                bucketList: [],
                createdAt: new Date().toISOString(),
                lastAccess: new Date().toISOString()
            };
            
            profiles.push(newProfile);
            currentProfile = newProfile;
            isGuestMode = false;
            saveProfiles();
            
            const modal = document.getElementById('newUserModal');
            if (modal) {
                modal.style.display = 'none';
                modal.setAttribute('aria-hidden', 'true');
            }
            nameInput.value = '';
            showMainApp();
        }

        // 새 사용자 생성 취소
        function cancelNewUser() {
            const modal = document.getElementById('newUserModal');
            const input = document.getElementById('newUserNameInput');
            
            if (modal) {
                modal.style.display = 'none';
                modal.setAttribute('aria-hidden', 'true');
            }
            if (input) input.value = '';
        }

        // 게스트 모드 시작
        function startGuestMode() {
            currentProfile = {
                id: 'guest',
                name: '게스트',
                bucketList: [],
                createdAt: new Date().toISOString(),
                lastAccess: new Date().toISOString()
            };
            isGuestMode = true;
            showMainApp();
        }

        // 메인 앱 화면 표시 (성능 최적화)
        function showMainApp() {
            performance.mark('showMainApp-start');
            
            const profileSelector = document.getElementById('profileSelector');
            const mainApp = document.getElementById('mainApp');
            
            if (profileSelector) {
                profileSelector.style.display = 'none';
                profileSelector.setAttribute('aria-hidden', 'true');
            }
            if (mainApp) {
                mainApp.classList.add('active');
                mainApp.setAttribute('aria-hidden', 'false');
            }
            
            updateHeaderTitle();
            renderBucketList();
            updateStats();
            updateDataStats();
            resetAutoLogout();
            
            // 지연 로딩 적용
            setTimeout(() => {
                addLazyLoading();
            }, 100);
            
            performance.mark('showMainApp-end');
            performance.measure('showMainApp', 'showMainApp-start', 'showMainApp-end');
        }

        // 헤더 제목 업데이트 (XSS 방지)
        function updateHeaderTitle() {
            const headerTitle = document.getElementById('headerTitle');
            if (headerTitle && currentProfile) {
                const safeName = escapeHtml(currentProfile.name);
                headerTitle.textContent = `🎯 ${safeName}의 버킷리스트`;
                if (isGuestMode) {
                    headerTitle.textContent += ' (게스트)';
                }
            }
        }

        // 사용자 전환 표시
        function showUserSwitch() {
            if (confirm('다른 사용자로 전환하시겠습니까?\\n현재 세션이 종료됩니다.')) {
                showProfileSelector();
            }
        }

        // 세션 종료 (정리 작업 포함)
        function finishSession() {
            if (confirm('사용을 완료하시겠습니까?')) {
                if (currentProfile && !isGuestMode) {
                    currentProfile.lastAccess = new Date().toISOString();
                    saveProfiles();
                }
                
                // 리소스 정리
                if (resizeObserver) {
                    resizeObserver.disconnect();
                }
                
                clearTimeout(autoLogoutTimer);
                clearTimeout(autoLogoutWarningTimer);
                
                showProfileSelector();
            }
        }

        // 탭 전환 (성능 최적화)
        function switchTab(tabName) {
            performance.mark('switchTab-start');
            
            // 탭 버튼 상태 업데이트
            document.querySelectorAll('.nav-tab').forEach(tab => {
                tab.classList.remove('active');
                tab.setAttribute('aria-selected', 'false');
                tab.setAttribute('tabindex', '-1');
            });
            
            const activeTab = event.target;
            activeTab.classList.add('active');
            activeTab.setAttribute('aria-selected', 'true');
            activeTab.setAttribute('tabindex', '0');

            // 탭 콘텐츠 표시
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
                content.setAttribute('aria-hidden', 'true');
            });
            
            const targetTab = document.getElementById(tabName + '-tab');
            if (targetTab) {
                targetTab.classList.add('active');
                targetTab.setAttribute('aria-hidden', 'false');
            }

            // 탭별 초기화 작업
            if (tabName === 'gallery') {
                renderGallery();
            } else if (tabName === 'data') {
                updateDataStats();
                renderProfileList();
            }
            
            performance.mark('switchTab-end');
            performance.measure('switchTab', 'switchTab-start', 'switchTab-end');
        }

        // 목표 추가 (입력 검증 강화)
        function addGoal() {
            const goalInput = document.getElementById('goalInput');
            const categorySelect = document.getElementById('categorySelect');
            
            if (!goalInput || !categorySelect) return;
            
            const goalText = goalInput.value.trim();
            
            if (!goalText) {
                alert('목표를 입력해주세요!');
                goalInput.focus();
                return;
            }
            
            if (goalText.length > 100) {
                alert('목표는 100자 이하로 입력해주세요.');
                goalInput.focus();
                return;
            }
            
            // XSS 방지
            const safeGoalText = escapeHtml(goalText);

            const newGoal = {
                id: Date.now() + Math.random(),
                text: safeGoalText,
                category: categorySelect.value,
                completed: false,
                completionNote: '',
                image: null,
                createdAt: new Date().toISOString(),
                completedAt: null
            };

            if (currentProfile) {
                currentProfile.bucketList.push(newGoal);
                saveProfiles();
                
                goalInput.value = '';
                renderBucketList();
                updateStats();
                updateDataStats();
                
                // 접근성: 추가 완료 알림
                const announcement = document.createElement('div');
                announcement.textContent = `목표 "${safeGoalText}"가 추가되었습니다.`;
                announcement.setAttribute('aria-live', 'polite');
                announcement.style.position = 'absolute';
                announcement.style.left = '-9999px';
                document.body.appendChild(announcement);
                
                setTimeout(() => {
                    document.body.removeChild(announcement);
                }, 1000);
            }
        }

        // 목표 삭제 (확인 강화)
        function deleteGoal(id) {
            if (!currentProfile) return;
            
            const goal = currentProfile.bucketList.find(g => g.id === id);
            if (!goal) return;
            
            const safeGoalText = escapeHtml(goal.text);
            if (confirm(`"${safeGoalText}" 목표를 정말 삭제하시겠습니까?`)) {
                currentProfile.bucketList = currentProfile.bucketList.filter(goal => goal.id !== id);
                saveProfiles();
                renderBucketList();
                updateStats();
                updateDataStats();
                renderGallery();
            }
        }

        // 완료 상태 토글
        function toggleComplete(id) {
            if (!currentProfile) return;
            
            const goal = currentProfile.bucketList.find(g => g.id === id);
            if (goal) {
                if (!goal.completed) {
                    currentGoalId = id;
                    isEditMode = false;
                    setupCompletionModal(goal, false);
                } else {
                    goal.completed = false;
                    goal.completionNote = '';
                    goal.completedAt = null;
                    saveProfiles();
                    renderBucketList();
                    updateStats();
                    updateDataStats();
                    renderGallery();
                }
            }
        }

        // 완료된 목표 편집
        function editCompletedGoal(id) {
            if (!currentProfile) return;
            
            const goal = currentProfile.bucketList.find(g => g.id === id);
            if (goal && goal.completed) {
                currentGoalId = id;
                isEditMode = true;
                setupCompletionModal(goal, true);
            }
        }

        // 완료/편집 모달 설정
        function setupCompletionModal(goal, editMode) {
            const modalTitle = document.getElementById('modalTitle');
            const modalSubtitle = document.getElementById('modalSubtitle');
            const confirmBtn = document.querySelector('.btn-confirm');
            
            if (modalTitle && modalSubtitle && confirmBtn) {
                if (editMode) {
                    modalTitle.textContent = '✏️ 목표 편집';
                    modalSubtitle.textContent = '달성 정보를 수정할 수 있습니다';
                    confirmBtn.textContent = '수정';
                } else {
                    modalTitle.textContent = '🎉 목표 달성!';
                    modalSubtitle.textContent = '이 순간의 느낌을 기록해보세요';
                    confirmBtn.textContent = '저장';
                }
            }
            
            const completionDate = document.getElementById('completionDate');
            if (completionDate) {
                if (goal.completedAt) {
                    const date = new Date(goal.completedAt).toISOString().split('T')[0];
                    completionDate.value = date;
                } else {
                    const today = new Date().toISOString().split('T')[0];
                    completionDate.value = today;
                }
            }
            
            const completionNote = document.getElementById('completionNote');
            if (completionNote) {
                completionNote.value = goal.completionNote || '';
            }
            
            const modal = document.getElementById('completionModal');
            if (modal) {
                modal.style.display = 'block';
                modal.setAttribute('aria-hidden', 'false');
                if (completionNote) {
                    completionNote.focus();
                }
            }
        }

        // 완료 모달 닫기
        function closeCompletionModal() {
            const modal = document.getElementById('completionModal');
            if (modal) {
                modal.style.display = 'none';
                modal.setAttribute('aria-hidden', 'true');
            }
            currentGoalId = null;
            isEditMode = false;
        }

        // 완료 저장 (입력 검증 강화)
        function saveCompletion() {
            if (!currentProfile || !currentGoalId) return;
            
            const goal = currentProfile.bucketList.find(g => g.id === currentGoalId);
            const noteElement = document.getElementById('completionNote');
            const dateElement = document.getElementById('completionDate');
            
            if (!goal || !noteElement || !dateElement) return;
            
            const note = noteElement.value.trim();
            const completionDate = dateElement.value;
            
            if (!completionDate) {
                alert('달성 날짜를 선택해주세요!');
                dateElement.focus();
                return;
            }
            
            // 미래 날짜 체크
            const selectedDate = new Date(completionDate);
            const today = new Date();
            today.setHours(23, 59, 59, 999); // 오늘 끝까지
            
            if (selectedDate > today) {
                alert('미래 날짜는 선택할 수 없습니다.');
                dateElement.focus();
                return;
            }
            
            // 후기 길이 체크
            if (note.length > 500) {
                alert('달성 후기는 500자 이하로 작성해주세요.');
                noteElement.focus();
                return;
            }
            
            goal.completed = true;
            goal.completionNote = escapeHtml(note);
            goal.completedAt = new Date(completionDate + 'T12:00:00').toISOString();
            
            saveProfiles();
            renderBucketList();
            updateStats();
            updateDataStats();
            renderGallery();
            
            closeCompletionModal();
        }

        // 파일로 이미지 업로드 (압축 적용)
        async function uploadImageFile(id, file) {
            if (!file || !currentProfile) return;
            
            // 파일 검증
            if (!validateImageFile(file)) {
                return;
            }
            
            try {
                // 이미지 압축
                const compressedDataUrl = await compressImage(file);
                
                const goal = currentProfile.bucketList.find(g => g.id === id);
                if (goal) {
                    goal.image = compressedDataUrl;
                    saveProfiles();
                    renderBucketList();
                    renderGallery();
                    updateDataStats();
                }
            } catch (error) {
                console.error('이미지 처리 오류:', error);
                alert('이미지 처리 중 오류가 발생했습니다.');
            }
        }

        // 모바일 촬영 기능 (개선된 버전)
        function captureImage(id) {
            if (isMobile()) {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.setAttribute('capture', 'environment');
                input.style.display = 'none';
                
                input.onchange = async function(e) {
                    const file = e.target.files[0];
                    if (file && validateImageFile(file)) {
                        await uploadImageFile(id, file);
                    }
                    document.body.removeChild(input);
                };
                
                input.onerror = function() {
                    console.error('카메라 접근 실패');
                    document.body.removeChild(input);
                };
                
                document.body.appendChild(input);
                input.click();
            } else {
                captureWithWebcam(id);
            }
        }

        // 데스크톱용 웹캠 촬영 (에러 처리 강화)
        function captureWithWebcam(id) {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                alert('카메라 기능을 사용할 수 없습니다.');
                return;
            }

            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.9);
                z-index: 2000;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            `;
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-label', '카메라 촬영');

            const video = document.createElement('video');
            video.style.cssText = `
                width: 80%;
                max-width: 500px;
                border-radius: 10px;
                margin-bottom: 20px;
            `;
            video.autoplay = true;
            video.playsInline = true;

            const controls = document.createElement('div');
            controls.style.cssText = `
                display: flex;
                gap: 15px;
            `;

            const captureBtn = document.createElement('button');
            captureBtn.textContent = '📷 촬영';
            captureBtn.style.cssText = `
                padding: 15px 30px;
                background: #4facfe;
                color: white;
                border: none;
                border-radius: 10px;
                font-size: 1rem;
                cursor: pointer;
            `;
            captureBtn.setAttribute('aria-label', '사진 촬영');

            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = '❌ 취소';
            cancelBtn.style.cssText = `
                padding: 15px 30px;
                background: #dc3545;
                color: white;
                border: none;
                border-radius: 10px;
                font-size: 1rem;
                cursor: pointer;
            `;
            cancelBtn.setAttribute('aria-label', '촬영 취소');

            const instruction = document.createElement('p');
            instruction.textContent = '카메라를 준비하고 촬영 버튼을 눌러주세요';
            instruction.style.cssText = `
                color: white;
                font-size: 1.2rem;
                margin-bottom: 20px;
                text-align: center;
            `;

            controls.appendChild(captureBtn);
            controls.appendChild(cancelBtn);
            modal.appendChild(instruction);
            modal.appendChild(video);
            modal.appendChild(controls);
            document.body.appendChild(modal);

            navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } 
            })
            .then(stream => {
                video.srcObject = stream;
                
                captureBtn.onclick = async () => {
                    try {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        ctx.drawImage(video, 0, 0);
                        
                        const imageData = canvas.toDataURL('image/jpeg', 0.8);
                        
                        if (currentProfile) {
                            const goal = currentProfile.bucketList.find(g => g.id === id);
                            if (goal) {
                                goal.image = imageData;
                                saveProfiles();
                                renderBucketList();
                                renderGallery();
                                updateDataStats();
                            }
                        }
                        
                        stream.getTracks().forEach(track => track.stop());
                        document.body.removeChild(modal);
                    } catch (error) {
                        console.error('이미지 캡처 오류:', error);
                        alert('이미지 촬영 중 오류가 발생했습니다.');
                    }
                };

                cancelBtn.onclick = () => {
                    stream.getTracks().forEach(track => track.stop());
                    document.body.removeChild(modal);
                };
                
                // ESC 키로 취소
                const handleKeydown = (e) => {
                    if (e.key === 'Escape') {
                        stream.getTracks().forEach(track => track.stop());
                        document.body.removeChild(modal);
                        document.removeEventListener('keydown', handleKeydown);
                    }
                };
                document.addEventListener('keydown', handleKeydown);
            })
            .catch(err => {
                console.error('카메라 접근 실패:', err);
                alert('카메라에 접근할 수 없습니다. 권한을 확인해주세요.');
                document.body.removeChild(modal);
            });
        }

        // 사진 삭제 기능 (확인 강화)
        function deleteImage(id) {
            if (confirm('사진을 삭제하시겠습니까?')) {
                if (currentProfile) {
                    const goal = currentProfile.bucketList.find(g => g.id === id);
                    if (goal) {
                        goal.image = null;
                        saveProfiles();
                        renderBucketList();
                        renderGallery();
                        updateDataStats();
                    }
                }
            }
        }

        // SNS 플랫폼별 카드 옵션 표시 (접근성 개선)
        function showCardOptions(goalId) {
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                z-index: 3000;
                display: flex;
                align-items: center;
                justify-content: center;
                backdrop-filter: blur(5px);
            `;
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-label', '달성 카드 생성 옵션');

            modal.innerHTML = `
                <div style="
                    background: white;
                    border-radius: 20px;
                    padding: 30px;
                    max-width: 400px;
                    width: 90%;
                    text-align: center;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                ">
                    <h3 style="margin-bottom: 10px; color: #333;">📸 달성 카드 만들기</h3>
                    <p style="color: #666; margin-bottom: 25px; font-size: 0.9rem;">
                        공유할 SNS 플랫폼을 선택하세요
                    </p>
                    
                    <div style="display: grid; gap: 12px;">
                        <button onclick="generateSNSCard(${goalId}, 'instagram'); this.closest('div').parentElement.parentElement.remove()" style="
                            padding: 15px;
                            background: linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%);
                            color: white;
                            border: none;
                            border-radius: 12px;
                            font-size: 1rem;
                            font-weight: 600;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            gap: 10px;
                        " aria-label="인스타그램 스토리용 카드 생성">
                            <span style="font-size: 1.2rem;">📷</span>
                            인스타그램 스토리 (9:16)
                        </button>
                        
                        <button onclick="generateSNSCard(${goalId}, 'default'); this.closest('div').parentElement.parentElement.remove()" style="
                            padding: 15px;
                            background: #4facfe;
                            color: white;
                            border: none;
                            border-radius: 12px;
                            font-size: 1rem;
                            font-weight: 600;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            gap: 10px;
                        " aria-label="기본 카드 생성">
                            <span style="font-size: 1.2rem;">📱</span>
                            기본 카드 (2:3)
                        </button>
                    </div>
                    
                    <button onclick="this.closest('div').parentElement.remove()" style="
                        margin-top: 15px;
                        padding: 10px 20px;
                        background: #f5f5f5;
                        color: #666;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 500;
                    " aria-label="취소">취소</button>
                </div>
            `;

            document.body.appendChild(modal);
            
            // 포커스 관리
            const firstButton = modal.querySelector('button');
            if (firstButton) firstButton.focus();
        }

        // SNS 카드 생성 (간소화된 버전)
        function generateSNSCard(goalId, platform) {
            if (!currentProfile) return;
            
            const goal = currentProfile.bucketList.find(g => g.id === goalId);
            if (!goal || !goal.completed) return;

            alert('카드 생성 기능은 개발 중입니다.');
        }

        // 데이터 내보내기 (에러 처리 강화)
        function exportCurrentProfile() {
            if (!currentProfile) return;
            
            try {
                const exportObj = {
                    profileName: currentProfile.name,
                    bucketList: currentProfile.bucketList,
                    exportDate: new Date().toISOString(),
                    isGuestMode: isGuestMode,
                    version: '1.0'
                };
                
                const dataStr = JSON.stringify(exportObj, null, 2);
                const blob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                
                const link = document.createElement('a');
                link.href = url;
                const fileName = currentProfile.name ? 
                    currentProfile.name.replace(/[^a-zA-Z0-9가-힣]/g, '_') : '사용자';
                link.download = `${fileName}_버킷리스트_백업_${new Date().toISOString().split('T')[0]}.json`;
                
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                URL.revokeObjectURL(url);
                
                alert('데이터 내보내기가 완료되었습니다!');
            } catch (error) {
                console.error('데이터 내보내기 오류:', error);
                alert('데이터 내보내기 중 오류가 발생했습니다.');
            }
        }

        // 데이터 가져오기 (보안 강화)
        function importData(file) {
            if (!file || !currentProfile) return;
            
            // 파일 크기 체크 (5MB 제한)
            if (file.size > 5 * 1024 * 1024) {
                alert('파일 크기가 너무 큽니다. 5MB 이하의 파일만 가능합니다.');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const importedData = JSON.parse(e.target.result);
                    
                    // 데이터 구조 검증
                    if (!importedData || typeof importedData !== 'object') {
                        throw new Error('올바르지 않은 파일 형식입니다.');
                    }
                    
                    let bucketList = [];
                    let profileName = currentProfile.name;
                    
                    if (importedData.profileName !== undefined && importedData.bucketList !== undefined) {
                        bucketList = importedData.bucketList || [];
                        profileName = importedData.profileName || profileName;
                    } else if (Array.isArray(importedData)) {
                        bucketList = importedData;
                    } else {
                        throw new Error('올바르지 않은 파일 형식입니다.');
                    }
                    
                    // 데이터 개수 체크
                    if (bucketList.length > 1000) {
                        alert('목표가 너무 많습니다. 1000개 이하의 목표만 가져올 수 있습니다.');
                        return;
                    }
                    
                    // 각 목표 데이터 검증 및 정리
                    bucketList = bucketList.filter(goal => {
                        return goal && goal.text && typeof goal.text === 'string';
                    }).map(goal => ({
                        id: Date.now() + Math.random(),
                        text: escapeHtml(goal.text.substring(0, 100)),
                        category: goal.category || 'other',
                        completed: Boolean(goal.completed),
                        completionNote: goal.completionNote ? 
                            escapeHtml(goal.completionNote.substring(0, 500)) : '',
                        image: goal.image || null,
                        createdAt: goal.createdAt || new Date().toISOString(),
                        completedAt: goal.completedAt || null
                    }));
                    
                    const safeProfileName = escapeHtml(profileName);
                    if (confirm(`"${safeProfileName}"의 데이터를 현재 프로필에 적용하시겠습니까?\\n(기존 데이터는 사라집니다)`)) {
                        currentProfile.bucketList = bucketList;
                        currentProfile.lastAccess = new Date().toISOString();
                        saveProfiles();
                        
                        renderBucketList();
                        updateStats();
                        updateDataStats();
                        renderGallery();
                        
                        alert('데이터 가져오기가 완료되었습니다!');
                    }
                } catch (error) {
                    console.error('데이터 가져오기 오류:', error);
                    alert('올바르지 않은 파일 형식입니다.');
                }
            };
            
            reader.onerror = function() {
                alert('파일 읽기 중 오류가 발생했습니다.');
            };
            
            reader.readAsText(file);
        }

        // 프로필 관리자 표시
        function showProfileManager() {
            renderProfileManagerContent();
            const modal = document.getElementById('profileManagerModal');
            if (modal) {
                modal.style.display = 'block';
                modal.setAttribute('aria-hidden', 'false');
            }
        }

        // 프로필 관리자 닫기
        function closeProfileManager() {
            const modal = document.getElementById('profileManagerModal');
            if (modal) {
                modal.style.display = 'none';
                modal.setAttribute('aria-hidden', 'true');
            }
            renderProfileList();
        }

        // 프로필 관리자 내용 렌더링 (XSS 방지)
        function renderProfileManagerContent() {
            const container = document.getElementById('profileManagerContent');
            if (!container) return;
            
            let contentHTML = '<div style="margin-bottom: 15px;">';
            
            profiles.forEach(profile => {
                const isCurrent = currentProfile && profile.id === currentProfile.id;
                const lastAccess = new Date(profile.lastAccess).toLocaleDateString('ko-KR');
                const goalCount = profile.bucketList.length;
                const completedCount = profile.bucketList.filter(goal => goal.completed).length;
                const safeName = escapeHtml(profile.name);
                
                contentHTML += `
                    <div style="background: ${isCurrent ? '#f0f9ff' : 'white'}; padding: 15px; border-radius: 8px; margin-bottom: 10px; border: ${isCurrent ? '2px solid #4facfe' : '1px solid #ddd'};">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <h4>${safeName} ${isCurrent ? '(현재 사용자)' : ''}</h4>
                                <p style="font-size: 0.8rem; color: #6c757d;">목표: ${goalCount}개 | 완료: ${completedCount}개 | 마지막 접속: ${lastAccess}</p>
                            </div>
                            <div>
                                ${!isCurrent ? `<button onclick="deleteProfile('${profile.id}')" class="btn-danger" style="padding: 4px 8px; font-size: 0.7rem; border-radius: 4px; border: none; cursor: pointer;" aria-label="${safeName} 프로필 삭제">삭제</button>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            });
            
            contentHTML += '</div>';
            
            contentHTML += `
                <div style="text-align: center; padding: 10px; background: #fff3cd; border-radius: 8px; color: #856404;">
                    ⚠️ 삭제된 프로필은 복구할 수 없습니다.<br>
                    중요한 데이터는 미리 백업하세요.
                </div>
            `;
            
            container.innerHTML = contentHTML;
        }

        // 프로필 삭제 (확인 강화)
        function deleteProfile(profileId) {
            const profile = profiles.find(p => p.id === profileId);
            if (!profile) return;
            
            const safeName = escapeHtml(profile.name);
            if (confirm(`정말로 "${safeName}" 프로필을 삭제하시겠습니까?\\n모든 목표가 함께 삭제됩니다.`)) {
                profiles = profiles.filter(p => p.id !== profileId);
                saveProfiles();
                renderProfileManagerContent();
                alert(`"${safeName}" 프로필이 삭제되었습니다.`);
            }
        }

        // 프로필 데이터 초기화 (확인 강화)
        function clearCurrentProfileData() {
            if (!currentProfile || isGuestMode) {
                alert('게스트 모드에서는 이 기능을 사용할 수 없습니다.');
                return;
            }

            const goalCount = currentProfile.bucketList.length;
            if (goalCount === 0) {
                alert('삭제할 목표가 없습니다.');
                return;
            }

            const safeName = escapeHtml(currentProfile.name);
            if (confirm(`정말로 "${safeName}"의 모든 목표(${goalCount}개)를 삭제하시겠습니까?\\n이 작업은 되돌릴 수 없습니다.`)) {
                if (confirm('마지막 확인: 정말로 모든 버킷리스트를 삭제하시겠습니까?')) {
                    currentProfile.bucketList = [];
                    currentProfile.lastAccess = new Date().toISOString();
                    saveProfiles();
                    
                    renderBucketList();
                    updateStats();
                    updateDataStats();
                    renderGallery();
                    renderProfileList();
                    
                    alert('모든 목표가 삭제되었습니다.');
                }
            }
        }

        // 현재 프로필 삭제 (확인 강화)
        function deleteCurrentProfile() {
            if (!currentProfile || isGuestMode) {
                alert('게스트 모드에서는 이 기능을 사용할 수 없습니다.');
                return;
            }

            const profileName = escapeHtml(currentProfile.name);
            const goalCount = currentProfile.bucketList.length;
            
            if (confirm(`"${profileName}" 프로필을 완전히 삭제하시겠습니까?\\n(목표 ${goalCount}개 포함)\\n\\n이 작업은 되돌릴 수 없습니다.`)) {
                if (confirm(`마지막 확인: "${profileName}" 프로필을 정말로 삭제하시겠습니까?`)) {
                    profiles = profiles.filter(p => p.id !== currentProfile.id);
                    saveProfiles();
                    
                    alert(`"${profileName}" 프로필이 삭제되었습니다.`);
                    
                    currentProfile = null;
                    showProfileSelector();
                }
            }
        }

        // 모든 프로필 삭제 (확인 강화)
        function clearAllProfiles() {
            const profileCount = profiles.length;
            const totalGoals = profiles.reduce((sum, profile) => sum + profile.bucketList.length, 0);
            
            if (profileCount === 0) {
                alert('삭제할 프로필이 없습니다.');
                return;
            }

            if (confirm(`정말로 모든 프로필(${profileCount}개)을 삭제하시겠습니까?\\n총 ${totalGoals}개의 목표가 함께 삭제됩니다.\\n\\n이 작업은 되돌릴 수 없습니다.`)) {
                if (confirm('마지막 확인: 정말로 모든 데이터를 삭제하시겠습니까?\\n\\n⚠️ 이 작업 후에는 모든 사용자 데이터가 사라집니다!')) {
                    if (confirm('최종 확인: 백업을 했는지 확인하셨나요?\\n정말로 모든 프로필을 삭제하시겠습니까?')) {
                        // 모든 관련 저장소 정리
                        safeLocalStorage('remove', 'bucketListProfiles');
                        safeLocalStorage('remove', 'bucketListProfiles_backup');
                        profiles = [];
                        currentProfile = null;
                        
                        alert('모든 프로필이 삭제되었습니다.');
                        showProfileSelector();
                    }
                }
            }
        }

        // 프로필 목록 렌더링 (XSS 방지)
        function renderProfileList() {
            const container = document.getElementById('profileList');
            if (!container) return;
            
            if (profiles.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: #6c757d;">저장된 프로필이 없습니다.</p>';
                return;
            }
            
            let listHTML = '';
            profiles.forEach(profile => {
                const isCurrent = currentProfile && profile.id === currentProfile.id;
                const lastAccess = new Date(profile.lastAccess).toLocaleDateString('ko-KR');
                const goalCount = profile.bucketList.length;
                const completedCount = profile.bucketList.filter(goal => goal.completed).length;
                const safeName = escapeHtml(profile.name);
                
                listHTML += `
                    <div class="profile-item ${isCurrent ? 'current' : ''}">
                        <h4>${safeName} ${isCurrent ? '(현재)' : ''}</h4>
                        <p>목표: ${goalCount}개 | 완료: ${completedCount}개</p>
                        <p>마지막 접속: ${lastAccess}</p>
                    </div>
                `;
            });
            
            container.innerHTML = listHTML;
        }

        // 버킷리스트 렌더링 (성능 최적화)
        function renderBucketList() {
            if (!currentProfile) return;
            
            performance.mark('renderBucketList-start');
            
            const container = document.getElementById('bucketList');
            if (!container) return;
            
            const filteredList = currentFilter === 'all' 
                ? currentProfile.bucketList 
                : currentProfile.bucketList.filter(goal => goal.category === currentFilter);

            // 캐시 확인
            const currentState = JSON.stringify({
                filter: currentFilter,
                list: filteredList.map(goal => ({ id: goal.id, text: goal.text, completed: goal.completed, image: !!goal.image }))
            });
            
            if (currentState === lastFilterState) {
                return; // 변경사항 없으면 렌더링 스킵
            }
            
            lastFilterState = currentState;

            if (filteredList.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <h3>목표가 없습니다</h3>
                        <p>${currentFilter === 'all' ? '첫 번째 버킷리스트를 추가해보세요!' : '이 카테고리에 목표를 추가해보세요!'}</p>
                    </div>
                `;
                return;
            }

            // Fragment 사용으로 성능 최적화
            const fragment = document.createDocumentFragment();
            
            filteredList.forEach(goal => {
                const div = document.createElement('div');
                div.className = `bucket-item ${goal.category} ${goal.completed ? 'completed' : ''}`;
                div.setAttribute('data-goal-id', goal.id);
                
                const safeText = escapeHtml(goal.text);
                const safeNote = goal.completionNote ? escapeHtml(goal.completionNote) : '';
                
                div.innerHTML = `
                    <div class="item-image-container ${goal.image ? 'has-image' : ''}">
                        ${goal.image ? 
                            `<img src="${goal.image}" alt="목표 이미지" class="item-image" loading="lazy">
                             <button class="image-delete-btn" onclick="deleteImage(${goal.id})" title="사진 삭제" aria-label="사진 삭제">🗑️</button>` : 
                            `<div class="image-placeholder">📷</div>`
                        }
                    </div>
                    
                    <div class="item-content">
                        <div class="item-header">
                            <div class="item-title">${safeText}</div>
                            <div class="item-controls">
                                <button class="btn btn-small ${goal.completed ? 'btn-secondary' : 'btn-success'}" 
                                        onclick="toggleComplete(${goal.id})"
                                        title="${goal.completed ? '완료 취소' : '완료 표시'}"
                                        aria-label="${goal.completed ? '완료 취소' : '완료 표시'}">
                                    ${goal.completed ? '↩️' : '✅'}
                                </button>
                                <button class="btn btn-small btn-danger" 
                                        onclick="deleteGoal(${goal.id})"
                                        title="삭제"
                                        aria-label="목표 삭제">🗑️</button>
                            </div>
                        </div>
                        
                        <div class="category-tag ${goal.category}">${categoryNames[goal.category]}</div>
                        
                        ${goal.completed && goal.completionNote ? `
                            <div class="completion-note">
                                <div class="completion-note-label">달성 후기</div>
                                <div class="completion-note-text">${safeNote}</div>
                                <div class="completion-date">달성일: ${new Date(goal.completedAt).toLocaleDateString('ko-KR')}</div>
                            </div>
                        ` : ''}
                        
                        ${goal.completed ? `
                            <div class="completed-controls">
                                <button class="btn-edit" onclick="editCompletedGoal(${goal.id})" aria-label="달성 정보 편집">
                                    ✏️ 편집
                                </button>
                                <button class="download-card-btn" onclick="showCardOptions(${goal.id})" aria-label="달성 카드 생성">
                                    🎯 달성 카드
                                </button>
                            </div>
                        ` : ''}
                        
                        <div class="image-upload-section ${goal.image ? 'has-image' : ''}">
                            <div class="upload-buttons">
                                <label class="upload-btn" for="file-${goal.id}" aria-label="${goal.image ? '사진 교체' : '사진 선택'}">
                                    📁 ${goal.image ? '교체' : '사진 선택'}
                                </label>
                                <button class="upload-btn camera" onclick="captureImage(${goal.id})" aria-label="${isMobile() ? '카메라로 촬영' : '웹캠으로 촬영'}">
                                    📷 ${isMobile() ? '카메라' : '촬영'}
                                </button>
                                ${goal.image ? `
                                    <button class="upload-btn btn-delete-image" onclick="deleteImage(${goal.id})" aria-label="사진 삭제">
                                        🗑️ 삭제
                                    </button>
                                ` : ''}
                            </div>
                            <input type="file" 
                                   id="file-${goal.id}"
                                   class="file-input"
                                   accept="image/*" 
                                   onchange="uploadImageFile(${goal.id}, this.files[0])">
                        </div>
                    </div>
                `;
                
                fragment.appendChild(div);
            });
            
            // 한 번에 DOM 업데이트
            container.innerHTML = '';
            container.appendChild(fragment);

            // 지연 로딩 적용
            setTimeout(() => {
                addLazyLoading();
            }, 0);
            
            performance.mark('renderBucketList-end');
            performance.measure('renderBucketList', 'renderBucketList-start', 'renderBucketList-end');
        }

        // 갤러리 렌더링 (성능 최적화)
        function renderGallery() {
            if (!currentProfile) return;
            
            const container = document.getElementById('galleryGrid');
            if (!container) return;
            
            const completedGoals = currentProfile.bucketList.filter(goal => goal.completed);
            const sortSelect = document.getElementById('gallerySort');
            const sortBy = sortSelect ? sortSelect.value : 'date-desc';

            let sortedGoals = [...completedGoals];
            switch (sortBy) {
                case 'date-desc':
                    sortedGoals.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
                    break;
                case 'date-asc':
                    sortedGoals.sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));
                    break;
                case 'category':
                    sortedGoals.sort((a, b) => a.category.localeCompare(b.category));
                    break;
            }

            if (sortedGoals.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <h3>완료된 목표가 없습니다</h3>
                        <p>첫 번째 목표를 달성해보세요!</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = sortedGoals.map(goal => {
                const safeText = escapeHtml(goal.text);
                const safeNote = goal.completionNote ? escapeHtml(goal.completionNote) : '';
                
                return `
                    <div class="gallery-item">
                        <div class="item-image-container">
                            ${goal.image ? 
                                `<img src="${goal.image}" alt="목표 이미지" class="item-image" loading="lazy">` : 
                                `<div class="image-placeholder">🎯</div>`
                            }
                        </div>
                        
                        <div class="item-content">
                            <div class="item-title">${safeText}</div>
                            <div class="category-tag ${goal.category}">${categoryNames[goal.category]}</div>
                            
                            ${goal.completionNote ? `
                                <div class="completion-note">
                                    <div class="completion-note-label">달성 후기</div>
                                    <div class="completion-note-text">${safeNote}</div>
                                </div>
                            ` : ''}
                            
                            <div class="completion-date">달성일: ${new Date(goal.completedAt).toLocaleDateString('ko-KR')}</div>
                            
                            <div class="completed-controls">
                                <button class="btn-edit" onclick="editCompletedGoal(${goal.id})" aria-label="달성 정보 편집">
                                    ✏️ 편집
                                </button>
                                <button class="download-card-btn" onclick="showCardOptions(${goal.id})" aria-label="달성 카드 생성">
                                    🎯 달성 카드
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            // 지연 로딩 적용
            setTimeout(() => {
                addLazyLoading();
            }, 0);
        }

        // 통계 업데이트 (최적화)
        function updateStats() {
            if (!currentProfile) return;
            
            const total = currentProfile.bucketList.length;
            const completed = currentProfile.bucketList.filter(goal => goal.completed).length;
            const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

            const elements = {
                total: document.getElementById('totalCount'),
                completed: document.getElementById('completedCount'),
                progress: document.getElementById('progressPercent')
            };

            // 배치 업데이트로 리플로우 최소화
            requestAnimationFrame(() => {
                if (elements.total) elements.total.textContent = total;
                if (elements.completed) elements.completed.textContent = completed;
                if (elements.progress) elements.progress.textContent = progress + '%';
            });
        }

        // 데이터 통계 업데이트 (최적화)
        function updateDataStats() {
            if (!currentProfile) return;
            
            const total = currentProfile.bucketList.length;
            const completed = currentProfile.bucketList.filter(goal => goal.completed).length;
            const dataSize = JSON.stringify(currentProfile.bucketList).length;
            const sizeInKB = Math.round(dataSize / 1024 * 100) / 100;
            
            const elements = {
                total: document.getElementById('dataStatsTotal'),
                completed: document.getElementById('dataStatsCompleted'),
                size: document.getElementById('dataStatsSize')
            };

            // 배치 업데이트로 리플로우 최소화
            requestAnimationFrame(() => {
                if (elements.total) elements.total.textContent = total;
                if (elements.completed) elements.completed.textContent = completed;
                if (elements.size) elements.size.textContent = sizeInKB + 'KB';
            });
        }

        // 전체 리스트 PDF 다운로드 (간소화된 버전)
        function downloadAsImage() {
            if (!currentProfile || currentProfile.bucketList.length === 0) {
                alert('다운로드할 목표가 없습니다.');
                return;
            }
            
            alert('PDF 다운로드 기능은 개발 중입니다.');
        }

        // 페이지 로드 시 초기화 (에러 처리 강화)
        window.addEventListener('load', function() {
            try {
                init();
            } catch (error) {
                console.error('앱 초기화 실패:', error);
                alert('앱을 초기화하는 중 오류가 발생했습니다. 페이지를 새로고침해주세요.');
            }
        });

        // 페이지 언로드 시 정리
        window.addEventListener('beforeunload', function() {
            // 타이머 정리
            clearTimeout(autoLogoutTimer);
            clearTimeout(autoLogoutWarningTimer);
            
            // 관찰자 정리
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
            
            // 현재 프로필 마지막 접속 시간 업데이트
            if (currentProfile && !isGuestMode) {
                currentProfile.lastAccess = new Date().toISOString();
                saveProfiles();
            }
        });

        // 버튼 이벤트 리스너들 (DOMContentLoaded에서 안전하게 등록)
        document.addEventListener('DOMContentLoaded', function() {
            const buttons = {
                settingsBtn: () => alert('이미지 설정 기능은 개발 중입니다.'),
                userSwitchBtn: showUserSwitch,
                finishBtn: finishSession,
                addGoalBtn: addGoal,
                cancelModalBtn: closeCompletionModal,
                saveModalBtn: saveCompletion,
                cancelNewUserBtn: cancelNewUser,
                createUserBtn: createNewUser,
                profileManagerBtn: showProfileManager,
                closeProfileManagerBtn: closeProfileManager,
                exportBtn: exportCurrentProfile,
                clearDataBtn: clearCurrentProfileData,
                deleteProfileBtn: deleteCurrentProfile,
                clearAllBtn: clearAllProfiles,
                downloadPdfBtn: downloadAsImage,
                installBtn: installPWA,
                extendBtn: () => {
                    resetAutoLogout();
                    alert('세션이 연장되었습니다.');
                }
            };

            // 버튼 이벤트 리스너 등록
            Object.entries(buttons).forEach(([id, handler]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.addEventListener('click', handler);
                }
            });

            // 파일 입력 이벤트
            const importBtn = document.getElementById('importBtn');
            const importFile = document.getElementById('importFile');
            
            if (importBtn && importFile) {
                importBtn.addEventListener('click', () => importFile.click());
                
                importFile.addEventListener('change', function(e) {
                    const file = e.target.files[0];
                    if (file) {
                        importData(file);
                        e.target.value = ''; // 파일 입력 초기화
                    }
                });
            }

            // 갤러리 정렬 이벤트
            const gallerySort = document.getElementById('gallerySort');
            if (gallerySort) {
                gallerySort.addEventListener('change', renderGallery);
            }

            // 탭 전환 이벤트 (이벤트 위임 사용)
            document.addEventListener('click', function(e) {
                const navTab = e.target.closest('.nav-tab');
                if (navTab && navTab.dataset.tab) {
                    switchTab(navTab.dataset.tab);
                }
            });
        });