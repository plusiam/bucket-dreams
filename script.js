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

        // 이미지 설정 불러오기 (안전한 기본값 복원 로직 강화)
        function loadImageSettings() {
            const saved = safeLocalStorage('get', 'imageSettings');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    
                    // 설정값 유효성 검사
                    const validated = validateImageSettings(parsed);
                    if (validated) {
                        return { ...defaultImageSettings, ...validated };
                    }
                    
                    console.warn('잘못된 이미지 설정 값 발견, 기본값 사용');
                    showSettingsFeedback('설정값에 문제가 있어 기본값을 사용합니다', 'warning');
                } catch (e) {
                    console.error('이미지 설정 로드 실패:', e);
                    showSettingsFeedback('설정 로드 실패, 기본값 사용', 'error');
                }
            }
            return { ...defaultImageSettings };
        }

        // 이미지 설정 유효성 검사
        function validateImageSettings(settings) {
            if (!settings || typeof settings !== 'object') return null;
            
            const validated = {};
            
            // 품질 검사 (0.1~1.0)
            if (typeof settings.quality === 'number' && settings.quality >= 0.1 && settings.quality <= 1.0) {
                validated.quality = settings.quality;
            }
            
            // 최대 너비 검사 (480~4096)
            if (typeof settings.maxWidth === 'number' && settings.maxWidth >= 480 && settings.maxWidth <= 4096) {
                validated.maxWidth = settings.maxWidth;
            }
            
            // 형식 검사
            if (typeof settings.format === 'string' && ['jpeg', 'webp', 'png'].includes(settings.format)) {
                validated.format = settings.format;
            }
            
            // 자동 압축 검사
            if (typeof settings.autoCompress === 'boolean') {
                validated.autoCompress = settings.autoCompress;
            }
            
            // 카메라 해상도 검사
            if (typeof settings.cameraResolution === 'string' && ['hd', 'fhd', '4k'].includes(settings.cameraResolution)) {
                validated.cameraResolution = settings.cameraResolution;
            }
            
            return validated;
        }

        // 이미지 설정 자동 저장 (강화된 오류 처리)
        function saveImageSettingsAuto() {
            try {
                const settingsToSave = { ...imageSettings };
                safeLocalStorage('set', 'imageSettings', JSON.stringify(settingsToSave));
                showSettingsFeedback('설정이 자동 저장되었습니다', 'success');
            } catch (e) {
                console.error('이미지 설정 자동 저장 실패:', e);
                showSettingsFeedback('설정 자동 저장 실패', 'error');
            }
        }

        // 설정 피드백 시스템
        function showSettingsFeedback(message, type = 'success') {
            // 기존 피드백 제거
            const existingFeedback = document.querySelector('.settings-feedback');
            if (existingFeedback) {
                existingFeedback.remove();
            }
            
            const feedback = document.createElement('div');
            feedback.className = `settings-feedback ${type}`;
            feedback.textContent = message;
            
            document.body.appendChild(feedback);
            
            // 애니메이션 표시
            setTimeout(() => {
                feedback.classList.add('show');
            }, 100);
            
            // 3초 후 자동 숨김
            setTimeout(() => {
                feedback.classList.remove('show');
                setTimeout(() => {
                    if (feedback.parentNode) {
                        feedback.parentNode.removeChild(feedback);
                    }
                }, 300);
            }, 3000);
        }

        // 파일 크기 예상 계산
        function calculateFileSizeEstimate() {
            const width = imageSettings.maxWidth;
            const quality = imageSettings.quality;
            const format = imageSettings.format;
            
            // 기본 계산 (예상 크기)
            let baseSizeKB;
            
            if (format === 'png') {
                // PNG: 무손실 압축, 크기가 큼
                baseSizeKB = (width * width * 0.75 * 3) / 1024; // RGB 3바이트 가정
            } else if (format === 'webp') {
                // WebP: 우수한 압축률
                baseSizeKB = (width * width * 0.5 * quality) / 1024;
            } else {
                // JPEG: 일반적인 압축률
                baseSizeKB = (width * width * 0.7 * quality) / 1024;
            }
            
            // 원본 예상 크기 (1920x1080 기준)
            const originalSizeKB = (1920 * 1080 * 3) / 1024;
            
            return {
                originalKB: Math.round(originalSizeKB),
                compressedKB: Math.round(baseSizeKB),
                ratio: Math.round((1 - (baseSizeKB / originalSizeKB)) * 100)
            };
        }

        // 파일 크기를 사람이 읽기 쉽은 형식으로 변환
        function formatFileSize(sizeKB) {
            if (sizeKB < 1024) {
                return Math.round(sizeKB) + 'KB';
            } else {
                return (sizeKB / 1024).toFixed(1) + 'MB';
            }
        }

        // 카메라 해상도에 따른 제약 조건
        function getCameraConstraints() {
            const resolutionMap = {
                'hd': { width: 1280, height: 720 },
                'fhd': { width: 1920, height: 1080 },
                '4k': { width: 3840, height: 2160 }
            };
            
            const res = resolutionMap[imageSettings.cameraResolution] || resolutionMap.hd;
            return {
                video: {
                    width: { ideal: res.width },
                    height: { ideal: res.height },
                    facingMode: 'environment'
                }
            };
        }

        // 이미지 압축 함수 (Canvas 사용) - 설정값 적용
        function compressImage(file, maxWidth = null, quality = null) {
            // 설정값 사용
            maxWidth = maxWidth || imageSettings.maxWidth;
            quality = quality || imageSettings.quality;
            
            // 자동 압축이 비활성화된 경우 원본 반환
            if (!imageSettings.autoCompress) {
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(file);
                });
            }
            
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
                    
                    // 압축된 데이터 URL 반환 (형식 설정 적용)
                    let format = 'image/jpeg';
                    if (imageSettings.format === 'webp') format = 'image/webp';
                    else if (imageSettings.format === 'png') format = 'image/png';
                    
                    resolve(canvas.toDataURL(format, quality));
                };
                
                img.src = URL.createObjectURL(file);
            });
        }

        // 이미지 설정 모달 관련 함수들
        function showImageSettings() {
            const modal = document.getElementById('imageSettingsModal');
            const qualitySlider = document.getElementById('qualitySlider');
            const maxWidthInput = document.getElementById('maxWidthInput');
            const formatSelect = document.getElementById('formatSelect');
            const autoCompressToggle = document.getElementById('autoCompressToggle');
            const cameraResolutionSelect = document.getElementById('cameraResolutionSelect');
            
            // 현재 설정값 로드
            qualitySlider.value = imageSettings.quality;
            maxWidthInput.value = imageSettings.maxWidth;
            formatSelect.value = imageSettings.format;
            autoCompressToggle.checked = imageSettings.autoCompress;
            cameraResolutionSelect.value = imageSettings.cameraResolution;
            
            updateImageSettingsPreview();
            
            modal.style.display = 'block';
            modal.setAttribute('aria-hidden', 'false');
            
            // 첫 번째 입력 요소에 포커스
            qualitySlider.focus();
        }

        function hideImageSettings() {
            const modal = document.getElementById('imageSettingsModal');
            modal.style.display = 'none';
            modal.setAttribute('aria-hidden', 'true');
        }

        function updateImageSettingsPreview() {
            const qualitySlider = document.getElementById('qualitySlider');
            const maxWidthInput = document.getElementById('maxWidthInput');
            const formatSelect = document.getElementById('formatSelect');
            const autoCompressToggle = document.getElementById('autoCompressToggle');
            
            const qualityValue = document.getElementById('qualityValue');
            const previewQuality = document.getElementById('previewQuality');
            const previewWidth = document.getElementById('previewWidth');
            const previewFormat = document.getElementById('previewFormat');
            const previewCompress = document.getElementById('previewCompress');
            
            // 슬라이더 값 표시
            if (qualityValue) qualityValue.textContent = qualitySlider.value;
            
            // 미리보기 업데이트
            if (previewQuality) previewQuality.textContent = qualitySlider.value;
            if (previewWidth) previewWidth.textContent = maxWidthInput.value + 'px';
            if (previewFormat) previewFormat.textContent = formatSelect.value.toUpperCase();
            if (previewCompress) previewCompress.textContent = autoCompressToggle.checked ? '활성화' : '비활성화';
            
            // 임시 설정값 업데이트 (자동 저장을 위해)
            const tempSettings = {
                quality: parseFloat(qualitySlider.value),
                maxWidth: parseInt(maxWidthInput.value),
                format: formatSelect.value,
                autoCompress: autoCompressToggle.checked
            };
            
            // 파일 크기 예상 계산 및 표시
            updateFileSizeEstimate(tempSettings);
            
            // 실시간 자동 저장 (디바운싱 적용)
            clearTimeout(updateImageSettingsPreview.debounceTimer);
            updateImageSettingsPreview.debounceTimer = setTimeout(() => {
                // 전역 설정값 업데이트
                imageSettings.quality = tempSettings.quality;
                imageSettings.maxWidth = tempSettings.maxWidth;
                imageSettings.format = tempSettings.format;
                imageSettings.autoCompress = tempSettings.autoCompress;
                
                // 자동 저장
                saveImageSettingsAuto();
            }, 1000); // 1초 후 자동 저장
        }
        
        // 파일 크기 예상 업데이트
        function updateFileSizeEstimate(settings = imageSettings) {
            const originalSizeEl = document.getElementById('originalSizeEstimate');
            const compressedSizeEl = document.getElementById('compressedSizeEstimate');
            const compressionRatioEl = document.getElementById('compressionRatio');
            
            if (!originalSizeEl || !compressedSizeEl || !compressionRatioEl) return;
            
            try {
                // 임시로 전역 설정 업데이트
                const originalSettings = { ...imageSettings };
                Object.assign(imageSettings, settings);
                
                const estimate = calculateFileSizeEstimate();
                
                originalSizeEl.textContent = formatFileSize(estimate.originalKB);
                compressedSizeEl.textContent = formatFileSize(estimate.compressedKB);
                compressionRatioEl.textContent = estimate.ratio + '%';
                
                // 압축률에 따른 색상 변경
                if (estimate.ratio > 70) {
                    compressionRatioEl.style.color = '#2ed573'; // 녹색 (좋음)
                } else if (estimate.ratio > 50) {
                    compressionRatioEl.style.color = '#ffa502'; // 주황색 (보통)
                } else {
                    compressionRatioEl.style.color = '#ff4757'; // 빨간색 (낮음)
                }
                
                // 원래 설정 복원
                Object.assign(imageSettings, originalSettings);
                
            } catch (e) {
                console.error('파일 크기 예상 계산 오류:', e);
                originalSizeEl.textContent = '오류';
                compressedSizeEl.textContent = '오류';
                compressionRatioEl.textContent = '오류';
            }
        }

        function saveImageSettings() {
            const qualitySlider = document.getElementById('qualitySlider');
            const maxWidthInput = document.getElementById('maxWidthInput');
            const formatSelect = document.getElementById('formatSelect');
            const autoCompressToggle = document.getElementById('autoCompressToggle');
            const cameraResolutionSelect = document.getElementById('cameraResolutionSelect');
            
            try {
                // 입력값 유효성 검사
                const newSettings = {
                    quality: parseFloat(qualitySlider.value),
                    maxWidth: parseInt(maxWidthInput.value),
                    format: formatSelect.value,
                    autoCompress: autoCompressToggle.checked,
                    cameraResolution: cameraResolutionSelect.value
                };
                
                const validated = validateImageSettings(newSettings);
                if (!validated || Object.keys(validated).length < 5) {
                    throw new Error('잘못된 설정값이 입력되었습니다.');
                }
                
                // 설정값 업데이트
                Object.assign(imageSettings, validated);
                
                // localStorage에 저장
                safeLocalStorage('set', 'imageSettings', JSON.stringify(imageSettings));
                
                showSettingsFeedback('이미지 설정이 저장되었습니다!', 'success');
                
                hideImageSettings();
                
            } catch (e) {
                console.error('이미지 설정 저장 실패:', e);
                showSettingsFeedback('설정 저장 중 오류가 발생했습니다: ' + e.message, 'error');
            }
        }

        function resetImageSettings() {
            if (confirm('이미지 설정을 기본값으로 되돌리시겠습니까?')) {
                try {
                    // 기본값으로 복원
                    imageSettings = { ...defaultImageSettings };
                    
                    // localStorage에서 삭제
                    safeLocalStorage('remove', 'imageSettings');
                    
                    // 모달 새로고침
                    showImageSettings();
                    
                    showSettingsFeedback('설정이 기본값으로 복원되었습니다', 'success');
                } catch (e) {
                    console.error('설정 초기화 오류:', e);
                    showSettingsFeedback('설정 초기화 실패', 'error');
                }
            }
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

        // 이미지 설정 기본값
        const defaultImageSettings = {
            quality: 0.8,           // 압축 품질 (0.1~1.0)
            maxWidth: 1200,         // 최대 너비 (px)
            format: 'jpeg',         // 저장 형식 (jpeg/webp)
            autoCompress: true,     // 자동 압축 여부
            cameraResolution: 'hd'  // 카메라 해상도 (hd/fhd/4k)
        };

        // 사용자 이미지 설정 (localStorage에서 불러오기)
        let imageSettings = loadImageSettings();

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

        // PWA 설정 (개선된 버전) - 상대 경로 사용
        function setupPWA() {
            if ('serviceWorker' in navigator) {
                // Service Worker 등록 (상대 경로 사용)
                navigator.serviceWorker.register('./sw.js')
                    .then(registration => {
                        console.log('SW registered successfully:', registration.scope);
                        
                        // 업데이트 확인
                        registration.addEventListener('updatefound', () => {
                            console.log('SW: New version found');
                            const newWorker = registration.installing;
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    console.log('SW: New version installed');
                                    // 사용자에게 새 버전 알림 (선택사항)
                                    if (confirm('새 버전이 있습니다. 업데이트하시겠습니까?')) {
                                        newWorker.postMessage({ type: 'SKIP_WAITING' });
                                        window.location.reload();
                                    }
                                }
                            });
                        });
                    })
                    .catch(error => {
                        console.error('SW registration failed:', error);
                    });
                
                // Service Worker 메시지 수신
                navigator.serviceWorker.addEventListener('message', event => {
                    if (event.data && event.data.type === 'CACHE_UPDATED') {
                        console.log('SW: Cache updated');
                    }
                });
                
                // 페이지 로드 시 Service Worker 컨트롤러 확인
                if (navigator.serviceWorker.controller) {
                    console.log('SW: Page is controlled by service worker');
                } else {
                    console.log('SW: Page is not controlled by service worker');
                }
            } else {
                console.log('SW: Service Worker not supported');
            }

            // PWA 설치 가능성 체크
            const checkPWAInstallability = () => {
                // 기본 PWA 요구사항 체크
                const isHTTPS = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
                const hasManifest = document.querySelector('link[rel="manifest"]') !== null;
                const hasSW = 'serviceWorker' in navigator;
                
                console.log('PWA 설치 가능성 체크:', {
                    isHTTPS,
                    hasManifest,
                    hasSW,
                    userAgent: navigator.userAgent
                });
                
                return isHTTPS && hasManifest && hasSW;
            };
            
            // PWA 설치 프롬프트
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                deferredPrompt = e;
                console.log('PWA 설치 프롬프트 이벤트 수신');
                
                const installBtn = document.getElementById('installBtn');
                if (installBtn) {
                    installBtn.style.display = 'block';
                    installBtn.setAttribute('aria-hidden', 'false');
                    console.log('설치 버튼 활성화');
                }
            });
            
            // PWA 설치 가능성 체크 실행
            if (checkPWAInstallability()) {
                console.log('PWA 설치 조건 만족');
            } else {
                console.log('PWA 설치 조건 불만족');
            }

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
                        <button onclick="generateSNSCard(${goalId}, 'instagram-story'); this.closest('div').parentElement.parentElement.remove()" style="
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
                        
                        <button onclick="generateSNSCard(${goalId}, 'instagram-square'); this.closest('div').parentElement.parentElement.remove()" style="
                            padding: 15px;
                            background: linear-gradient(45deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%);
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
                        " aria-label="인스타그램 피드용 정사각형 카드 생성">
                            <span style="font-size: 1.2rem;">🟦</span>
                            인스타그램 피드 (1:1)
                        </button>
                        
                        <button onclick="generateSNSCard(${goalId}, 'facebook'); this.closest('div').parentElement.parentElement.remove()" style="
                            padding: 15px;
                            background: linear-gradient(45deg, #3b5998 0%, #8b9dc3 100%);
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
                        " aria-label="페이스북용 카드 생성">
                            <span style="font-size: 1.2rem;">📘</span>
                            페이스북 (1.91:1)
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

        // SNS 카드 생성 (개선된 버전) - 정확한 영역 캡처
        async function generateSNSCard(goalId, platform) {
            if (!currentProfile) {
                showCardError('프로필을 찾을 수 없습니다.');
                return;
            }
            
            const goal = currentProfile.bucketList.find(g => g.id === goalId);
            if (!goal || !goal.completed) {
                showCardError('완료된 목표가 아닙니다.');
                return;
            }

            let tempContainer = null;
            
            try {
                showCardLoading(true);
                
                // 개선된 카드 요소 생성
                const cardElement = await createCardElementFixed(goal, platform);
                
                // 임시 컨테이너 생성 및 DOM에 추가
                tempContainer = document.createElement('div');
                tempContainer.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    z-index: 10000;
                    opacity: 0;
                    pointer-events: none;
                    background: white;
                    border-radius: 20px;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    overflow: hidden;
                `;
                tempContainer.appendChild(cardElement);
                document.body.appendChild(tempContainer);
                
                // 렌더링 완료 대기
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // HTML2Canvas로 카드만 정확히 캡처
                const canvas = await html2canvas(cardElement, {
                    backgroundColor: '#ffffff',
                    scale: 2,
                    useCORS: true,
                    allowTaint: true,
                    logging: false,
                    width: cardElement.offsetWidth,
                    height: cardElement.offsetHeight,
                    windowWidth: cardElement.offsetWidth,
                    windowHeight: cardElement.offsetHeight,
                    x: 0,
                    y: 0,
                    scrollX: 0,
                    scrollY: 0
                });
                
                // PNG로 변환 및 다운로드
                const link = document.createElement('a');
                const filename = `${goal.text.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_${platform}_카드.png`;
                link.download = filename;
                link.href = canvas.toDataURL('image/png', 0.95);
                
                // 다운로드 실행
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                showCardSuccess(`${getPlatformDisplayName(platform)} 카드가 다운로드되었습니다!`);
                
            } catch (error) {
                console.error('카드 생성 오류:', error);
                showCardError(`카드 생성 중 오류가 발생했습니다: ${error.message}`);
            } finally {
                // 임시 컨테이너 정리
                if (tempContainer && document.body.contains(tempContainer)) {
                    document.body.removeChild(tempContainer);
                }
                showCardLoading(false);
            }
        }

        // 플랫폼별 카드 크기 반환
        function getDimensionsByPlatform(platform) {
            const platformDimensions = {
                'instagram-story': { width: 405, height: 720 },      // 9:16 비율
                'instagram-square': { width: 600, height: 600 },     // 1:1 비율
                'facebook': { width: 764, height: 400 },             // 1.91:1 비율
                'default': { width: 400, height: 600 }               // 2:3 비율
            };
            return platformDimensions[platform] || platformDimensions['default'];
        }

        // 플랫폼 표시명 반환
        function getPlatformDisplayName(platform) {
            const platformNames = {
                'instagram-story': '인스타그램 스토리',
                'instagram-square': '인스타그램 피드',
                'facebook': '페이스북',
                'default': '기본'
            };
            return platformNames[platform] || '기본';
        }

        // 플랫폼별 레이아웃 설정
        function getLayoutConfig(platform, dimensions) {
            const configs = {
                'instagram-story': {
                    headerPadding: '25px 30px 20px',
                    bodyPadding: '20px 30px',
                    footerPadding: '20px 30px',
                    imageHeight: Math.min(300, dimensions.height * 0.4),
                    titleSize: '1.4rem',
                    noteSize: '0.95rem'
                },
                'instagram-square': {
                    headerPadding: '30px 35px 25px',
                    bodyPadding: '25px 35px',
                    footerPadding: '25px 35px',
                    imageHeight: Math.min(250, dimensions.height * 0.4),
                    titleSize: '1.5rem',
                    noteSize: '1rem'
                },
                'facebook': {
                    headerPadding: '20px 25px 15px',
                    bodyPadding: '15px 25px',
                    footerPadding: '15px 25px',
                    imageHeight: Math.min(150, dimensions.height * 0.35),
                    titleSize: '1.3rem',
                    noteSize: '0.9rem'
                },
                'default': {
                    headerPadding: '25px 30px 20px',
                    bodyPadding: '25px 30px',
                    footerPadding: '20px 30px',
                    imageHeight: Math.min(300, dimensions.height * 0.4),
                    titleSize: '1.5rem',
                    noteSize: '1rem'
                }
            };
            return configs[platform] || configs['default'];
        }

        // 스마트 이미지 크롭 함수
        function getSmartImageStyle(imageUrl, containerWidth, containerHeight) {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = function() {
                    const imgRatio = this.width / this.height;
                    const containerRatio = containerWidth / containerHeight;
                    
                    let style = {
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: 'center'
                    };
                    
                    // 이미지 비율에 따른 스마트 크롭 포지션 조정
                    if (imgRatio > containerRatio) {
                        // 이미지가 더 넓은 경우 (가로가 긴 이미지)
                        if (containerRatio < 1) {
                            // 세로 컨테이너에 가로 이미지 - 중앙 정렬
                            style.objectPosition = 'center center';
                        } else {
                            // 가로 컨테이너에 가로 이미지 - 중앙 정렬
                            style.objectPosition = 'center center';
                        }
                    } else {
                        // 이미지가 더 높은 경우 (세로가 긴 이미지)
                        if (containerRatio < 1) {
                            // 세로 컨테이너에 세로 이미지 - 상단 정렬
                            style.objectPosition = 'center top';
                        } else {
                            // 가로 컨테이너에 세로 이미지 - 중앙 정렬
                            style.objectPosition = 'center center';
                        }
                    }
                    
                    // 페이스북 카드의 경우 특별 처리
                    if (containerRatio > 1.5) {
                        style.objectPosition = 'center center';
                    }
                    
                    resolve(style);
                };
                img.onerror = function() {
                    resolve({
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: 'center'
                    });
                };
                img.src = imageUrl;
            });
        }

        // 개선된 카드 요소 생성 함수 - 독립적인 요소 생성
        async function createCardElementFixed(goal, platform) {
            // 플랫폼별 카드 크기 설정
            const dimensions = getDimensionsByPlatform(platform);
            
            // 플랫폼별 레이아웃 조정
            const layoutConfig = getLayoutConfig(platform, dimensions);
            
            // 이미지 스타일 계산 (스마트 크롭)
            let imageStyle = {};
            if (goal.image) {
                imageStyle = await getSmartImageStyle(goal.image, dimensions.width, layoutConfig.imageHeight);
            }
            
            // 카드 요소 직접 생성
            const cardElement = document.createElement('div');
            cardElement.className = `achievement-card ${goal.category}`;
            cardElement.style.cssText = `
                width: ${dimensions.width}px;
                height: ${dimensions.height}px;
                border-radius: 20px;
                overflow: hidden;
                background: white;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                position: relative;
            `;
            
            // 카테고리별 배경 그라데이션 설정
            const categoryStyles = {
                'travel': 'linear-gradient(135deg, #E3F2FD 0%, #F3E5F5 100%)',
                'hobby': 'linear-gradient(135deg, #E8F5E9 0%, #F1F8E9 100%)',
                'career': 'linear-gradient(135deg, #EDE7F6 0%, #F3E5F5 100%)',
                'relationship': 'linear-gradient(135deg, #FFF8E1 0%, #FFEBEE 100%)',
                'health': 'linear-gradient(135deg, #E0F7FA 0%, #FFF9C4 100%)',
                'other': 'linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 100%)'
            };
            cardElement.style.background = categoryStyles[goal.category] || categoryStyles['other'];
            
            // 상단 액센트 바
            const accentBar = document.createElement('div');
            accentBar.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 5px;
                background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
                z-index: 10;
            `;
            cardElement.appendChild(accentBar);
            
            // 카드 콘텐츠 컨테이너
            const contentContainer = document.createElement('div');
            contentContainer.style.cssText = `
                position: relative;
                z-index: 2;
                height: 100%;
                display: flex;
                flex-direction: column;
                padding: 0;
            `;
            
            // 헤더 생성
            const header = document.createElement('div');
            header.style.cssText = `
                padding: ${layoutConfig.headerPadding};
                text-align: left;
                background: white;
            `;
            header.innerHTML = `
                <div style="font-size: ${layoutConfig.titleSize}; font-weight: 700; margin-bottom: 8px; color: #1a1a1a; line-height: 1.3;">${escapeHtml(goal.text)}</div>
                <div style="font-size: 0.85rem; font-weight: 600; color: #666; margin-bottom: 5px;">${getCategoryDisplayName(goal.category)}</div>
                <div style="font-size: 0.9rem; color: #666;">달성일: ${formatDate(goal.completedDate)}</div>
            `;
            contentContainer.appendChild(header);
            
            // 이미지 컨테이너 (있는 경우)
            if (goal.image) {
                const imageContainer = document.createElement('div');
                imageContainer.style.cssText = `
                    height: ${layoutConfig.imageHeight}px;
                    overflow: hidden;
                    background: #f5f5f5;
                `;
                
                const img = document.createElement('img');
                img.src = goal.image;
                img.alt = '달성 인증 사진';
                img.style.cssText = `
                    width: ${imageStyle.width || '100%'};
                    height: ${imageStyle.height || '100%'};
                    object-fit: ${imageStyle.objectFit || 'cover'};
                    object-position: ${imageStyle.objectPosition || 'center'};
                `;
                
                imageContainer.appendChild(img);
                contentContainer.appendChild(imageContainer);
                
                // 이미지 로딩 대기
                await new Promise((resolve, reject) => {
                    if (img.complete) {
                        resolve();
                    } else {
                        img.onload = resolve;
                        img.onerror = reject;
                        setTimeout(resolve, 3000); // 3초 타임아웃
                    }
                });
            }
            
            // 본문 생성
            const body = document.createElement('div');
            body.style.cssText = `
                flex: 1;
                padding: ${layoutConfig.bodyPadding};
                background: white;
                display: flex;
                flex-direction: column;
            `;
            
            if (goal.note) {
                const note = document.createElement('div');
                note.style.cssText = `
                    font-size: ${layoutConfig.noteSize};
                    line-height: 1.6;
                    color: #333;
                    font-style: italic;
                    margin-bottom: 20px;
                `;
                note.textContent = `"${goal.note}"`;
                body.appendChild(note);
            }
            
            contentContainer.appendChild(body);
            
            // 푸터 생성
            const footer = document.createElement('div');
            footer.style.cssText = `
                padding: ${layoutConfig.footerPadding};
                background: white;
                border-top: 1px solid #f0f0f0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;
            footer.innerHTML = `
                <div>
                    <div style="font-size: 1.1rem; font-weight: 600; color: #1a1a1a; margin-bottom: 2px;">${escapeHtml(currentProfile.name)}</div>
                    <div style="font-size: 0.85rem; color: #666;">버킷리스트 달성</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 1rem; font-weight: 600; color: #4facfe; margin-bottom: 2px;">🎯 Bucket Dreams</div>
                    <div style="font-size: 0.8rem; color: #888;">나의 버킷리스트</div>
                </div>
            `;
            contentContainer.appendChild(footer);
            
            cardElement.appendChild(contentContainer);
            
            return cardElement;
        }

        // 기존 카드 요소 생성 함수 (하위 호환성)
        async function createCardElement(goal, platform) {
            return await createCardElementFixed(goal, platform);
        }

        // 카테고리 표시명 반환
        function getCategoryDisplayName(category) {
            const categories = {
                'travel': '🌍 여행',
                'hobby': '🎨 취미',
                'career': '💼 커리어',
                'relationship': '👥 인간관계',
                'health': '💪 건강',
                'other': '✨ 기타'
            };
            return categories[category] || '✨ 기타';
        }

        // 날짜 포맷팅
        function formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }

        // 개선된 카드 로딩 상태 표시
        function showCardLoading(isLoading) {
            let loadingElement = document.getElementById('cardLoadingIndicator');
            
            if (isLoading) {
                if (!loadingElement) {
                    loadingElement = document.createElement('div');
                    loadingElement.id = 'cardLoadingIndicator';
                    loadingElement.innerHTML = `
                        <div style="
                            position: fixed;
                            top: 0;
                            left: 0;
                            width: 100%;
                            height: 100%;
                            background: rgba(0, 0, 0, 0.7);
                            z-index: 15000;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            backdrop-filter: blur(8px);
                        ">
                            <div style="
                                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                padding: 40px;
                                border-radius: 20px;
                                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
                                text-align: center;
                                color: white;
                                min-width: 300px;
                            ">
                                <div style="
                                    width: 60px;
                                    height: 60px;
                                    border: 4px solid rgba(255, 255, 255, 0.3);
                                    border-top: 4px solid white;
                                    border-radius: 50%;
                                    animation: spin 1s linear infinite;
                                    margin: 0 auto 20px;
                                "></div>
                                <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">
                                    🎯 카드 생성 중
                                </div>
                                <div style="font-size: 14px; opacity: 0.9; line-height: 1.4;">
                                    고품질 이미지를 생성하고 있습니다<br>
                                    잠시만 기다려주세요...
                                </div>
                                <div style="
                                    width: 100%;
                                    height: 4px;
                                    background: rgba(255, 255, 255, 0.3);
                                    border-radius: 2px;
                                    margin-top: 20px;
                                    overflow: hidden;
                                ">
                                    <div style="
                                        width: 100%;
                                        height: 100%;
                                        background: linear-gradient(90deg, transparent 0%, white 50%, transparent 100%);
                                        animation: progress 2s ease-in-out infinite;
                                    "></div>
                                </div>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(loadingElement);
                }
                loadingElement.style.display = 'block';
                
                // 접근성: 스크린 리더에 알림
                const announcement = document.createElement('div');
                announcement.setAttribute('aria-live', 'polite');
                announcement.setAttribute('aria-atomic', 'true');
                announcement.className = 'sr-only';
                announcement.textContent = '카드 생성을 시작합니다';
                document.body.appendChild(announcement);
                setTimeout(() => document.body.removeChild(announcement), 1000);
                
            } else {
                if (loadingElement) {
                    loadingElement.style.display = 'none';
                }
            }
        }

        // 개선된 카드 성공 알림
        function showCardSuccess(message) {
            const successElement = document.createElement('div');
            successElement.innerHTML = `
                <div style="
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: linear-gradient(135deg, #28a745, #20c997);
                    color: white;
                    padding: 20px 25px;
                    border-radius: 12px;
                    box-shadow: 0 10px 40px rgba(40, 167, 69, 0.4);
                    z-index: 15001;
                    min-width: 300px;
                    backdrop-filter: blur(10px);
                    animation: slideInRight 0.4s ease-out;
                ">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="
                            width: 40px;
                            height: 40px;
                            background: rgba(255, 255, 255, 0.2);
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 20px;
                        ">✅</div>
                        <div style="flex: 1;">
                            <div style="font-size: 16px; font-weight: 600; margin-bottom: 4px;">
                                카드 생성 완료!
                            </div>
                            <div style="font-size: 14px; opacity: 0.9;">
                                ${message}
                            </div>
                        </div>
                        <button onclick="this.parentElement.parentElement.remove()" style="
                            background: none;
                            border: none;
                            color: white;
                            font-size: 18px;
                            cursor: pointer;
                            padding: 5px;
                            opacity: 0.7;
                        ">×</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(successElement);
            
            // 접근성: 스크린 리더에 알림
            const announcement = document.createElement('div');
            announcement.setAttribute('aria-live', 'polite');
            announcement.className = 'sr-only';
            announcement.textContent = `성공: ${message}`;
            document.body.appendChild(announcement);
            setTimeout(() => document.body.removeChild(announcement), 1000);
            
            // 자동 제거
            setTimeout(() => {
                if (document.body.contains(successElement)) {
                    successElement.style.animation = 'slideOutRight 0.3s ease-in';
                    setTimeout(() => {
                        if (document.body.contains(successElement)) {
                            document.body.removeChild(successElement);
                        }
                    }, 300);
                }
            }, 5000);
        }

        // 개선된 카드 에러 알림
        function showCardError(message) {
            const errorElement = document.createElement('div');
            errorElement.innerHTML = `
                <div style="
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: linear-gradient(135deg, #dc3545, #c82333);
                    color: white;
                    padding: 20px 25px;
                    border-radius: 12px;
                    box-shadow: 0 10px 40px rgba(220, 53, 69, 0.4);
                    z-index: 15001;
                    min-width: 300px;
                    backdrop-filter: blur(10px);
                    animation: slideInRight 0.4s ease-out;
                ">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="
                            width: 40px;
                            height: 40px;
                            background: rgba(255, 255, 255, 0.2);
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 20px;
                        ">⚠️</div>
                        <div style="flex: 1;">
                            <div style="font-size: 16px; font-weight: 600; margin-bottom: 4px;">
                                카드 생성 실패
                            </div>
                            <div style="font-size: 14px; opacity: 0.9; line-height: 1.3;">
                                ${message}
                            </div>
                        </div>
                        <button onclick="this.parentElement.parentElement.remove()" style="
                            background: none;
                            border: none;
                            color: white;
                            font-size: 18px;
                            cursor: pointer;
                            padding: 5px;
                            opacity: 0.7;
                        ">×</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(errorElement);
            
            // 접근성: 스크린 리더에 알림
            const announcement = document.createElement('div');
            announcement.setAttribute('aria-live', 'assertive');
            announcement.className = 'sr-only';
            announcement.textContent = `오류: ${message}`;
            document.body.appendChild(announcement);
            setTimeout(() => document.body.removeChild(announcement), 1000);
            
            // 자동 제거
            setTimeout(() => {
                if (document.body.contains(errorElement)) {
                    errorElement.style.animation = 'slideOutRight 0.3s ease-in';
                    setTimeout(() => {
                        if (document.body.contains(errorElement)) {
                            document.body.removeChild(errorElement);
                        }
                    }, 300);
                }
            }, 6000);
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
                settingsBtn: showImageSettings,
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
            
            // 이미지 설정 모달 실시간 업데이트 이벤트
            const qualitySlider = document.getElementById('qualitySlider');
            const maxWidthInput = document.getElementById('maxWidthInput');
            const formatSelect = document.getElementById('formatSelect');
            const autoCompressToggle = document.getElementById('autoCompressToggle');
            
            if (qualitySlider) {
                qualitySlider.addEventListener('input', updateImageSettingsPreview);
            }
            if (maxWidthInput) {
                maxWidthInput.addEventListener('input', updateImageSettingsPreview);
            }
            if (formatSelect) {
                formatSelect.addEventListener('change', updateImageSettingsPreview);
            }
            if (autoCompressToggle) {
                autoCompressToggle.addEventListener('change', updateImageSettingsPreview);
            }
            
            // 모달 외부 클릭 시 닫기
            const imageSettingsModal = document.getElementById('imageSettingsModal');
            if (imageSettingsModal) {
                imageSettingsModal.addEventListener('click', function(e) {
                    if (e.target === imageSettingsModal) {
                        hideImageSettings();
                    }
                });
            }
            
            // ESC 키로 모달 닫기
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    const modal = document.getElementById('imageSettingsModal');
                    if (modal && modal.style.display === 'block') {
                        hideImageSettings();
                    }
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
