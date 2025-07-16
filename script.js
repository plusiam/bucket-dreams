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

        // ========== 감정과 동기 추적 시스템 ==========
        
        // 감정 기반 꿈 관리 시스템
        const EmotionalJourney = {
            // 꿈에 대한 감정 상태 기록
            addEmotionalEntry(goalId, emotion, motivation, energy) {
                const entry = {
                    date: new Date().toISOString(),
                    emotion: emotion, // excited, anxious, determined, overwhelmed
                    motivation: motivation, // 1-10 스케일
                    energy: energy, // 1-10 스케일
                    note: ''
                };
                
                // 목표에 감정 데이터 추가
                const goal = currentProfile.bucketList.find(g => g.id === goalId);
                if (goal) {
                    goal.emotionalJourney = goal.emotionalJourney || [];
                    goal.emotionalJourney.push(entry);
                }
            },
            
            // 개인 맞춤형 동기부여 메시지
            getMotivationalMessage(goal) {
                const messages = {
                    travel: [
                        "새로운 세상이 당신을 기다리고 있어요! ✈️",
                        "모든 여행은 자신을 발견하는 여정입니다 🌍",
                        "꿈꾸던 그 곳에서의 추억을 만들어보세요 📸"
                    ],
                    hobby: [
                        "새로운 기술은 새로운 즐거움을 선사해요 🎨",
                        "취미는 마음의 정원을 가꾸는 일이에요 🌱",
                        "오늘 조금이라도 연습해보세요! 🎵"
                    ],
                    career: [
                        "꾸준한 노력이 큰 변화를 만들어요 💪",
                        "당신의 가능성은 무한합니다 🚀",
                        "한 걸음씩, 꿈에 다가가고 있어요 📈"
                    ],
                    relationship: [
                        "진정한 관계는 서로를 성장시켜요 👥",
                        "소중한 사람들과의 시간을 만들어보세요 💝",
                        "마음을 나누는 것이 가장 아름다운 선물이에요 🤝"
                    ],
                    health: [
                        "건강한 몸은 꿈을 실현하는 기반이에요 💪",
                        "오늘의 작은 운동이 큰 변화를 만들어요 🏃‍♀️",
                        "자신을 돌보는 것도 꿈의 일부입니다 🧘‍♂️"
                    ],
                    other: [
                        "모든 꿈은 첫 번째 걸음에서 시작됩니다 ✨",
                        "당신의 특별한 꿈이 세상을 더 아름답게 만들어요 🌟",
                        "독특한 목표일수록 더 의미 있는 여정이 될 거예요 🎯"
                    ]
                };
                
                const categoryMessages = messages[goal.category] || messages.other;
                return categoryMessages[Math.floor(Math.random() * categoryMessages.length)];
            },

            // 감정 패턴 분석
            analyzeEmotionalPattern(goal) {
                if (!goal.emotionalJourney || goal.emotionalJourney.length === 0) {
                    return {
                        dominantEmotion: 'neutral',
                        motivationTrend: 'stable',
                        energyTrend: 'stable',
                        recommendation: '감정을 기록해보세요!'
                    };
                }

                const journey = goal.emotionalJourney;
                const recentEntries = journey.slice(-5); // 최근 5개 항목

                // 감정 빈도 계산
                const emotionCount = {};
                recentEntries.forEach(entry => {
                    emotionCount[entry.emotion] = (emotionCount[entry.emotion] || 0) + 1;
                });

                const dominantEmotion = Object.keys(emotionCount).reduce((a, b) => 
                    emotionCount[a] > emotionCount[b] ? a : b
                );

                // 동기와 에너지 트렌드 분석
                const motivationTrend = this.calculateTrend(recentEntries.map(e => e.motivation));
                const energyTrend = this.calculateTrend(recentEntries.map(e => e.energy));

                return {
                    dominantEmotion,
                    motivationTrend,
                    energyTrend,
                    recommendation: this.getEmotionalRecommendation(dominantEmotion, motivationTrend, energyTrend)
                };
            },

            // 트렌드 계산 (상승/하강/안정)
            calculateTrend(values) {
                if (values.length < 2) return 'stable';
                
                const first = values.slice(0, Math.ceil(values.length / 2));
                const last = values.slice(Math.floor(values.length / 2));
                
                const firstAvg = first.reduce((a, b) => a + b) / first.length;
                const lastAvg = last.reduce((a, b) => a + b) / last.length;
                
                const diff = lastAvg - firstAvg;
                if (diff > 0.5) return 'rising';
                if (diff < -0.5) return 'falling';
                return 'stable';
            },

            // 감정 기반 추천
            getEmotionalRecommendation(emotion, motivationTrend, energyTrend) {
                const recommendations = {
                    'excited': '설렘을 행동으로 옮겨보세요! 🚀',
                    'anxious': '작은 단계부터 천천히 시작해보세요 🌱',
                    'determined': '이 결단력을 유지하며 꾸준히 나아가세요 💪',
                    'overwhelmed': '목표를 더 작은 단위로 나누어보는 건 어떨까요? 🧩',
                    'motivated': '이 동기를 활용해 구체적인 계획을 세워보세요 📋',
                    'hopeful': '희망을 현실로 만들 첫 번째 행동을 정해보세요 ✨'
                };

                let recommendation = recommendations[emotion] || '감정을 인정하고 받아들이는 것부터 시작해보세요 🤗';

                // 트렌드 기반 추가 조언
                if (motivationTrend === 'falling' || energyTrend === 'falling') {
                    recommendation += ' 잠시 휴식을 취하고 다시 시작하는 것도 괜찮아요 😌';
                } else if (motivationTrend === 'rising' && energyTrend === 'rising') {
                    recommendation += ' 지금이 목표에 집중하기 좋은 때입니다! 🔥';
                }

                return recommendation;
            },

            // 동기 지수 계산
            calculateMotivationIndex() {
                if (!currentProfile || !currentProfile.bucketList) return 0;

                let totalMotivation = 0;
                let totalEntries = 0;

                currentProfile.bucketList.forEach(goal => {
                    if (goal.emotionalJourney && goal.emotionalJourney.length > 0) {
                        // 최근 3개 항목의 평균 동기 수준
                        const recentEntries = goal.emotionalJourney.slice(-3);
                        const avgMotivation = recentEntries.reduce((sum, entry) => 
                            sum + entry.motivation, 0) / recentEntries.length;
                        totalMotivation += avgMotivation;
                        totalEntries++;
                    }
                });

                return totalEntries > 0 ? Math.round(totalMotivation / totalEntries) : 5;
            }
        };

        // ========== AI 기반 꿈 추천 엔진 ==========
        
        // 스마트 꿈 추천 시스템
        const DreamRecommendationEngine = {
            // 사용자 패턴 분석
            analyzeUserPatterns(profile) {
                const completedGoals = profile.bucketList.filter(g => g.completed);
                const activeGoals = profile.bucketList.filter(g => !g.completed);
                
                return {
                    preferredCategories: this.getPreferredCategories(completedGoals),
                    completionRate: completedGoals.length / profile.bucketList.length,
                    averageTimeToComplete: this.calculateAverageTime(completedGoals),
                    personalityType: this.inferPersonalityType(profile.bucketList),
                    emotionalProfile: this.analyzeEmotionalProfile(profile.bucketList)
                };
            },
            
            // 선호 카테고리 분석
            getPreferredCategories(completedGoals) {
                const categoryCount = {};
                completedGoals.forEach(goal => {
                    categoryCount[goal.category] = (categoryCount[goal.category] || 0) + 1;
                });
                
                return Object.entries(categoryCount)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 3)
                    .map(([category]) => category);
            },

            // 평균 완료 시간 계산
            calculateAverageTime(completedGoals) {
                if (completedGoals.length === 0) return 0;
                
                const totalTime = completedGoals.reduce((sum, goal) => {
                    if (goal.completedAt && goal.createdAt) {
                        const timeToComplete = new Date(goal.completedAt) - new Date(goal.createdAt);
                        return sum + timeToComplete;
                    }
                    return sum;
                }, 0);
                
                return totalTime / completedGoals.length;
            },

            // 성격 유형 추론
            inferPersonalityType(bucketList) {
                const categoryWeights = {
                    travel: { adventurous: 3, social: 2, creative: 1 },
                    hobby: { creative: 3, introspective: 2, adventurous: 1 },
                    career: { ambitious: 3, analytical: 2, social: 1 },
                    relationship: { social: 3, empathetic: 2, adventurous: 1 },
                    health: { disciplined: 3, health_conscious: 2, ambitious: 1 },
                    other: { creative: 2, adventurous: 1, introspective: 1 }
                };

                const scores = {};
                bucketList.forEach(goal => {
                    const weights = categoryWeights[goal.category] || {};
                    Object.entries(weights).forEach(([trait, weight]) => {
                        scores[trait] = (scores[trait] || 0) + weight;
                    });
                });

                const dominantTrait = Object.entries(scores)
                    .sort(([,a], [,b]) => b - a)[0];
                
                return dominantTrait ? dominantTrait[0] : 'balanced';
            },

            // 감정 프로필 분석
            analyzeEmotionalProfile(bucketList) {
                const emotionFreq = {};
                let totalEntries = 0;

                bucketList.forEach(goal => {
                    if (goal.emotionalJourney) {
                        goal.emotionalJourney.forEach(entry => {
                            emotionFreq[entry.emotion] = (emotionFreq[entry.emotion] || 0) + 1;
                            totalEntries++;
                        });
                    }
                });

                if (totalEntries === 0) return 'optimistic';

                return Object.entries(emotionFreq)
                    .sort(([,a], [,b]) => b - a)[0][0];
            },
            
            // 개인 맞춤형 꿈 제안
            suggestNewDreams(userPattern) {
                const dreamDatabase = {
                    travel: {
                        beginner: [
                            { dream: "국내 여행지 탐방", difficulty: 1, season: "all" },
                            { dream: "주말 캠핑", difficulty: 1, season: "spring,summer,fall" },
                            { dream: "온천 여행", difficulty: 1, season: "winter,fall" },
                            { dream: "로컬 맛집 투어", difficulty: 1, season: "all" }
                        ],
                        intermediate: [
                            { dream: "아시아 배낭여행", difficulty: 2, season: "spring,fall" },
                            { dream: "유럽 도시 여행", difficulty: 2, season: "spring,summer,fall" },
                            { dream: "크루즈 여행", difficulty: 2, season: "summer" },
                            { dream: "제주도 한 달 살기", difficulty: 2, season: "all" }
                        ],
                        advanced: [
                            { dream: "세계일주", difficulty: 3, season: "all" },
                            { dream: "오로라 보기", difficulty: 3, season: "winter" },
                            { dream: "사파리 투어", difficulty: 3, season: "spring,fall" },
                            { dream: "에베레스트 베이스캠프", difficulty: 3, season: "spring,fall" }
                        ]
                    },
                    hobby: {
                        creative: [
                            { dream: "그림 그리기 배우기", personality: ["creative", "introspective"] },
                            { dream: "도자기 만들기", personality: ["creative", "disciplined"] },
                            { dream: "사진 촬영 취미", personality: ["creative", "adventurous"] },
                            { dream: "캘리그래피 배우기", personality: ["creative", "disciplined"] }
                        ],
                        musical: [
                            { dream: "악기 연주 배우기", personality: ["creative", "disciplined"] },
                            { dream: "작곡하기", personality: ["creative", "introspective"] },
                            { dream: "밴드 활동", personality: ["creative", "social"] },
                            { dream: "노래 레슨 받기", personality: ["creative", "ambitious"] }
                        ],
                        intellectual: [
                            { dream: "새 언어 배우기", personality: ["ambitious", "analytical"] },
                            { dream: "책 100권 읽기", personality: ["introspective", "ambitious"] },
                            { dream: "온라인 강의 수강", personality: ["analytical", "ambitious"] },
                            { dream: "블로그 운영하기", personality: ["creative", "analytical"] }
                        ]
                    },
                    career: {
                        skill_development: [
                            { dream: "새로운 기술 스킬 습득", personality: ["ambitious", "analytical"] },
                            { dream: "자격증 취득", personality: ["ambitious", "disciplined"] },
                            { dream: "네트워킹 이벤트 참석", personality: ["social", "ambitious"] },
                            { dream: "멘토링 프로그램 참여", personality: ["ambitious", "empathetic"] }
                        ],
                        entrepreneurship: [
                            { dream: "사이드 프로젝트 시작", personality: ["creative", "ambitious"] },
                            { dream: "창업 아이디어 개발", personality: ["creative", "adventurous"] },
                            { dream: "투자 공부하기", personality: ["analytical", "ambitious"] },
                            { dream: "비즈니스 모델 연구", personality: ["analytical", "creative"] }
                        ]
                    },
                    relationship: {
                        family: [
                            { dream: "가족 여행 계획하기", personality: ["social", "empathetic"] },
                            { dream: "부모님께 효도하기", personality: ["empathetic", "disciplined"] },
                            { dream: "가족 전통 만들기", personality: ["empathetic", "creative"] }
                        ],
                        social: [
                            { dream: "새로운 친구 사귀기", personality: ["social", "adventurous"] },
                            { dream: "동호회 활동 참여", personality: ["social", "creative"] },
                            { dream: "봉사활동 하기", personality: ["empathetic", "social"] },
                            { dream: "스터디 그룹 만들기", personality: ["social", "ambitious"] }
                        ]
                    },
                    health: {
                        fitness: [
                            { dream: "마라톤 완주하기", personality: ["disciplined", "ambitious"] },
                            { dream: "요가 배우기", personality: ["health_conscious", "introspective"] },
                            { dream: "등산 취미 시작", personality: ["adventurous", "health_conscious"] },
                            { dream: "홈트레이닝 루틴", personality: ["disciplined", "health_conscious"] }
                        ],
                        wellness: [
                            { dream: "명상 습관 기르기", personality: ["introspective", "disciplined"] },
                            { dream: "건강한 식단 만들기", personality: ["health_conscious", "disciplined"] },
                            { dream: "정기 건강검진 받기", personality: ["health_conscious", "analytical"] }
                        ]
                    }
                };
                
                return this.generatePersonalizedSuggestions(userPattern, dreamDatabase);
            },

            // 개인화된 추천 생성
            generatePersonalizedSuggestions(userPattern, dreamDatabase) {
                const suggestions = [];
                const currentSeason = this.getCurrentSeason();
                
                // 선호 카테고리 기반 추천
                userPattern.preferredCategories.forEach(category => {
                    if (dreamDatabase[category]) {
                        const categoryDreams = this.selectDreamsFromCategory(
                            dreamDatabase[category], 
                            userPattern, 
                            currentSeason
                        );
                        suggestions.push(...categoryDreams);
                    }
                });

                // 성격 기반 추천 (새로운 카테고리)
                const unexploredCategories = Object.keys(dreamDatabase)
                    .filter(cat => !userPattern.preferredCategories.includes(cat));
                
                unexploredCategories.forEach(category => {
                    const categoryDreams = this.selectDreamsFromCategory(
                        dreamDatabase[category],
                        userPattern,
                        currentSeason,
                        1 // 새로운 카테고리는 1개만
                    );
                    suggestions.push(...categoryDreams);
                });

                // 감정 상태 기반 추천
                const emotionalSuggestions = this.getEmotionallyTunedSuggestions(
                    userPattern.emotionalProfile, 
                    dreamDatabase
                );
                suggestions.push(...emotionalSuggestions);

                return this.rankAndFilterSuggestions(suggestions, userPattern);
            },

            // 카테고리에서 꿈 선택
            selectDreamsFromCategory(categoryData, userPattern, currentSeason, limit = 2) {
                const dreams = [];
                
                Object.values(categoryData).forEach(subcategory => {
                    if (Array.isArray(subcategory)) {
                        const filtered = subcategory.filter(dream => {
                            // 계절 필터
                            if (dream.season && dream.season !== 'all') {
                                return dream.season.split(',').includes(currentSeason);
                            }
                            
                            // 성격 필터
                            if (dream.personality) {
                                return dream.personality.includes(userPattern.personalityType);
                            }
                            
                            return true;
                        });
                        
                        dreams.push(...filtered.slice(0, limit));
                    }
                });
                
                return dreams;
            },

            // 감정 기반 추천
            getEmotionallyTunedSuggestions(emotionalProfile, dreamDatabase) {
                const emotionBasedRecommendations = {
                    'excited': ['travel', 'hobby'],
                    'anxious': ['health', 'hobby'],
                    'determined': ['career', 'health'],
                    'overwhelmed': ['health', 'relationship'],
                    'motivated': ['career', 'travel'],
                    'hopeful': ['relationship', 'career']
                };

                const recommendedCategories = emotionBasedRecommendations[emotionalProfile] || ['hobby'];
                const suggestions = [];

                recommendedCategories.forEach(category => {
                    if (dreamDatabase[category]) {
                        const dreams = Object.values(dreamDatabase[category])
                            .flat()
                            .slice(0, 1);
                        suggestions.push(...dreams);
                    }
                });

                return suggestions;
            },

            // 현재 계절 반환
            getCurrentSeason() {
                const month = new Date().getMonth() + 1;
                if (month >= 3 && month <= 5) return 'spring';
                if (month >= 6 && month <= 8) return 'summer';
                if (month >= 9 && month <= 11) return 'fall';
                return 'winter';
            },

            // 추천 순위 및 필터링
            rankAndFilterSuggestions(suggestions, userPattern) {
                // 중복 제거
                const uniqueSuggestions = suggestions.filter((dream, index, self) => 
                    index === self.findIndex(d => d.dream === dream.dream)
                );

                // 점수 계산 및 정렬
                const scored = uniqueSuggestions.map(dream => ({
                    ...dream,
                    score: this.calculateDreamScore(dream, userPattern)
                }));

                return scored
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 6) // 상위 6개만 반환
                    .map(({ score, ...dream }) => ({
                        ...dream,
                        reason: this.generateRecommendationReason(dream, userPattern)
                    }));
            },

            // 꿈 점수 계산
            calculateDreamScore(dream, userPattern) {
                let score = Math.random() * 0.3; // 기본 랜덤 점수

                // 성격 매칭 보너스
                if (dream.personality && dream.personality.includes(userPattern.personalityType)) {
                    score += 0.4;
                }

                // 완료율 기반 난이도 조정
                if (dream.difficulty) {
                    const difficultyMultiplier = userPattern.completionRate > 0.7 ? 1.2 : 
                                                userPattern.completionRate > 0.4 ? 1.0 : 0.8;
                    score *= difficultyMultiplier;
                }

                return score;
            },

            // 추천 이유 생성
            generateRecommendationReason(dream, userPattern) {
                const reasons = [];

                if (dream.personality && dream.personality.includes(userPattern.personalityType)) {
                    reasons.push(`${userPattern.personalityType} 성향에 잘 맞아요`);
                }

                if (userPattern.completionRate > 0.7) {
                    reasons.push('높은 달성률을 보이고 있어 도전해볼 만해요');
                } else if (userPattern.completionRate < 0.3) {
                    reasons.push('시작하기 좋은 목표예요');
                }

                const currentSeason = this.getCurrentSeason();
                if (dream.season && dream.season.includes(currentSeason)) {
                    const seasonNames = { spring: '봄', summer: '여름', fall: '가을', winter: '겨울' };
                    reasons.push(`${seasonNames[currentSeason]}에 하기 좋은 활동이에요`);
                }

                return reasons.length > 0 ? reasons[0] : '새로운 경험을 위한 추천이에요';
            }
        };

        // ========== 스마트 계획 도우미 ==========
        
        // 꿈달성 예측 및 계획도우미 시스템
        const SmartPlanner = {
            // 꿈 달성 가능성 예측
            predictSuccessProbability(goal, userHistory) {
                const factors = {
                    categoryExperience: this.getCategorySuccessRate(goal.category, userHistory),
                    timelineRealism: this.assessTimelineRealism(goal),
                    currentMotivation: this.getCurrentMotivationLevel(goal),
                    resourceAvailability: this.checkResourceRequirements(goal),
                    emotionalStability: this.analyzeEmotionalStability(goal)
                };
                
                return this.calculateProbability(factors);
            },
            
            // 카테고리별 성공률 분석
            getCategorySuccessRate(category, userHistory) {
                const categoryGoals = userHistory.filter(g => g.category === category);
                if (categoryGoals.length === 0) return 0.6; // 기본값
                
                const completedInCategory = categoryGoals.filter(g => g.completed).length;
                return completedInCategory / categoryGoals.length;
            },

            // 타임라인 현실성 평가
            assessTimelineRealism(goal) {
                const complexityFactors = {
                    travel: { easy: 30, medium: 90, hard: 365 }, // 일 단위
                    hobby: { easy: 60, medium: 180, hard: 730 },
                    career: { easy: 90, medium: 365, hard: 1095 },
                    relationship: { easy: 30, medium: 180, hard: 365 },
                    health: { easy: 30, medium: 90, hard: 365 },
                    other: { easy: 60, medium: 180, hard: 365 }
                };

                const difficulty = this.assessGoalDifficulty(goal.text);
                const expectedDays = complexityFactors[goal.category][difficulty];
                
                if (goal.targetDate) {
                    const daysUntilTarget = Math.ceil((new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24));
                    return Math.min(daysUntilTarget / expectedDays, 1);
                }
                
                return 0.7; // 타겟 날짜가 없으면 중간 점수
            },

            // 목표 난이도 평가
            assessGoalDifficulty(goalText) {
                const easyKeywords = ['시작', '기초', '입문', '간단', '쉬운', '처음'];
                const hardKeywords = ['완주', '정복', '마스터', '전문', '고급', '세계', '국제'];
                
                const lowerGoal = goalText.toLowerCase();
                
                if (hardKeywords.some(keyword => lowerGoal.includes(keyword))) {
                    return 'hard';
                } else if (easyKeywords.some(keyword => lowerGoal.includes(keyword))) {
                    return 'easy';
                }
                return 'medium';
            },

            // 현재 동기 수준 측정
            getCurrentMotivationLevel(goal) {
                if (!goal.emotionalJourney || goal.emotionalJourney.length === 0) {
                    return 0.5; // 기본값
                }

                const recentEntries = goal.emotionalJourney.slice(-3);
                const avgMotivation = recentEntries.reduce((sum, entry) => 
                    sum + entry.motivation, 0) / recentEntries.length;
                
                return avgMotivation / 10; // 0-1 스케일로 정규화
            },

            // 리소스 요구사항 체크
            checkResourceRequirements(goal) {
                const resourceRequirements = {
                    travel: { time: 0.8, money: 0.9, energy: 0.7 },
                    hobby: { time: 0.6, money: 0.5, energy: 0.6 },
                    career: { time: 0.9, money: 0.4, energy: 0.8 },
                    relationship: { time: 0.7, money: 0.3, energy: 0.6 },
                    health: { time: 0.8, money: 0.4, energy: 0.9 },
                    other: { time: 0.6, money: 0.5, energy: 0.6 }
                };

                const requirements = resourceRequirements[goal.category];
                
                // 사용자의 현재 리소스 상태 (실제 구현시 사용자 입력받아야 함)
                const userResources = this.estimateUserResources(goal);
                
                return (
                    Math.min(userResources.time / requirements.time, 1) * 0.4 +
                    Math.min(userResources.money / requirements.money, 1) * 0.3 +
                    Math.min(userResources.energy / requirements.energy, 1) * 0.3
                );
            },

            // 사용자 리소스 추정
            estimateUserResources(goal) {
                // 기본적인 추정치 (실제로는 사용자 설문이나 패턴 분석 필요)
                return {
                    time: 0.7,
                    money: 0.6,
                    energy: 0.8
                };
            },

            // 감정적 안정성 분석
            analyzeEmotionalStability(goal) {
                if (!goal.emotionalJourney || goal.emotionalJourney.length < 2) {
                    return 0.7; // 기본값
                }

                const motivationLevels = goal.emotionalJourney.map(entry => entry.motivation);
                const variance = this.calculateVariance(motivationLevels);
                
                // 낮은 변동성 = 높은 안정성
                return Math.max(0.1, 1 - (variance / 25)); // 분산을 0-1로 정규화
            },

            // 분산 계산
            calculateVariance(values) {
                const mean = values.reduce((a, b) => a + b) / values.length;
                const squareDiffs = values.map(value => Math.pow(value - mean, 2));
                return squareDiffs.reduce((a, b) => a + b) / values.length;
            },

            // 확률 계산
            calculateProbability(factors) {
                const weights = {
                    categoryExperience: 0.25,
                    timelineRealism: 0.25,
                    currentMotivation: 0.20,
                    resourceAvailability: 0.20,
                    emotionalStability: 0.10
                };

                let probability = 0;
                Object.entries(factors).forEach(([factor, value]) => {
                    probability += value * weights[factor];
                });

                return Math.max(0.1, Math.min(0.95, probability));
            },
            
            // 단계별 실행 계획 생성
            generateActionPlan(goal) {
                const templates = {
                    travel: [
                        {
                            step: "목적지 조사 및 예산 계획",
                            duration: "1-2주",
                            description: "여행지 정보 수집, 항공료 및 숙박비 조사, 전체 예산 계획 수립"
                        },
                        {
                            step: "항공편 및 숙소 예약",
                            duration: "1주",
                            description: "최적의 항공편 예약, 숙소 비교 후 예약, 여행자 보험 가입"
                        },
                        {
                            step: "여행 준비물 체크리스트 작성",
                            duration: "1주",
                            description: "필수 준비물 리스트 작성, 쇼핑 목록 정리, 비자/여권 확인"
                        },
                        {
                            step: "현지 문화 및 언어 기초 학습",
                            duration: "2-4주",
                            description: "기본 인사말 학습, 현지 관습 조사, 유용한 앱 다운로드"
                        }
                    ],
                    hobby: [
                        {
                            step: "기초 이론 학습",
                            duration: "2-4주",
                            description: "온라인 강의나 책을 통한 기본 개념 학습"
                        },
                        {
                            step: "필요한 도구/재료 준비",
                            duration: "1주",
                            description: "필수 도구 구매, 작업 공간 마련"
                        },
                        {
                            step: "연습 스케줄 수립",
                            duration: "1주",
                            description: "규칙적인 연습 시간 설정, 단계별 목표 설정"
                        },
                        {
                            step: "온라인 커뮤니티 참여",
                            duration: "지속적",
                            description: "관련 커뮤니티 가입, 경험자들과 소통"
                        }
                    ],
                    career: [
                        {
                            step: "목표 직무 분석",
                            duration: "1-2주",
                            description: "원하는 직무의 요구사항 조사, 시장 동향 파악"
                        },
                        {
                            step: "필요 스킬 파악 및 학습 계획",
                            duration: "1주",
                            description: "부족한 스킬 식별, 학습 로드맵 작성"
                        },
                        {
                            step: "포트폴리오 준비",
                            duration: "4-8주",
                            description: "관련 프로젝트 진행, 경험 정리 및 문서화"
                        },
                        {
                            step: "네트워킹 및 정보 수집",
                            duration: "지속적",
                            description: "업계 전문가와의 만남, 정보 교류"
                        }
                    ],
                    relationship: [
                        {
                            step: "목표 관계 구체화",
                            duration: "1주",
                            description: "어떤 관계를 원하는지 명확히 하기"
                        },
                        {
                            step: "자기 성찰 및 개선",
                            duration: "2-4주",
                            description: "자신의 소통 방식 점검, 개선점 찾기"
                        },
                        {
                            step: "적극적 소통 시작",
                            duration: "지속적",
                            description: "정기적인 연락, 진정성 있는 대화"
                        },
                        {
                            step: "관계 유지 및 발전",
                            duration: "지속적",
                            description: "꾸준한 관심과 배려 표현"
                        }
                    ],
                    health: [
                        {
                            step: "현재 상태 점검",
                            duration: "1주",
                            description: "건강검진, 체력 테스트, 목표 설정"
                        },
                        {
                            step: "운동 계획 수립",
                            duration: "1주",
                            description: "개인에 맞는 운동 루틴 설계"
                        },
                        {
                            step: "실행 및 습관화",
                            duration: "4-8주",
                            description: "꾸준한 실행, 진행상황 기록"
                        },
                        {
                            step: "정기적 평가 및 조정",
                            duration: "지속적",
                            description: "월간 평가, 계획 수정"
                        }
                    ],
                    other: [
                        {
                            step: "목표 구체화",
                            duration: "1주",
                            description: "SMART 기준으로 목표 재정의"
                        },
                        {
                            step: "실행 계획 수립",
                            duration: "1주",
                            description: "단계별 실행 방안 마련"
                        },
                        {
                            step: "실행 및 모니터링",
                            duration: "지속적",
                            description: "계획 실행 및 진행상황 추적"
                        }
                    ]
                };
                
                return templates[goal.category] || templates.other;
            },
            
            // 정기적인 진행상황 체크
            scheduleProgressCheck(goal) {
                const checkPoints = this.calculateOptimalCheckPoints(goal);
                return checkPoints.map(point => ({
                    ...point,
                    goalId: goal.id,
                    scheduled: false // 실제 알림은 별도 구현 필요
                }));
            },

            // 최적 체크포인트 계산
            calculateOptimalCheckPoints(goal) {
                const actionPlan = this.generateActionPlan(goal);
                const checkPoints = [];
                
                let cumulativeDays = 0;
                actionPlan.forEach((step, index) => {
                    // 단계별 예상 소요일 추정
                    const stepDays = this.estimateStepDuration(step.duration);
                    cumulativeDays += stepDays;
                    
                    checkPoints.push({
                        stepIndex: index,
                        stepName: step.step,
                        date: new Date(Date.now() + cumulativeDays * 24 * 60 * 60 * 1000),
                        message: `"${step.step}" 단계 완료 확인`,
                        type: 'step_completion'
                    });
                });

                // 중간 동기부여 체크포인트 추가
                const totalDuration = cumulativeDays;
                const motivationChecks = Math.floor(totalDuration / 14); // 2주마다
                
                for (let i = 1; i <= motivationChecks; i++) {
                    checkPoints.push({
                        stepIndex: -1,
                        stepName: "동기 점검",
                        date: new Date(Date.now() + (i * 14) * 24 * 60 * 60 * 1000),
                        message: "목표에 대한 동기와 진행상황을 점검해보세요",
                        type: 'motivation_check'
                    });
                }

                return checkPoints.sort((a, b) => a.date - b.date);
            },

            // 단계 소요시간 추정
            estimateStepDuration(durationStr) {
                if (durationStr.includes('지속적')) return 30; // 기본 30일
                
                const weekMatch = durationStr.match(/(\d+)주/);
                if (weekMatch) {
                    return parseInt(weekMatch[1]) * 7;
                }
                
                const dayMatch = durationStr.match(/(\d+)일/);
                if (dayMatch) {
                    return parseInt(dayMatch[1]);
                }
                
                return 7; // 기본 1주
            },

            // 목표 달성 시나리오 생성
            generateSuccessScenarios(goal, probability) {
                const scenarios = {
                    high: { // 80% 이상
                        timeline: "예상보다 빠른 달성 가능",
                        tips: [
                            "현재 페이스를 유지하세요",
                            "중간중간 성취감을 느끼며 진행하세요",
                            "더 도전적인 목표도 고려해보세요"
                        ],
                        risks: ["과신으로 인한 방심"]
                    },
                    medium: { // 50-80%
                        timeline: "계획대로 진행시 달성 가능",
                        tips: [
                            "꾸준한 진행이 중요합니다",
                            "중간 점검을 통해 방향을 조정하세요",
                            "어려운 순간에도 포기하지 마세요"
                        ],
                        risks: ["중간 슬럼프", "동기 저하"]
                    },
                    low: { // 50% 미만
                        timeline: "추가 노력과 계획 수정 필요",
                        tips: [
                            "목표를 더 작은 단위로 나누어보세요",
                            "외부 도움이나 멘토를 구해보세요",
                            "타임라인을 현실적으로 조정하세요"
                        ],
                        risks: ["포기 가능성", "자신감 저하"]
                    }
                };

                const level = probability >= 0.8 ? 'high' : 
                             probability >= 0.5 ? 'medium' : 'low';
                
                return {
                    probability: Math.round(probability * 100),
                    level: level,
                    ...scenarios[level]
                };
            },

            // 개인화된 조언 생성
            generatePersonalizedAdvice(goal, userPattern) {
                const advice = [];
                
                // 성격 기반 조언
                const personalityAdvice = {
                    'adventurous': '새로운 도전을 즐기는 성향을 활용해 창의적인 접근을 시도해보세요',
                    'creative': '창의적 사고를 통해 독특한 방법을 찾아보세요',
                    'social': '다른 사람들과 함께하거나 경험을 공유하며 진행해보세요',
                    'analytical': '데이터와 분석을 통해 체계적으로 접근하세요',
                    'disciplined': '규칙적인 루틴을 만들어 꾸준히 실행하세요'
                };

                if (personalityAdvice[userPattern.personalityType]) {
                    advice.push(personalityAdvice[userPattern.personalityType]);
                }

                // 감정 상태 기반 조언
                const emotionAdvice = {
                    'excited': '이 열정을 구체적인 행동으로 옮겨보세요',
                    'anxious': '작은 단계부터 시작해 자신감을 쌓아가세요',
                    'determined': '이 의지를 유지하며 계획적으로 진행하세요'
                };

                if (emotionAdvice[userPattern.emotionalProfile]) {
                    advice.push(emotionAdvice[userPattern.emotionalProfile]);
                }

                // 완료율 기반 조언
                if (userPattern.completionRate > 0.7) {
                    advice.push('높은 달성률을 보이고 있습니다. 이 경험을 활용하세요');
                } else if (userPattern.completionRate < 0.3) {
                    advice.push('목표를 더 세분화하여 작은 성공을 경험해보세요');
                }

                return advice.slice(0, 3); // 최대 3개의 조언
            }
        };

        // ========== 소셜 꿈 네트워크 ==========
        
        // 가족/친구와의 꿈 공유기능 시스템
        const DreamSocialNetwork = {
            // 꿈 공유 설정
            shareDreamWithFamily(goalId, familyMembers, shareLevel) {
                const goal = currentProfile.bucketList.find(g => g.id === goalId);
                if (!goal) return false;

                goal.shareSettings = {
                    isShared: true,
                    sharedWith: familyMembers,
                    shareLevel: shareLevel, // 'progress', 'achievement', 'full'
                    allowComments: true,
                    allowEncouragement: true,
                    sharedAt: new Date().toISOString()
                };

                // 공유 알림 생성
                this.notifyFamilyMembers(goal, familyMembers, 'dream_shared');
                return true;
            },
            
            // 가족 구성원 관리
            manageFamilyMembers(action, memberData) {
                const familyMembers = this.getFamilyMembers();
                
                switch(action) {
                    case 'add':
                        const newMember = {
                            id: Date.now(),
                            name: memberData.name,
                            relationship: memberData.relationship, // 'parent', 'sibling', 'spouse', 'child', 'friend'
                            avatar: memberData.avatar || this.getDefaultAvatar(memberData.relationship),
                            addedAt: new Date().toISOString(),
                            connectionStatus: 'pending'
                        };
                        familyMembers.push(newMember);
                        break;
                    
                    case 'remove':
                        const removeIndex = familyMembers.findIndex(m => m.id === memberData.id);
                        if (removeIndex !== -1) {
                            familyMembers.splice(removeIndex, 1);
                        }
                        break;
                    
                    case 'update':
                        const member = familyMembers.find(m => m.id === memberData.id);
                        if (member) {
                            Object.assign(member, memberData);
                        }
                        break;
                }
                
                this.saveFamilyMembers(familyMembers);
                return familyMembers;
            },

            // 가족 구성원 목록 가져오기
            getFamilyMembers() {
                const stored = safeLocalStorage('get', `familyMembers_${currentProfile.id}`);
                return stored ? JSON.parse(stored) : [];
            },

            // 가족 구성원 목록 저장
            saveFamilyMembers(members) {
                safeLocalStorage('set', `familyMembers_${currentProfile.id}`, JSON.stringify(members));
            },

            // 기본 아바타 가져오기
            getDefaultAvatar(relationship) {
                const avatars = {
                    'parent': '👨‍👩‍👧‍👦',
                    'sibling': '👫',
                    'spouse': '💑',
                    'child': '👶',
                    'friend': '👤'
                };
                return avatars[relationship] || '👤';
            },
            
            // 가족 응원 메시지
            addEncouragementMessage(goalId, fromUser, message, messageType = 'encouragement') {
                const goal = currentProfile.bucketList.find(g => g.id === goalId);
                if (!goal) return false;

                goal.encouragements = goal.encouragements || [];
                
                const encouragement = {
                    id: Date.now(),
                    from: fromUser,
                    message: message,
                    date: new Date().toISOString(),
                    type: messageType, // 'encouragement', 'advice', 'celebration', 'support'
                    reactions: [], // 좋아요, 하트 등
                    isRead: false
                };

                goal.encouragements.unshift(encouragement); // 최신 메시지가 위로
                
                // 알림 생성
                this.createNotification({
                    type: 'encouragement_received',
                    goalId: goalId,
                    fromUser: fromUser,
                    message: message
                });

                return encouragement;
            },

            // 응원 메시지에 반응 추가
            addReactionToEncouragement(goalId, encouragementId, reaction, userId) {
                const goal = currentProfile.bucketList.find(g => g.id === goalId);
                if (!goal) return false;

                const encouragement = goal.encouragements.find(e => e.id === encouragementId);
                if (!encouragement) return false;

                encouragement.reactions = encouragement.reactions || [];
                
                // 기존 반응 제거 후 새 반응 추가
                encouragement.reactions = encouragement.reactions.filter(r => r.userId !== userId);
                encouragement.reactions.push({
                    userId: userId,
                    reaction: reaction, // '❤️', '👍', '🎉', '💪', '🔥'
                    date: new Date().toISOString()
                });

                return true;
            },
            
            // 가족 도전 이벤트
            createFamilyChallenge(challengeData) {
                const challenge = {
                    id: Date.now(),
                    title: challengeData.title,
                    description: challengeData.description,
                    category: challengeData.category,
                    participants: challengeData.participants,
                    creator: currentProfile.id,
                    deadline: challengeData.deadline,
                    rewards: challengeData.rewards,
                    rules: challengeData.rules || [],
                    progress: {},
                    status: 'active', // 'active', 'completed', 'cancelled'
                    createdAt: new Date().toISOString(),
                    completedAt: null,
                    winner: null
                };

                // 각 참가자의 진행 상황 초기화
                challengeData.participants.forEach(participant => {
                    challenge.progress[participant.id] = {
                        userId: participant.id,
                        userName: participant.name,
                        completed: false,
                        progress: 0,
                        milestones: [],
                        lastUpdate: new Date().toISOString()
                    };
                });

                // 도전 저장
                this.saveFamilyChallenge(challenge);
                
                // 참가자들에게 알림
                this.notifyFamilyMembers(challenge, challengeData.participants, 'challenge_created');
                
                return challenge;
            },

            // 가족 도전 목록 가져오기
            getFamilyChallenges() {
                const stored = safeLocalStorage('get', `familyChallenges_${currentProfile.id}`);
                return stored ? JSON.parse(stored) : [];
            },

            // 가족 도전 저장
            saveFamilyChallenge(challenge) {
                const challenges = this.getFamilyChallenges();
                const existingIndex = challenges.findIndex(c => c.id === challenge.id);
                
                if (existingIndex !== -1) {
                    challenges[existingIndex] = challenge;
                } else {
                    challenges.push(challenge);
                }
                
                safeLocalStorage('set', `familyChallenges_${currentProfile.id}`, JSON.stringify(challenges));
            },

            // 도전 진행 상황 업데이트
            updateChallengeProgress(challengeId, userId, progressData) {
                const challenges = this.getFamilyChallenges();
                const challenge = challenges.find(c => c.id === challengeId);
                
                if (!challenge || !challenge.progress[userId]) return false;

                const userProgress = challenge.progress[userId];
                userProgress.progress = progressData.progress;
                userProgress.lastUpdate = new Date().toISOString();
                
                if (progressData.milestone) {
                    userProgress.milestones.push({
                        title: progressData.milestone,
                        date: new Date().toISOString(),
                        description: progressData.description || ''
                    });
                }

                // 완료 체크
                if (progressData.progress >= 100 && !userProgress.completed) {
                    userProgress.completed = true;
                    userProgress.completedAt = new Date().toISOString();
                    
                    // 첫 번째 완료자가 승자
                    if (!challenge.winner) {
                        challenge.winner = userId;
                        challenge.status = 'completed';
                        challenge.completedAt = new Date().toISOString();
                    }
                    
                    this.celebrateCompletion(challenge, userId);
                }

                this.saveFamilyChallenge(challenge);
                return true;
            },

            // 완료 축하
            celebrateCompletion(challenge, userId) {
                const user = challenge.progress[userId];
                
                // 축하 메시지 생성
                this.createNotification({
                    type: 'challenge_completed',
                    challengeId: challenge.id,
                    userId: userId,
                    userName: user.userName,
                    challengeTitle: challenge.title
                });

                // 다른 참가자들에게 알림
                Object.keys(challenge.progress).forEach(participantId => {
                    if (participantId !== userId) {
                        this.createNotification({
                            type: 'participant_completed',
                            challengeId: challenge.id,
                            completedUserId: userId,
                            completedUserName: user.userName,
                            challengeTitle: challenge.title
                        });
                    }
                });
            },

            // 공유된 목표 가져오기
            getSharedGoals() {
                return currentProfile.bucketList.filter(goal => 
                    goal.shareSettings && goal.shareSettings.isShared
                );
            },

            // 목표 공유 해제
            unshareDream(goalId) {
                const goal = currentProfile.bucketList.find(g => g.id === goalId);
                if (!goal || !goal.shareSettings) return false;

                goal.shareSettings.isShared = false;
                goal.shareSettings.unsharedAt = new Date().toISOString();
                
                return true;
            },

            // 가족에게 알림 보내기
            notifyFamilyMembers(content, members, notificationType) {
                members.forEach(member => {
                    this.createNotification({
                        type: notificationType,
                        recipientId: member.id,
                        recipientName: member.name,
                        senderId: currentProfile.id,
                        senderName: currentProfile.name,
                        content: content,
                        date: new Date().toISOString()
                    });
                });
            },

            // 알림 생성
            createNotification(notificationData) {
                const notifications = this.getNotifications();
                
                const notification = {
                    id: Date.now(),
                    ...notificationData,
                    isRead: false,
                    createdAt: new Date().toISOString()
                };

                notifications.unshift(notification);
                
                // 최대 100개까지만 보관
                if (notifications.length > 100) {
                    notifications.splice(100);
                }

                safeLocalStorage('set', `notifications_${currentProfile.id}`, JSON.stringify(notifications));
                
                // UI 업데이트 (실제 구현시)
                this.updateNotificationBadge();
                
                return notification;
            },

            // 알림 목록 가져오기
            getNotifications() {
                const stored = safeLocalStorage('get', `notifications_${currentProfile.id}`);
                return stored ? JSON.parse(stored) : [];
            },

            // 알림 읽음 처리
            markNotificationAsRead(notificationId) {
                const notifications = this.getNotifications();
                const notification = notifications.find(n => n.id === notificationId);
                
                if (notification) {
                    notification.isRead = true;
                    notification.readAt = new Date().toISOString();
                    safeLocalStorage('set', `notifications_${currentProfile.id}`, JSON.stringify(notifications));
                    this.updateNotificationBadge();
                }
            },

            // 알림 배지 업데이트
            updateNotificationBadge() {
                const notifications = this.getNotifications();
                const unreadCount = notifications.filter(n => !n.isRead).length;
                
                // UI 업데이트 로직 (실제 DOM 조작은 별도 구현 필요)
                const badge = document.querySelector('.notification-badge');
                if (badge) {
                    badge.textContent = unreadCount;
                    badge.style.display = unreadCount > 0 ? 'block' : 'none';
                }
            },

            // 가족 활동 피드 생성
            generateFamilyActivityFeed() {
                const sharedGoals = this.getSharedGoals();
                const challenges = this.getFamilyChallenges();
                const notifications = this.getNotifications().slice(0, 20); // 최근 20개
                
                const activities = [];

                // 공유된 목표의 최근 활동
                sharedGoals.forEach(goal => {
                    if (goal.encouragements && goal.encouragements.length > 0) {
                        goal.encouragements.slice(0, 3).forEach(encouragement => {
                            activities.push({
                                type: 'encouragement',
                                date: encouragement.date,
                                goalTitle: goal.text,
                                fromUser: encouragement.from,
                                message: encouragement.message,
                                icon: '💬'
                            });
                        });
                    }

                    if (goal.completed) {
                        activities.push({
                            type: 'goal_completed',
                            date: goal.completedAt,
                            goalTitle: goal.text,
                            userName: currentProfile.name,
                            icon: '🎉'
                        });
                    }
                });

                // 도전 활동
                challenges.forEach(challenge => {
                    activities.push({
                        type: 'challenge_created',
                        date: challenge.createdAt,
                        challengeTitle: challenge.title,
                        creator: challenge.creator,
                        icon: '🏆'
                    });

                    Object.values(challenge.progress).forEach(progress => {
                        if (progress.completed) {
                            activities.push({
                                type: 'challenge_progress',
                                date: progress.lastUpdate,
                                challengeTitle: challenge.title,
                                userName: progress.userName,
                                progress: progress.progress,
                                icon: '📈'
                            });
                        }
                    });
                });

                // 날짜순 정렬
                return activities.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 15);
            },

            // 가족 통계 생성
            generateFamilyStats() {
                const familyMembers = this.getFamilyMembers();
                const challenges = this.getFamilyChallenges();
                const sharedGoals = this.getSharedGoals();

                return {
                    totalMembers: familyMembers.length,
                    activeChallenges: challenges.filter(c => c.status === 'active').length,
                    completedChallenges: challenges.filter(c => c.status === 'completed').length,
                    sharedGoalsCount: sharedGoals.length,
                    totalEncouragements: sharedGoals.reduce((total, goal) => 
                        total + (goal.encouragements ? goal.encouragements.length : 0), 0
                    ),
                    mostActiveMember: this.getMostActiveFamilyMember(),
                    recentActivity: this.generateFamilyActivityFeed().slice(0, 5)
                };
            },

            // 가장 활발한 가족 구성원 찾기
            getMostActiveFamilyMember() {
                const familyMembers = this.getFamilyMembers();
                const sharedGoals = this.getSharedGoals();
                
                const activityCount = {};
                
                // 응원 메시지 카운트
                sharedGoals.forEach(goal => {
                    if (goal.encouragements) {
                        goal.encouragements.forEach(encouragement => {
                            const fromId = encouragement.from.id || encouragement.from;
                            activityCount[fromId] = (activityCount[fromId] || 0) + 1;
                        });
                    }
                });

                // 가장 많이 활동한 구성원 찾기
                const mostActiveId = Object.keys(activityCount).reduce((a, b) => 
                    activityCount[a] > activityCount[b] ? a : b, null
                );

                if (mostActiveId) {
                    const member = familyMembers.find(m => m.id == mostActiveId);
                    return member ? {
                        ...member,
                        activityCount: activityCount[mostActiveId]
                    } : null;
                }

                return null;
            },

            // 추천 도전 생성
            suggestFamilyChallenge() {
                const suggestions = [
                    {
                        title: "30일 운동 챌린지",
                        description: "매일 30분씩 운동하고 인증하기",
                        category: "health",
                        duration: 30,
                        difficulty: "easy"
                    },
                    {
                        title: "가족 독서 마라톤",
                        description: "한 달 동안 각자 책 2권 읽기",
                        category: "hobby",
                        duration: 30,
                        difficulty: "medium"
                    },
                    {
                        title: "새로운 요리 배우기",
                        description: "매주 새로운 요리 한 가지씩 도전",
                        category: "hobby",
                        duration: 28,
                        difficulty: "easy"
                    },
                    {
                        title: "환경보호 실천하기",
                        description: "일회용품 사용 줄이고 재활용 늘리기",
                        category: "other",
                        duration: 60,
                        difficulty: "medium"
                    },
                    {
                        title: "감사 일기 쓰기",
                        description: "매일 감사한 일 3가지씩 적기",
                        category: "relationship",
                        duration: 21,
                        difficulty: "easy"
                    }
                ];

                // 가족 구성원 수와 성향에 따라 추천
                const familySize = this.getFamilyMembers().length;
                const activeUsers = this.getActiveUsers();

                return suggestions.filter(suggestion => {
                    if (familySize < 2 && suggestion.category === 'relationship') return false;
                    if (activeUsers.length < 3 && suggestion.difficulty === 'hard') return false;
                    return true;
                }).slice(0, 3);
            },

            // 활성 사용자 가져오기
            getActiveUsers() {
                const familyMembers = this.getFamilyMembers();
                const recentActivity = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7일 이내
                
                return familyMembers.filter(member => {
                    return member.connectionStatus === 'active' || 
                           new Date(member.addedAt) > recentActivity;
                });
            }
        };

        // ========== 정기적 성찰 도우미 ==========
        
        // 개인적 성찰과 회고시스템
        const ReflectionSystem = {
            // 월간 회고 생성
            generateMonthlyReflection() {
                const thisMonth = new Date();
                const lastMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth() - 1, 1);
                
                const completedThisMonth = currentProfile.bucketList.filter(goal => {
                    return goal.completed && 
                           new Date(goal.completedAt) >= lastMonth &&
                           new Date(goal.completedAt) < thisMonth;
                });

                const activeGoals = currentProfile.bucketList.filter(goal => !goal.completed);
                
                return {
                    period: this.getMonthPeriod(lastMonth),
                    achievements: completedThisMonth,
                    insights: this.generateInsights(completedThisMonth),
                    nextMonthGoals: this.suggestNextMonthFocus(activeGoals),
                    gratitude: this.promptGratitudeReflection(),
                    growth: this.identifyGrowthAreas(completedThisMonth),
                    challenges: this.identifyPastChallenges(completedThisMonth),
                    emotions: this.analyzeEmotionalJourney(),
                    recommendations: this.generateReflectionRecommendations()
                };
            },

            // 기간 표시 생성
            getMonthPeriod(date) {
                const months = [
                    '1월', '2월', '3월', '4월', '5월', '6월',
                    '7월', '8월', '9월', '10월', '11월', '12월'
                ];
                return `${date.getFullYear()}년 ${months[date.getMonth()]}`;
            },

            // 인사이트 생성
            generateInsights(completedGoals) {
                if (completedGoals.length === 0) {
                    return [
                        "이번 달은 새로운 시작을 준비하는 시간이었습니다.",
                        "때로는 휴식과 계획이 더 중요할 수 있습니다.",
                        "다음 달에는 작은 목표부터 시작해보세요."
                    ];
                }

                const insights = [];
                const categories = [...new Set(completedGoals.map(g => g.category))];
                
                // 카테고리별 인사이트
                if (categories.length === 1) {
                    const categoryNames = {
                        'travel': '여행',
                        'hobby': '취미',
                        'career': '커리어',
                        'relationship': '인간관계',
                        'health': '건강',
                        'other': '기타'
                    };
                    insights.push(`${categoryNames[categories[0]]} 분야에 특히 집중한 한 달이었습니다.`);
                } else if (categories.length > 3) {
                    insights.push("다양한 분야의 목표를 균형있게 달성한 한 달이었습니다.");
                }

                // 달성 개수별 인사이트
                if (completedGoals.length >= 5) {
                    insights.push("놀라운 실행력을 보여준 한 달입니다! 이 추진력을 계속 유지해보세요.");
                } else if (completedGoals.length >= 3) {
                    insights.push("꾸준한 성과를 이룬 의미있는 한 달이었습니다.");
                } else {
                    insights.push("질적으로 깊이 있는 성취를 이룬 한 달이었습니다.");
                }

                // 감정 기반 인사이트
                const emotionalInsights = this.getEmotionalInsights(completedGoals);
                if (emotionalInsights) {
                    insights.push(emotionalInsights);
                }

                return insights.slice(0, 4); // 최대 4개 인사이트
            },

            // 감정 기반 인사이트
            getEmotionalInsights(completedGoals) {
                const emotions = [];
                completedGoals.forEach(goal => {
                    if (goal.completionEmotion) {
                        emotions.push(goal.completionEmotion);
                    }
                });

                if (emotions.length === 0) return null;

                const emotionCount = {};
                emotions.forEach(emotion => {
                    emotionCount[emotion] = (emotionCount[emotion] || 0) + 1;
                });

                const dominantEmotion = Object.keys(emotionCount).reduce((a, b) => 
                    emotionCount[a] > emotionCount[b] ? a : b
                );

                const emotionInsights = {
                    'proud': '자랑스러움을 많이 느끼신 것 같네요. 자신감이 높아진 한 달이었습니다.',
                    'happy': '행복한 순간들이 많았던 따뜻한 한 달이었습니다.',
                    'excited': '에너지 넘치는 활동적인 한 달을 보내셨네요.',
                    'grateful': '감사하는 마음이 가득한 의미있는 한 달이었습니다.',
                    'satisfied': '만족스러운 성취들로 채워진 안정적인 한 달이었습니다.',
                    'relieved': '안도감을 느끼는 순간들이 많았던 것 같습니다. 어려운 일들을 잘 해내셨네요.'
                };

                return emotionInsights[dominantEmotion] || '다양한 감정을 경험하며 성장한 한 달이었습니다.';
            },

            // 다음 달 집중 영역 제안
            suggestNextMonthFocus(activeGoals) {
                if (activeGoals.length === 0) {
                    return {
                        focus: "새로운 목표 설정",
                        suggestions: [
                            "인생에서 정말 중요한 가치가 무엇인지 생각해보세요",
                            "작은 것부터 시작할 수 있는 목표를 찾아보세요",
                            "다른 사람들의 버킷리스트를 참고해보세요"
                        ]
                    };
                }

                // 우선순위가 높은 목표들 식별
                const priorityGoals = activeGoals.filter(goal => 
                    goal.priority === 'high' || goal.targetDate
                ).slice(0, 3);

                if (priorityGoals.length > 0) {
                    return {
                        focus: "우선순위 목표 집중",
                        suggestions: priorityGoals.map(goal => 
                            `"${goal.text}" - ${this.getGoalAdvice(goal)}`
                        )
                    };
                }

                // 카테고리별 균형 제안
                const categoryBalance = this.analyzeCategoryBalance(activeGoals);
                return {
                    focus: "균형잡힌 성장",
                    suggestions: categoryBalance.suggestions
                };
            },

            // 목표별 조언 생성
            getGoalAdvice(goal) {
                const adviceTemplates = {
                    'travel': '여행 계획을 구체화하고 예산을 준비해보세요',
                    'hobby': '매일 조금씩이라도 연습하는 시간을 만들어보세요',
                    'career': '필요한 스킬을 파악하고 학습 계획을 세워보세요',
                    'relationship': '상대방과의 소통 시간을 늘려보세요',
                    'health': '작은 습관부터 시작해서 꾸준히 유지해보세요',
                    'other': '목표를 더 구체적으로 세분화해보세요'
                };

                return adviceTemplates[goal.category] || '한 걸음씩 천천히 진행해보세요';
            },

            // 카테고리 균형 분석
            analyzeCategoryBalance(activeGoals) {
                const categoryCount = {};
                activeGoals.forEach(goal => {
                    categoryCount[goal.category] = (categoryCount[goal.category] || 0) + 1;
                });

                const totalGoals = activeGoals.length;
                const suggestions = [];

                // 편중된 카테고리 확인
                Object.entries(categoryCount).forEach(([category, count]) => {
                    if (count / totalGoals > 0.5) {
                        const categoryNames = {
                            'travel': '여행', 'hobby': '취미', 'career': '커리어',
                            'relationship': '인간관계', 'health': '건강', 'other': '기타'
                        };
                        suggestions.push(`${categoryNames[category]} 분야가 많습니다. 다른 영역도 고려해보세요.`);
                    }
                });

                // 빠진 중요 카테고리 확인
                const importantCategories = ['health', 'relationship'];
                importantCategories.forEach(category => {
                    if (!categoryCount[category]) {
                        const suggestions_map = {
                            'health': '건강 관련 목표도 추가해보세요',
                            'relationship': '소중한 사람들과의 관계도 생각해보세요'
                        };
                        suggestions.push(suggestions_map[category]);
                    }
                });

                if (suggestions.length === 0) {
                    suggestions.push("목표들이 잘 균형잡혀 있습니다!");
                    suggestions.push("각 목표에 대한 구체적인 실행 계획을 세워보세요");
                }

                return { suggestions: suggestions.slice(0, 3) };
            },

            // 감사 성찰 안내
            promptGratitudeReflection() {
                return {
                    title: "감사했던 순간들",
                    prompts: [
                        "이번 달 가장 감사했던 순간은 언제였나요?",
                        "누군가의 도움이나 응원이 특히 힘이 되었던 적이 있나요?",
                        "예상치 못한 좋은 일이나 우연한 만남이 있었나요?",
                        "어떤 작은 일상의 순간들이 행복했나요?"
                    ],
                    benefits: "감사를 표현하면 행복감이 증가하고 긍정적인 관계가 강화됩니다."
                };
            },

            // 성장 영역 식별
            identifyGrowthAreas(completedGoals) {
                const growthAreas = [];

                if (completedGoals.length > 0) {
                    // 완료된 목표에서 성장 포인트 추출
                    completedGoals.forEach(goal => {
                        if (goal.meaningfulAspect) {
                            growthAreas.push({
                                area: goal.category,
                                learning: goal.meaningfulAspect,
                                goal: goal.text
                            });
                        }
                    });
                }

                // 일반적인 성장 영역 제안
                const generalGrowthAreas = [
                    {
                        area: "자기관리",
                        suggestion: "규칙적인 생활 패턴을 만들어보세요",
                        benefits: "에너지와 집중력이 향상됩니다"
                    },
                    {
                        area: "소통능력",
                        suggestion: "적극적인 경청과 공감을 연습해보세요",
                        benefits: "더 깊은 인간관계를 형성할 수 있습니다"
                    },
                    {
                        area: "창의성",
                        suggestion: "새로운 시각으로 문제를 바라보는 연습을 해보세요",
                        benefits: "더 혁신적인 해결책을 찾을 수 있습니다"
                    },
                    {
                        area: "회복탄력성",
                        suggestion: "어려운 상황에서도 긍정적인 면을 찾아보세요",
                        benefits: "스트레스를 더 잘 관리할 수 있습니다"
                    }
                ];

                return {
                    personalGrowth: growthAreas.slice(0, 2),
                    suggestedAreas: generalGrowthAreas.slice(0, 2)
                };
            },

            // 지난 도전들 분석
            identifyPastChallenges(completedGoals) {
                const challenges = [];

                // 완료까지 오래 걸린 목표들
                const longTermGoals = completedGoals.filter(goal => {
                    if (goal.createdAt && goal.completedAt) {
                        const timeDiff = new Date(goal.completedAt) - new Date(goal.createdAt);
                        const days = timeDiff / (1000 * 60 * 60 * 24);
                        return days > 90; // 3개월 이상
                    }
                    return false;
                });

                if (longTermGoals.length > 0) {
                    challenges.push({
                        type: "persistence",
                        description: "장기간의 꾸준함이 필요한 목표들을 성공적으로 달성했습니다",
                        lessons: ["끈기와 인내심이 향상되었습니다", "장기 목표 관리 능력이 성장했습니다"]
                    });
                }

                // 어려운 카테고리의 목표들
                const difficultCategories = completedGoals.filter(goal => 
                    ['career', 'health'].includes(goal.category)
                );

                if (difficultCategories.length > 0) {
                    challenges.push({
                        type: "complexity",
                        description: "복잡하고 도전적인 목표들을 달성했습니다",
                        lessons: ["문제 해결 능력이 향상되었습니다", "자기 관리 능력이 성장했습니다"]
                    });
                }

                return challenges.slice(0, 2);
            },

            // 감정 여정 분석
            analyzeEmotionalJourney() {
                const allEmotions = [];
                
                currentProfile.bucketList.forEach(goal => {
                    if (goal.emotionalJourney && goal.emotionalJourney.length > 0) {
                        allEmotions.push(...goal.emotionalJourney);
                    }
                });

                if (allEmotions.length === 0) {
                    return {
                        summary: "감정 기록을 시작해보세요!",
                        recommendation: "목표에 대한 감정을 기록하면 더 깊은 자기 이해가 가능합니다."
                    };
                }

                // 최근 30일간의 감정 분석
                const recentEmotions = allEmotions.filter(emotion => {
                    const emotionDate = new Date(emotion.date);
                    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                    return emotionDate >= thirtyDaysAgo;
                });

                const emotionFreq = {};
                const motivationLevels = [];

                recentEmotions.forEach(emotion => {
                    emotionFreq[emotion.emotion] = (emotionFreq[emotion.emotion] || 0) + 1;
                    motivationLevels.push(emotion.motivation);
                });

                const avgMotivation = motivationLevels.length > 0 ? 
                    motivationLevels.reduce((a, b) => a + b) / motivationLevels.length : 5;

                const dominantEmotion = Object.keys(emotionFreq).reduce((a, b) => 
                    emotionFreq[a] > emotionFreq[b] ? a : b, 'neutral'
                );

                return {
                    dominantEmotion: dominantEmotion,
                    averageMotivation: Math.round(avgMotivation * 10) / 10,
                    emotionCount: Object.keys(emotionFreq).length,
                    summary: this.getEmotionalSummary(dominantEmotion, avgMotivation),
                    recommendation: this.getEmotionalRecommendation(dominantEmotion, avgMotivation)
                };
            },

            // 감정 요약 생성
            getEmotionalSummary(dominantEmotion, avgMotivation) {
                const emotionDescriptions = {
                    'excited': '열정적이고 에너지 넘치는',
                    'determined': '의지가 강하고 결단력 있는',
                    'motivated': '동기부여가 잘 된',
                    'anxious': '신중하고 조심스러운',
                    'overwhelmed': '많은 것을 고민하는',
                    'hopeful': '희망적이고 긍정적인',
                    'neutral': '안정적이고 균형잡힌'
                };

                const emotionDesc = emotionDescriptions[dominantEmotion] || '다양한 감정을 경험하는';
                const motivationDesc = avgMotivation >= 7 ? '높은 동기 수준을 유지하며' :
                                     avgMotivation >= 5 ? '적절한 동기 수준으로' :
                                     '차분한 마음으로';

                return `${emotionDesc} 상태로 ${motivationDesc} 목표들을 추진해오셨습니다.`;
            },

            // 감정 기반 추천
            getEmotionalRecommendation(dominantEmotion, avgMotivation) {
                if (avgMotivation < 4) {
                    return "동기 수준이 낮아 보입니다. 작은 성공 경험을 통해 자신감을 회복해보세요.";
                } else if (avgMotivation > 8) {
                    return "높은 동기를 잘 유지하고 있습니다. 이 에너지를 현명하게 배분해보세요.";
                }

                const emotionRecommendations = {
                    'excited': '열정을 지속가능한 행동으로 바꿔보세요.',
                    'anxious': '불안한 마음을 인정하고 작은 단계부터 시작해보세요.',
                    'overwhelmed': '목표를 더 작게 나누어 관리해보세요.'
                };

                return emotionRecommendations[dominantEmotion] || 
                       '현재의 감정 상태를 잘 유지하며 꾸준히 진행해보세요.';
            },

            // 회고 기반 추천사항 생성
            generateReflectionRecommendations() {
                return [
                    {
                        title: "일주일 점검",
                        description: "매주 일요일 저녁, 한 주를 돌아보는 시간을 가져보세요",
                        benefits: "진행 상황을 정기적으로 점검하여 방향을 조정할 수 있습니다"
                    },
                    {
                        title: "감정 일기",
                        description: "목표 달성 과정에서 느끼는 감정들을 기록해보세요",
                        benefits: "자신의 패턴을 이해하고 동기를 유지하는데 도움이 됩니다"
                    },
                    {
                        title: "성취 축하",
                        description: "작은 달성이라도 스스로를 축하하는 시간을 가져보세요",
                        benefits: "긍정적인 강화를 통해 지속적인 동기를 유지할 수 있습니다"
                    }
                ];
            },
            
            // 꿈의 의미 탐색
            exploreGoalMeaning(goal) {
                const questions = [
                    "이 꿈이 나에게 중요한 이유는 무엇인가요?",
                    "이 꿈을 통해 어떤 사람이 되고 싶나요?",
                    "이 꿈이 달성되면 내 삶은 어떻게 변할까요?",
                    "이 꿈을 추구하면서 배우고 싶은 것은 무엇인가요?",
                    "이 꿈을 포기한다면 어떤 기분일까요?",
                    "10년 후의 나는 이 꿈에 대해 어떻게 생각할까요?"
                ];
                
                return {
                    reflectionQuestions: questions,
                    meaningfulConnections: this.findValueConnections(goal),
                    personalGrowthAspects: this.identifyGrowthOpportunities(goal),
                    deeperQuestions: this.generateDeeperQuestions(goal)
                };
            },

            // 가치 연결점 찾기
            findValueConnections(goal) {
                const coreValues = {
                    'family': '가족과의 시간과 유대감',
                    'growth': '개인적 성장과 발전',
                    'contribution': '사회에 기여하고 도움이 되는 것',
                    'freedom': '자유로움과 독립성',
                    'creativity': '창의성과 자기표현',
                    'health': '건강하고 활기찬 삶',
                    'adventure': '새로운 경험과 모험',
                    'knowledge': '지식과 이해의 확장'
                };

                const categoryToValues = {
                    'travel': ['adventure', 'freedom', 'growth'],
                    'hobby': ['creativity', 'growth', 'knowledge'],
                    'career': ['growth', 'contribution', 'freedom'],
                    'relationship': ['family', 'contribution', 'growth'],
                    'health': ['health', 'growth', 'freedom'],
                    'other': ['growth', 'creativity', 'contribution']
                };

                const relatedValues = categoryToValues[goal.category] || ['growth'];
                
                return relatedValues.map(valueKey => ({
                    value: valueKey,
                    description: coreValues[valueKey],
                    connection: this.explainValueConnection(goal, valueKey)
                }));
            },

            // 가치 연결 설명
            explainValueConnection(goal, valueKey) {
                const connections = {
                    'family': '이 목표를 통해 가족과 더 많은 시간을 보내거나 더 나은 관계를 만들 수 있습니다.',
                    'growth': '이 도전을 통해 새로운 능력을 개발하고 개인적으로 성장할 수 있습니다.',
                    'contribution': '이 경험이 다른 사람들에게도 도움이 되거나 영감을 줄 수 있습니다.',
                    'freedom': '이 목표 달성이 더 많은 선택권과 자유를 가져다 줄 것입니다.',
                    'creativity': '이 활동을 통해 창의적인 면을 발견하고 표현할 수 있습니다.',
                    'health': '이 목표가 신체적, 정신적 건강 향상에 도움이 될 것입니다.',
                    'adventure': '이 경험이 일상에서 벗어난 새로운 모험을 제공할 것입니다.',
                    'knowledge': '이 과정에서 새로운 지식과 통찰을 얻을 수 있습니다.'
                };

                return connections[valueKey] || '이 목표가 당신의 삶에 긍정적인 변화를 가져올 것입니다.';
            },

            // 성장 기회 식별
            identifyGrowthOpportunities(goal) {
                const growthAspects = {
                    'travel': [
                        '적응력과 유연성 향상',
                        '문화적 이해력 확장',
                        '독립성과 자신감 증진'
                    ],
                    'hobby': [
                        '새로운 기술과 재능 개발',
                        '창의성과 표현력 향상',
                        '인내심과 집중력 증진'
                    ],
                    'career': [
                        '전문 지식과 기술 향상',
                        '리더십과 협업 능력 개발',
                        '목표 설정과 달성 능력 강화'
                    ],
                    'relationship': [
                        '소통과 공감 능력 향상',
                        '이해심과 배려심 증진',
                        '갈등 해결 능력 개발'
                    ],
                    'health': [
                        '자기 관리 능력 향상',
                        '의지력과 끈기 강화',
                        '스트레스 관리 능력 개발'
                    ],
                    'other': [
                        '새로운 관점과 시각 확보',
                        '문제 해결 능력 향상',
                        '자기 이해와 성찰 깊이 증진'
                    ]
                };

                return growthAspects[goal.category] || growthAspects['other'];
            },

            // 더 깊은 질문들 생성
            generateDeeperQuestions(goal) {
                const deepQuestions = [
                    {
                        category: "동기 탐구",
                        questions: [
                            "이 꿈을 처음 갖게 된 계기는 무엇인가요?",
                            "다른 사람들의 기대와 내 진짜 욕구를 구분해보세요.",
                            "이 꿈이 어린 시절의 어떤 경험과 연결되어 있나요?"
                        ]
                    },
                    {
                        category: "장애물 인식",
                        questions: [
                            "이 꿈을 이루는데 가장 큰 장애물은 무엇인가요?",
                            "내적인 두려움이나 제약이 있다면 무엇인가요?",
                            "외부적인 제약 조건들을 어떻게 극복할 수 있을까요?"
                        ]
                    },
                    {
                        category: "대안적 관점",
                        questions: [
                            "이 꿈의 본질적인 욕구를 다른 방식으로도 충족할 수 있을까요?",
                            "꿈을 이루지 못해도 얻을 수 있는 것들은 무엇인가요?",
                            "이 꿈 대신 다른 꿈을 선택한다면 무엇일까요?"
                        ]
                    }
                ];

                return deepQuestions;
            },

            // 성찰 세션 가이드 생성
            createReflectionSession(sessionType) {
                const sessions = {
                    'weekly': {
                        title: "주간 점검",
                        duration: "15-20분",
                        steps: [
                            "이번 주 목표 진행 상황 점검",
                            "예상과 다른 점들 파악",
                            "잘한 점과 개선할 점 정리",
                            "다음 주 우선순위 설정"
                        ]
                    },
                    'monthly': {
                        title: "월간 회고",
                        duration: "30-45분",
                        steps: [
                            "한 달간의 성취 정리",
                            "감정의 변화 관찰",
                            "배운 점과 성장 영역 파악",
                            "다음 달 목표와 계획 수립"
                        ]
                    },
                    'quarterly': {
                        title: "분기별 깊은 성찰",
                        duration: "60-90분",
                        steps: [
                            "인생 목표와의 연결점 확인",
                            "가치관의 변화 탐색",
                            "새로운 꿈과 비전 탐구",
                            "장기적 방향성 재설정"
                        ]
                    }
                };

                return sessions[sessionType] || sessions['weekly'];
            }
        };

        // ========== 인터랙티브 꿈 지도 시각화 ==========
        
        // 인터랙티브 꿈 지도
        const DreamMapVisualizer = {
            // 인터랙티브 꿈 지도 생성
            createInteractiveDreamMap() {
                const allGoals = currentProfile.bucketList;
                const mapData = {
                    travelGoals: this.extractTravelGoals(allGoals),
                    abstractGoals: this.categorizeAbstractGoals(allGoals),
                    connections: this.findGoalConnections(allGoals),
                    timeline: this.createTimelineView(allGoals),
                    achievements: this.mapAchievements(allGoals)
                };

                return {
                    mapStructure: this.buildMapStructure(mapData),
                    interactiveElements: this.createInteractiveElements(mapData),
                    visualThemes: this.getVisualThemes(),
                    navigationOptions: this.getNavigationOptions()
                };
            },

            // 여행 관련 꿈 추출
            extractTravelGoals(goals) {
                const travelGoals = goals.filter(goal => 
                    goal.category === 'travel' || 
                    this.containsTravelKeywords(goal.title)
                );

                return travelGoals.map(goal => ({
                    ...goal,
                    location: this.extractLocation(goal.title),
                    coordinates: this.getCoordinates(goal.title),
                    travelType: this.identifyTravelType(goal),
                    difficulty: this.assessTravelDifficulty(goal),
                    season: this.suggestBestSeason(goal)
                }));
            },

            // 여행 키워드 감지
            containsTravelKeywords(title) {
                const travelKeywords = [
                    '여행', '해외', '국가', '도시', '바다', '산', '섬',
                    '파리', '런던', '도쿄', '뉴욕', '로마', '바르셀로나',
                    '태국', '일본', '미국', '유럽', '아시아',
                    '해변', '온천', '사막', '정글', '빙하'
                ];
                
                return travelKeywords.some(keyword => 
                    title.toLowerCase().includes(keyword.toLowerCase())
                );
            },

            // 위치 정보 추출
            extractLocation(title) {
                const locationPatterns = {
                    '파리': { country: '프랑스', city: '파리', lat: 48.8566, lng: 2.3522 },
                    '런던': { country: '영국', city: '런던', lat: 51.5074, lng: -0.1278 },
                    '도쿄': { country: '일본', city: '도쿄', lat: 35.6762, lng: 139.6503 },
                    '뉴욕': { country: '미국', city: '뉴욕', lat: 40.7128, lng: -74.0060 },
                    '로마': { country: '이탈리아', city: '로마', lat: 41.9028, lng: 12.4964 },
                    '바르셀로나': { country: '스페인', city: '바르셀로나', lat: 41.3851, lng: 2.1734 },
                    '방콕': { country: '태국', city: '방콕', lat: 13.7563, lng: 100.5018 },
                    '시드니': { country: '호주', city: '시드니', lat: -33.8688, lng: 151.2093 },
                    '두바이': { country: 'UAE', city: '두바이', lat: 25.2048, lng: 55.2708 },
                    '제주도': { country: '한국', city: '제주', lat: 33.4996, lng: 126.5312 }
                };

                for (const [location, data] of Object.entries(locationPatterns)) {
                    if (title.includes(location)) {
                        return data;
                    }
                }

                return { country: '미정', city: '미정', lat: null, lng: null };
            },

            // 좌표 정보 가져오기
            getCoordinates(title) {
                const location = this.extractLocation(title);
                return location.lat && location.lng ? 
                    { lat: location.lat, lng: location.lng } : null;
            },

            // 추상적 꿈들 카테고리화
            categorizeAbstractGoals(goals) {
                const abstractGoals = goals.filter(goal => goal.category !== 'travel');
                
                const dreamRegions = {
                    creativity: {
                        name: '창의성의 영역',
                        color: '#FF6B6B',
                        goals: [],
                        keywords: ['그리기', '음악', '글쓰기', '디자인', '예술']
                    },
                    knowledge: {
                        name: '지식의 정원',
                        color: '#4ECDC4',
                        goals: [],
                        keywords: ['배우기', '공부', '언어', '기술', '독서']
                    },
                    wellness: {
                        name: '건강의 숲',
                        color: '#45B7D1',
                        goals: [],
                        keywords: ['운동', '건강', '다이어트', '명상', '요가']
                    },
                    social: {
                        name: '관계의 다리',
                        color: '#F7DC6F',
                        goals: [],
                        keywords: ['친구', '가족', '연인', '만나기', '소통']
                    },
                    adventure: {
                        name: '모험의 산맥',
                        color: '#BB8FCE',
                        goals: [],
                        keywords: ['도전', '스포츠', '액티비티', '경험', '극한']
                    },
                    achievement: {
                        name: '성취의 탑',
                        color: '#F8C471',
                        goals: [],
                        keywords: ['달성', '목표', '성공', '완성', '이루기']
                    }
                };

                abstractGoals.forEach(goal => {
                    let assigned = false;
                    for (const [regionKey, region] of Object.entries(dreamRegions)) {
                        if (region.keywords.some(keyword => 
                            goal.title.toLowerCase().includes(keyword))) {
                            region.goals.push(goal);
                            assigned = true;
                            break;
                        }
                    }
                    
                    if (!assigned) {
                        dreamRegions.achievement.goals.push(goal);
                    }
                });

                return dreamRegions;
            },

            // 목표 간 연결점 찾기
            findGoalConnections(goals) {
                const connections = [];
                
                for (let i = 0; i < goals.length; i++) {
                    for (let j = i + 1; j < goals.length; j++) {
                        const connection = this.analyzeConnection(goals[i], goals[j]);
                        if (connection.strength > 0.3) {
                            connections.push({
                                from: goals[i].id,
                                to: goals[j].id,
                                type: connection.type,
                                strength: connection.strength,
                                description: connection.description
                            });
                        }
                    }
                }
                
                return connections;
            },

            // 연결 분석
            analyzeConnection(goal1, goal2) {
                let strength = 0;
                let type = 'weak';
                let description = '';

                // 카테고리 연결
                if (goal1.category === goal2.category) {
                    strength += 0.4;
                    type = 'category';
                    description = '같은 분야의 목표';
                }

                // 키워드 연결
                const commonWords = this.findCommonKeywords(goal1.title, goal2.title);
                if (commonWords.length > 0) {
                    strength += commonWords.length * 0.2;
                    type = 'keyword';
                    description = `공통 키워드: ${commonWords.join(', ')}`;
                }

                // 시간적 연결 (비슷한 시기에 생성)
                const timeDiff = Math.abs(new Date(goal1.createdAt) - new Date(goal2.createdAt));
                if (timeDiff < 7 * 24 * 60 * 60 * 1000) { // 7일 이내
                    strength += 0.3;
                    type = 'temporal';
                    description = '비슷한 시기에 설정된 목표';
                }

                return { strength: Math.min(strength, 1), type, description };
            },

            // 공통 키워드 찾기
            findCommonKeywords(title1, title2) {
                const words1 = title1.toLowerCase().split(/\s+/);
                const words2 = title2.toLowerCase().split(/\s+/);
                
                return words1.filter(word => 
                    word.length > 2 && words2.includes(word)
                );
            },

            // 타임라인 뷰 생성
            createTimelineView(goals) {
                const now = new Date();
                const timeline = {
                    past: { period: '완료된 꿈들', goals: [] },
                    present: { period: '현재 진행중', goals: [] },
                    nearFuture: { period: '가까운 미래 (6개월)', goals: [] },
                    farFuture: { period: '먼 미래 (1년+)', goals: [] }
                };

                goals.forEach(goal => {
                    if (goal.completed) {
                        timeline.past.goals.push(goal);
                    } else if (goal.targetDate) {
                        const targetDate = new Date(goal.targetDate);
                        const monthsUntil = (targetDate - now) / (1000 * 60 * 60 * 24 * 30);
                        
                        if (monthsUntil <= 6) {
                            timeline.nearFuture.goals.push(goal);
                        } else {
                            timeline.farFuture.goals.push(goal);
                        }
                    } else {
                        timeline.present.goals.push(goal);
                    }
                });

                return timeline;
            },

            // 성취 매핑
            mapAchievements(goals) {
                const completedGoals = goals.filter(goal => goal.completed);
                
                return {
                    achievementClusters: this.createAchievementClusters(completedGoals),
                    milestones: this.identifyMilestones(completedGoals),
                    patterns: this.findAchievementPatterns(completedGoals),
                    celebration: this.getAchievementCelebrations(completedGoals)
                };
            },

            // 성취 클러스터 생성
            createAchievementClusters(completedGoals) {
                const clusters = {};
                
                completedGoals.forEach(goal => {
                    const month = new Date(goal.completedAt).toISOString().slice(0, 7);
                    if (!clusters[month]) {
                        clusters[month] = [];
                    }
                    clusters[month].push(goal);
                });

                return Object.entries(clusters).map(([month, goals]) => ({
                    period: month,
                    count: goals.length,
                    goals: goals,
                    intensity: this.calculateIntensity(goals)
                }));
            },

            // 강도 계산
            calculateIntensity(goals) {
                const weights = { travel: 3, career: 2.5, hobby: 2, health: 2, relationship: 1.5, other: 1 };
                const totalWeight = goals.reduce((sum, goal) => sum + (weights[goal.category] || 1), 0);
                return Math.min(totalWeight / goals.length, 3);
            },

            // 지도 구조 구축
            buildMapStructure(mapData) {
                return {
                    worldMap: {
                        travelGoals: mapData.travelGoals,
                        routes: this.createTravelRoutes(mapData.travelGoals),
                        heatmap: this.createTravelHeatmap(mapData.travelGoals)
                    },
                    dreamRealm: {
                        regions: mapData.abstractGoals,
                        pathways: this.createDreamPathways(mapData.abstractGoals),
                        landmarks: this.createDreamLandmarks(mapData.abstractGoals)
                    },
                    timeline: mapData.timeline,
                    achievements: mapData.achievements
                };
            },

            // 인터랙티브 요소 생성
            createInteractiveElements(mapData) {
                return {
                    hoverEffects: this.defineHoverEffects(),
                    clickActions: this.defineClickActions(),
                    filters: this.createMapFilters(),
                    animations: this.defineAnimations(),
                    tooltips: this.createTooltips(mapData)
                };
            },

            // 시각적 테마
            getVisualThemes() {
                return {
                    default: {
                        name: '기본 테마',
                        colors: {
                            primary: '#4A90E2',
                            secondary: '#F5A623',
                            success: '#7ED321',
                            background: '#F8F9FA'
                        }
                    },
                    space: {
                        name: '우주 테마',
                        colors: {
                            primary: '#2E1065',
                            secondary: '#7C3AED',
                            success: '#10B981',
                            background: '#0F0F23'
                        }
                    },
                    nature: {
                        name: '자연 테마',
                        colors: {
                            primary: '#059669',
                            secondary: '#D97706',
                            success: '#84CC16',
                            background: '#F0FDF4'
                        }
                    }
                };
            },

            // 네비게이션 옵션
            getNavigationOptions() {
                return {
                    viewModes: ['지도뷰', '타임라인뷰', '카테고리뷰', '성취뷰'],
                    zoomLevels: ['전체보기', '대륙별', '국가별', '도시별'],
                    filterOptions: ['모든 꿈', '진행중', '완료됨', '계획중'],
                    sortOptions: ['생성일순', '중요도순', '카테고리순', '진행률순']
                };
            }
        };

        // ========== 꿈 달성 축하 시스템 ==========
        
        // 꿈 달성 축하 시스템
        const CelebrationSystem = {
            // 개인화된 축하 생성
            createPersonalizedCelebration(goal) {
                const celebrationData = {
                    message: this.getCelebrationMessage(goal),
                    animation: this.getCustomAnimation(goal.category),
                    sharableCard: this.generateCelebrationCard(goal),
                    nextStepSuggestion: this.suggestNextStep(goal),
                    rewards: this.calculateRewards(goal),
                    socialSharing: this.createSocialShareOptions(goal),
                    personalizedElements: this.getPersonalizedElements(goal)
                };

                return celebrationData;
            },

            // 축하 메시지 생성
            getCelebrationMessage(goal) {
                const celebrationTypes = {
                    travel: {
                        primary: "🎊 새로운 세상을 경험하신 것을 축하합니다!",
                        secondary: "여행은 마음을 넓히고 시야를 확장시켜줍니다",
                        personal: `${goal.title}을(를) 달성하며 소중한 추억을 만드셨네요!`
                    },
                    hobby: {
                        primary: "🎨 새로운 재능을 발견하신 것을 축하합니다!",
                        secondary: "취미는 삶에 활력과 즐거움을 더해줍니다",
                        personal: `${goal.title}을(를) 통해 새로운 자신을 발견하셨네요!`
                    },
                    career: {
                        primary: "🚀 꿈에 한 걸음 더 가까워지신 것을 축하합니다!",
                        secondary: "노력과 성장이 멋진 결실을 맺었습니다",
                        personal: `${goal.title} 달성으로 전문성이 한층 높아졌습니다!`
                    },
                    health: {
                        primary: "💪 건강한 변화를 만드신 것을 축하합니다!",
                        secondary: "건강은 모든 꿈의 기초가 되는 소중한 자산입니다",
                        personal: `${goal.title}을(를) 통해 더욱 건강해지셨네요!`
                    },
                    relationship: {
                        primary: "❤️ 소중한 관계를 키우신 것을 축하합니다!",
                        secondary: "좋은 관계는 인생의 가장 큰 축복 중 하나입니다",
                        personal: `${goal.title}을(를) 통해 더 깊은 유대감을 만드셨네요!`
                    },
                    other: {
                        primary: "🌟 의미있는 목표를 달성하신 것을 축하합니다!",
                        secondary: "작은 성취도 큰 변화의 시작입니다",
                        personal: `${goal.title} 달성으로 한 단계 성장하셨습니다!`
                    }
                };

                const categoryMessages = celebrationTypes[goal.category] || celebrationTypes.other;
                
                return {
                    title: categoryMessages.primary,
                    subtitle: categoryMessages.secondary,
                    personalMessage: categoryMessages.personal,
                    motivationalQuote: this.getMotivationalQuote(goal.category),
                    achievementStats: this.getAchievementStats(goal)
                };
            },

            // 커스텀 애니메이션
            getCustomAnimation(category) {
                const animations = {
                    travel: {
                        type: 'airplane',
                        elements: ['✈️', '🗺️', '🎒', '📸'],
                        pattern: 'flyingPath',
                        duration: 3000,
                        colors: ['#4A90E2', '#F5A623', '#7ED321']
                    },
                    hobby: {
                        type: 'creativity',
                        elements: ['🎨', '🎵', '📚', '✨'],
                        pattern: 'spiraling',
                        duration: 2500,
                        colors: ['#E74C3C', '#9B59B6', '#F39C12']
                    },
                    career: {
                        type: 'rocket',
                        elements: ['🚀', '⭐', '🎯', '💼'],
                        pattern: 'launching',
                        duration: 3500,
                        colors: ['#2ECC71', '#3498DB', '#F1C40F']
                    },
                    health: {
                        type: 'vitality',
                        elements: ['💪', '❤️', '🌿', '⚡'],
                        pattern: 'pulsing',
                        duration: 2000,
                        colors: ['#27AE60', '#E67E22', '#16A085']
                    },
                    relationship: {
                        type: 'hearts',
                        elements: ['❤️', '👥', '🤝', '💝'],
                        pattern: 'floating',
                        duration: 2800,
                        colors: ['#E91E63', '#FF5722', '#FFC107']
                    },
                    other: {
                        type: 'celebration',
                        elements: ['🎉', '🌟', '✨', '🎊'],
                        pattern: 'bursting',
                        duration: 2200,
                        colors: ['#9C27B0', '#673AB7', '#3F51B5']
                    }
                };

                return animations[category] || animations.other;
            },

            // 축하 카드 생성
            generateCelebrationCard(goal) {
                const template = this.selectCardTemplate(goal);
                const personalData = this.gatherPersonalData(goal);
                
                return {
                    template: template,
                    content: {
                        title: goal.title,
                        completedDate: new Date(goal.completedAt).toLocaleDateString('ko-KR'),
                        category: this.getCategoryDisplayName(goal.category),
                        difficulty: this.assessDifficulty(goal),
                        timeTaken: this.calculateTimeTaken(goal),
                        personalNote: goal.notes || '',
                        achievement: this.formatAchievement(goal),
                        nextGoals: this.getRelatedGoals(goal)
                    },
                    styling: {
                        theme: this.getCardTheme(goal.category),
                        layout: this.getOptimalLayout(goal),
                        decorations: this.getThemeDecorations(goal.category)
                    },
                    sharing: {
                        socialText: this.generateSocialText(goal),
                        hashtags: this.generateHashtags(goal),
                        platforms: ['facebook', 'instagram', 'twitter', 'kakaotalk']
                    }
                };
            },

            // 다음 단계 제안
            suggestNextStep(goal) {
                const suggestions = {
                    travel: [
                        "같은 지역의 다른 도시도 탐험해보세요",
                        "현지 문화를 더 깊이 체험하는 목표를 세워보세요",
                        "여행 경험을 블로그나 일기로 기록해보세요"
                    ],
                    hobby: [
                        "배운 기술을 더욱 발전시켜보세요",
                        "같은 관심사를 가진 사람들과 교류해보세요",
                        "작품을 전시하거나 공유해보세요"
                    ],
                    career: [
                        "습득한 스킬을 실전에 적용해보세요",
                        "다음 단계의 전문성을 목표로 설정해보세요",
                        "경험을 다른 사람들과 공유하며 네트워킹을 확장해보세요"
                    ],
                    health: [
                        "건강한 습관을 유지하며 다른 영역으로 확장해보세요",
                        "더 도전적인 건강 목표를 설정해보세요",
                        "건강 여정을 가족이나 친구들과 함께 해보세요"
                    ],
                    relationship: [
                        "더 깊고 의미있는 관계로 발전시켜보세요",
                        "새로운 사람들과의 네트워크를 확장해보세요",
                        "관계에서 배운 것을 다른 관계에도 적용해보세요"
                    ]
                };

                const categoryS = suggestions[goal.category] || suggestions.career;
                const randomSuggestion = categoryS[Math.floor(Math.random() * categoryS.length)];
                
                return {
                    mainSuggestion: randomSuggestion,
                    relatedGoals: this.findRelatedGoalSuggestions(goal),
                    skillBuilding: this.suggestSkillBuilding(goal),
                    communityActions: this.suggestCommunityActions(goal),
                    longTermVision: this.suggestLongTermVision(goal)
                };
            },

            // 보상 계산
            calculateRewards(goal) {
                const basePoints = 100;
                const difficultyMultiplier = this.getDifficultyMultiplier(goal);
                const timeBonus = this.getTimeBonusMultiplier(goal);
                const categoryBonus = this.getCategoryBonus(goal.category);

                const totalPoints = Math.round(basePoints * difficultyMultiplier * timeBonus * categoryBonus);

                return {
                    points: totalPoints,
                    badges: this.determineBadges(goal),
                    achievements: this.checkAchievements(goal),
                    streaks: this.updateStreaks(goal),
                    levelUp: this.checkLevelUp(totalPoints),
                    specialRewards: this.getSpecialRewards(goal)
                };
            },

            // 소셜 공유 옵션
            createSocialShareOptions(goal) {
                return {
                    platforms: {
                        facebook: {
                            text: this.generateFacebookPost(goal),
                            image: this.generateShareImage(goal),
                            hashtags: this.generateHashtags(goal)
                        },
                        instagram: {
                            caption: this.generateInstagramCaption(goal),
                            story: this.generateInstagramStory(goal),
                            hashtags: this.generateHashtags(goal)
                        },
                        twitter: {
                            tweet: this.generateTweet(goal),
                            thread: this.generateTwitterThread(goal),
                            hashtags: this.generateHashtags(goal)
                        },
                        kakaotalk: {
                            message: this.generateKakaoMessage(goal),
                            template: this.getKakaoTemplate(goal)
                        }
                    },
                    customMessages: this.getCustomSharingMessages(goal),
                    privacyOptions: ['공개', '친구만', '비공개']
                };
            },

            // 개인화 요소
            getPersonalizedElements(goal) {
                const userProfile = currentProfile;
                
                return {
                    preferredCelebrationStyle: this.getUserCelebrationStyle(userProfile),
                    motivationalElements: this.getPersonalMotivators(userProfile),
                    visualPreferences: this.getVisualPreferences(userProfile),
                    communicationStyle: this.getCommunicationStyle(userProfile),
                    culturalElements: this.getCulturalElements(userProfile),
                    personalSymbols: this.getPersonalSymbols(goal, userProfile)
                };
            },

            // 동기부여 명언
            getMotivationalQuote(category) {
                const quotes = {
                    travel: [
                        "세상은 책과 같아서, 여행하지 않는 사람은 한 페이지만 읽는 것이다.",
                        "여행은 편견과 편협함, 좁은 사고의 치명적인 적이다.",
                        "우리는 여행을 떠나지만, 여행이 우리를 바꾼다."
                    ],
                    hobby: [
                        "모든 예술가는 한때 아마추어였다.",
                        "열정을 따라가면 목적이 따라온다.",
                        "창의성은 재미있게 실수하는 것이다."
                    ],
                    career: [
                        "성공은 목적지가 아니라 여정이다.",
                        "위대한 일을 하는 유일한 방법은 하는 일을 사랑하는 것이다.",
                        "꿈을 이루는 것은 불가능해 보일 때까지는 항상 불가능해 보인다."
                    ]
                };

                const categoryQuotes = quotes[category] || quotes.career;
                return categoryQuotes[Math.floor(Math.random() * categoryQuotes.length)];
            },

            // 카테고리 보너스
            getCategoryBonus(category) {
                const bonuses = {
                    travel: 1.3,    // 여행은 계획과 용기가 필요
                    career: 1.2,    // 커리어는 장기적 노력 필요
                    health: 1.1,    // 건강은 지속성이 중요
                    hobby: 1.0,     // 기본값
                    relationship: 1.1, // 관계는 상호작용이 필요
                    other: 1.0      // 기본값
                };

                return bonuses[category] || 1.0;
            },

            // 배지 결정
            determineBadges(goal) {
                const badges = [];
                
                // 카테고리 배지
                const categoryBadges = {
                    travel: '🌍 세계 탐험가',
                    hobby: '🎨 창의성 마스터',
                    career: '🚀 성취자',
                    health: '💪 웰니스 챔피언',
                    relationship: '❤️ 관계 빌더',
                    other: '⭐ 목표 달성자'
                };
                
                badges.push(categoryBadges[goal.category] || categoryBadges.other);
                
                // 난이도 배지
                const difficulty = this.assessDifficulty(goal);
                if (difficulty === 'hard') badges.push('🏆 도전자');
                if (difficulty === 'expert') badges.push('👑 마스터');
                
                // 시간 배지
                const timeTaken = this.calculateTimeTaken(goal);
                if (timeTaken < 30) badges.push('⚡ 신속 달성');
                if (timeTaken > 365) badges.push('🎯 끈기왕');
                
                return badges;
            }
        };

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
            } else if (tabName === 'journey') {
                initJourneyTab();
            } else if (tabName === 'insights') {
                initInsightsTab();
            } else if (tabName === 'social') {
                initSocialTab();
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

        // ========== 새 탭 초기화 함수들 ==========
        
        // 꿈의 여정 탭 초기화
        function initJourneyTab() {
            if (!currentProfile) return;
            
            updateJourneyStats();
            renderAchievementTimeline();
            updateCategoryProgress();
            updateDailyInspiration();
        }
        
        // 인사이트 탭 초기화  
        function initInsightsTab() {
            if (!currentProfile) return;
            
            try {
                renderAchievementChart();
                renderEmotionChart();
                renderTimePatternChart();
                renderCategoryDistributionChart();
                updatePersonalInsights();
                updatePredictionCards();
            } catch (error) {
                console.error('인사이트 탭 초기화 오류:', error);
            }
        }
        
        // 소셜 탭 초기화
        function initSocialTab() {
            if (!currentProfile) return;
            
            try {
                loadFamilyMembersUI();
                loadSharedGoalsUI();
                loadFamilyChallengesUI();
                loadEncouragementWall();
                setupSocialEventHandlers();
            } catch (error) {
                console.error('소셜 탭 초기화 오류:', error);
            }
        }
        
        // 꿈 지도 렌더링
        function renderDreamMap(dreamMap) {
            const container = document.querySelector('#journey-tab .dream-map-container');
            if (!container) return;
            
            // 기본 지도 구조 생성
            container.innerHTML = `
                <div class="map-controls">
                    <button onclick="switchMapView('world')" class="map-btn active">🌍 세계지도</button>
                    <button onclick="switchMapView('dream')" class="map-btn">✨ 꿈의 영역</button>
                    <button onclick="switchMapView('timeline')" class="map-btn">📅 타임라인</button>
                </div>
                <div class="map-display">
                    <div id="world-map" class="map-view active">
                        <h3>여행 꿈 지도</h3>
                        <div class="travel-goals"></div>
                    </div>
                    <div id="dream-realm" class="map-view">
                        <h3>꿈의 영역</h3>
                        <div class="dream-regions"></div>
                    </div>
                    <div id="timeline-view" class="map-view">
                        <h3>꿈의 타임라인</h3>
                        <div class="timeline-container"></div>
                    </div>
                </div>
            `;
            
            // 여행 목표 표시
            renderTravelGoals(dreamMap.mapStructure.worldMap.travelGoals);
            
            // 꿈의 영역 표시
            renderDreamRegions(dreamMap.mapStructure.dreamRealm.regions);
            
            // 타임라인 표시
            renderTimeline(dreamMap.mapStructure.timeline);
        }
        
        // 여행 목표 렌더링
        function renderTravelGoals(travelGoals) {
            const container = document.querySelector('.travel-goals');
            if (!container) return;
            
            container.innerHTML = travelGoals.map(goal => `
                <div class="travel-goal" data-lat="${goal.coordinates?.lat}" data-lng="${goal.coordinates?.lng}">
                    <div class="goal-marker ${goal.completed ? 'completed' : 'pending'}">
                        📍
                    </div>
                    <div class="goal-info">
                        <h4>${goal.title}</h4>
                        <p>${goal.location?.country || '미정'} - ${goal.location?.city || '미정'}</p>
                        <span class="status">${goal.completed ? '완료' : '계획중'}</span>
                    </div>
                </div>
            `).join('');
        }
        
        // 꿈의 영역 렌더링
        function renderDreamRegions(regions) {
            const container = document.querySelector('.dream-regions');
            if (!container) return;
            
            container.innerHTML = Object.entries(regions).map(([key, region]) => `
                <div class="dream-region" style="border-color: ${region.color}">
                    <h4>${region.name}</h4>
                    <div class="region-goals">
                        ${region.goals.map(goal => `
                            <div class="region-goal ${goal.completed ? 'completed' : 'pending'}">
                                <span class="goal-title">${goal.title}</span>
                                <span class="goal-status">${goal.completed ? '✅' : '⏳'}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div class="region-stats">
                        총 ${region.goals.length}개 목표
                        (완료: ${region.goals.filter(g => g.completed).length}개)
                    </div>
                </div>
            `).join('');
        }
        
        // 타임라인 렌더링
        function renderTimeline(timeline) {
            const container = document.querySelector('.timeline-container');
            if (!container) return;
            
            container.innerHTML = Object.entries(timeline).map(([key, period]) => `
                <div class="timeline-period">
                    <h4>${period.period}</h4>
                    <div class="period-goals">
                        ${period.goals.map(goal => `
                            <div class="timeline-goal ${goal.completed ? 'completed' : 'pending'}">
                                <div class="goal-marker"></div>
                                <div class="goal-content">
                                    <span class="goal-title">${goal.title}</span>
                                    <span class="goal-date">
                                        ${goal.completedAt ? new Date(goal.completedAt).toLocaleDateString('ko-KR') : 
                                          goal.targetDate ? new Date(goal.targetDate).toLocaleDateString('ko-KR') : '날짜 미정'}
                                    </span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('');
        }
        
        // ========== 여정 탭 실제 DOM 연결 함수들 ==========
        
        // 여정 통계 업데이트
        function updateJourneyStats() {
            if (!currentProfile || !currentProfile.bucketList) return;
            
            const goals = currentProfile.bucketList;
            const completed = goals.filter(g => g.completed);
            
            // 꿈을 키운 일수 계산
            const firstGoalDate = goals.length > 0 ? new Date(goals[0].createdAt) : new Date();
            const daysSinceStart = Math.floor((new Date() - firstGoalDate) / (1000 * 60 * 60 * 24));
            
            // 연속 달성 기록 계산
            let streak = 0;
            if (completed.length > 0) {
                const sortedCompleted = completed
                    .filter(goal => goal.completedAt)
                    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
                
                for (let i = 0; i < sortedCompleted.length; i++) {
                    const completedDate = new Date(sortedCompleted[i].completedAt);
                    const daysDiff = Math.floor((new Date() - completedDate) / (1000 * 60 * 60 * 24));
                    if (daysDiff <= 30) streak++;
                    else break;
                }
            }
            
            // 마일스톤 계산 (5개씩)
            const milestones = Math.floor(completed.length / 5);
            
            // DOM 업데이트
            const journeyDaysEl = document.getElementById('journeyDays');
            const journeyStreakEl = document.getElementById('journeyStreak');
            const journeyMilestonesEl = document.getElementById('journeyMilestones');
            
            if (journeyDaysEl) journeyDaysEl.textContent = daysSinceStart;
            if (journeyStreakEl) journeyStreakEl.textContent = streak;
            if (journeyMilestonesEl) journeyMilestonesEl.textContent = milestones;
        }
        
        // 달성 타임라인 렌더링 (개선된 간결한 버전)
        function renderAchievementTimeline() {
            const container = document.getElementById('achievementTimeline');
            if (!container || !currentProfile) return;
            
            const completed = currentProfile.bucketList
                .filter(goal => goal.completed && goal.completedAt)
                .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
                .slice(0, 10);
            
            if (completed.length === 0) {
                container.innerHTML = '<p class="empty-timeline">아직 완료된 목표가 없습니다. 첫 번째 목표를 달성해보세요!</p>';
                return;
            }
            
            container.innerHTML = completed.map(goal => `
                <div class="timeline-item">
                    <div class="timeline-dot ${goal.category}"></div>
                    <div class="timeline-content">
                        <h4>${goal.title}</h4>
                        <p class="timeline-date">${new Date(goal.completedAt).toLocaleDateString('ko-KR')}</p>
                        <span class="timeline-category">${getCategoryDisplayName(goal.category)}</span>
                    </div>
                </div>
            `).join('');
        }
        
        // 카테고리별 진행 현황 업데이트
        function updateCategoryProgress() {
            const container = document.getElementById('categoryProgressGrid');
            if (!container || !currentProfile) return;
            
            const categoryStats = {};
            currentProfile.bucketList.forEach(goal => {
                if (!categoryStats[goal.category]) {
                    categoryStats[goal.category] = { total: 0, completed: 0 };
                }
                categoryStats[goal.category].total++;
                if (goal.completed) categoryStats[goal.category].completed++;
            });
            
            if (Object.keys(categoryStats).length === 0) {
                container.innerHTML = '<p class="empty-state">아직 목표가 없습니다. 새로운 목표를 추가해보세요!</p>';
                return;
            }
            
            container.innerHTML = Object.entries(categoryStats).map(([category, stats]) => {
                const percentage = Math.round((stats.completed / stats.total) * 100);
                return `
                    <div class="category-progress-card">
                        <h4>${getCategoryDisplayName(category)}</h4>
                        <div class="progress-bar">
                            <div class="progress-fill ${category}" style="width: ${percentage}%"></div>
                        </div>
                        <div class="progress-text">${stats.completed}/${stats.total} (${percentage}%)</div>
                    </div>
                `;
            }).join('');
        }
        
        // 오늘의 영감 업데이트
        function updateDailyInspiration() {
            const quoteEl = document.getElementById('inspirationQuote');
            const authorEl = document.getElementById('inspirationAuthor');
            
            if (!quoteEl || !authorEl) return;
            
            const inspirations = [
                { quote: "꿈을 이루는 것이 중요한 게 아니라, 꿈을 향해 걸어가는 여정 자체가 당신을 성장시킵니다.", author: "버킷 드림즈" },
                { quote: "위대한 일을 하는 유일한 방법은 하는 일을 사랑하는 것이다.", author: "스티브 잡스" },
                { quote: "성공은 목적지가 아니라 여정이다.", author: "아서 애시" },
                { quote: "꿈을 이룰 수 있다고 믿는 순간, 그것은 현실이 된다.", author: "윌 스미스" },
                { quote: "작은 걸음도 앞으로 나아가는 것이다.", author: "마틴 루터 킹" },
                { quote: "오늘 할 수 있는 일을 내일로 미루지 마라.", author: "벤자민 프랭클린" },
                { quote: "모든 성취의 시작점은 열망이다.", author: "나폴레온 힐" },
                { quote: "실패는 성공으로 가는 길에 있는 하나의 과정일 뿐이다.", author: "토마스 에디슨" },
                { quote: "변화를 원한다면 먼저 자신이 그 변화가 되어야 한다.", author: "마하트마 간디" },
                { quote: "중요한 것은 넘어지는 것이 아니라 다시 일어서는 것이다.", author: "콘퓨시어스" }
            ];
            
            const today = new Date().getDate();
            const todayInspiration = inspirations[today % inspirations.length];
            
            quoteEl.textContent = `"${todayInspiration.quote}"`;
            authorEl.textContent = `- ${todayInspiration.author}`;
        }
        
        // ========== 인사이트 탭 실제 DOM 연결 함수들 ==========
        
        // 달성률 분석 차트
        function renderAchievementChart() {
            const chartContainer = document.getElementById('achievementChart');
            if (!chartContainer || !currentProfile) return;
            
            try {
                const goals = currentProfile.bucketList;
                const completed = goals.filter(g => g.completed).length;
                const inProgress = goals.length - completed;
                
                if (window.Chart) {
                    const ctx = chartContainer.getContext('2d');
                    new Chart(ctx, {
                        type: 'doughnut',
                        data: {
                            labels: ['완료', '진행중'],
                            datasets: [{
                                data: [completed, inProgress],
                                backgroundColor: ['#4CAF50', '#FFC107']
                            }]
                        },
                        options: {
                            responsive: true,
                            plugins: {
                                legend: { position: 'bottom' }
                            }
                        }
                    });
                }
            } catch (error) {
                console.error('달성률 차트 오류:', error);
                chartContainer.innerHTML = '<p>차트를 로드할 수 없습니다.</p>';
            }
        }
        
        // 감정 패턴 차트
        function renderEmotionChart() {
            const chartContainer = document.getElementById('emotionChart');
            if (!chartContainer || !currentProfile) return;
            
            try {
                const emotionData = {};
                currentProfile.bucketList.forEach(goal => {
                    if (goal.emotions && goal.emotions.length > 0) {
                        goal.emotions.forEach(emotion => {
                            emotionData[emotion.emotion] = (emotionData[emotion.emotion] || 0) + 1;
                        });
                    }
                });
                
                if (window.Chart && Object.keys(emotionData).length > 0) {
                    const ctx = chartContainer.getContext('2d');
                    new Chart(ctx, {
                        type: 'bar',
                        data: {
                            labels: Object.keys(emotionData),
                            datasets: [{
                                label: '감정 빈도',
                                data: Object.values(emotionData),
                                backgroundColor: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7']
                            }]
                        },
                        options: {
                            responsive: true,
                            scales: {
                                y: { beginAtZero: true }
                            }
                        }
                    });
                } else {
                    chartContainer.innerHTML = '<p>감정 데이터가 없습니다.</p>';
                }
            } catch (error) {
                console.error('감정 차트 오류:', error);
                chartContainer.innerHTML = '<p>차트를 로드할 수 없습니다.</p>';
            }
        }
        
        // 달성 시간 패턴 차트
        function renderTimePatternChart() {
            const chartContainer = document.getElementById('timePatternChart');
            if (!chartContainer || !currentProfile) return;
            
            try {
                const completed = currentProfile.bucketList.filter(g => g.completed);
                const monthlyData = {};
                
                completed.forEach(goal => {
                    const month = new Date(goal.completedAt).toISOString().slice(0, 7);
                    monthlyData[month] = (monthlyData[month] || 0) + 1;
                });
                
                if (window.Chart && Object.keys(monthlyData).length > 0) {
                    const ctx = chartContainer.getContext('2d');
                    new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: Object.keys(monthlyData).sort(),
                            datasets: [{
                                label: '월별 달성 수',
                                data: Object.keys(monthlyData).sort().map(month => monthlyData[month]),
                                borderColor: '#36A2EB',
                                tension: 0.1
                            }]
                        },
                        options: {
                            responsive: true,
                            scales: {
                                y: { beginAtZero: true }
                            }
                        }
                    });
                } else {
                    chartContainer.innerHTML = '<p>시간 패턴 데이터가 없습니다.</p>';
                }
            } catch (error) {
                console.error('시간 패턴 차트 오류:', error);
                chartContainer.innerHTML = '<p>차트를 로드할 수 없습니다.</p>';
            }
        }
        
        // 카테고리 분포 차트
        function renderCategoryDistributionChart() {
            const chartContainer = document.getElementById('categoryDistributionChart');
            if (!chartContainer || !currentProfile) return;
            
            try {
                const categoryData = {};
                currentProfile.bucketList.forEach(goal => {
                    const category = getCategoryDisplayName(goal.category);
                    categoryData[category] = (categoryData[category] || 0) + 1;
                });
                
                if (window.Chart && Object.keys(categoryData).length > 0) {
                    const ctx = chartContainer.getContext('2d');
                    new Chart(ctx, {
                        type: 'pie',
                        data: {
                            labels: Object.keys(categoryData),
                            datasets: [{
                                data: Object.values(categoryData),
                                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40']
                            }]
                        },
                        options: {
                            responsive: true,
                            plugins: {
                                legend: { position: 'bottom' }
                            }
                        }
                    });
                } else {
                    chartContainer.innerHTML = '<p>카테고리 데이터가 없습니다.</p>';
                }
            } catch (error) {
                console.error('카테고리 분포 차트 오류:', error);
                chartContainer.innerHTML = '<p>차트를 로드할 수 없습니다.</p>';
            }
        }
        
        // 개인화된 인사이트 업데이트
        function updatePersonalInsights() {
            const container = document.getElementById('personalInsights');
            if (!container || !currentProfile) return;
            
            try {
                const goals = currentProfile.bucketList;
                const completed = goals.filter(g => g.completed);
                const insights = [];
                
                // 달성률 인사이트
                const completionRate = Math.round((completed.length / goals.length) * 100) || 0;
                if (completionRate >= 80) {
                    insights.push({ icon: '🎉', text: `놀라운 달성률 ${completionRate}%! 당신은 목표 달성의 달인입니다.` });
                } else if (completionRate >= 50) {
                    insights.push({ icon: '📈', text: `꾸준한 성과 ${completionRate}%! 조금만 더 노력하면 목표 달인이 될 수 있어요.` });
                } else {
                    insights.push({ icon: '💪', text: `시작이 반! ${completionRate}%의 달성률로 좋은 출발을 하셨네요.` });
                }
                
                // 카테고리 인사이트
                const categoryStats = {};
                goals.forEach(goal => {
                    categoryStats[goal.category] = (categoryStats[goal.category] || 0) + 1;
                });
                const favoriteCategory = Object.entries(categoryStats).sort((a, b) => b[1] - a[1])[0];
                if (favoriteCategory) {
                    insights.push({ 
                        icon: '🎯', 
                        text: `${getCategoryDisplayName(favoriteCategory[0])} 분야에 가장 많은 관심을 보이고 계시네요!` 
                    });
                }
                
                // 시간 인사이트
                if (completed.length >= 2) {
                    const avgTime = completed.reduce((sum, goal) => {
                        const created = new Date(goal.createdAt);
                        const completedDate = new Date(goal.completedAt);
                        return sum + (completedDate - created) / (1000 * 60 * 60 * 24);
                    }, 0) / completed.length;
                    
                    insights.push({ 
                        icon: '⏰', 
                        text: `평균 ${Math.round(avgTime)}일만에 목표를 달성하시는군요! ${avgTime < 30 ? '빠른 실행력이 인상적입니다.' : '신중하게 목표를 완성해나가시는 스타일이네요.'}` 
                    });
                }
                
                container.innerHTML = insights.map(insight => `
                    <div class="insight-item">
                        <div class="insight-icon">${insight.icon}</div>
                        <div class="insight-text">${insight.text}</div>
                    </div>
                `).join('');
            } catch (error) {
                console.error('개인화된 인사이트 오류:', error);
                container.innerHTML = '<p>인사이트를 생성할 수 없습니다.</p>';
            }
        }
        
        // 달성 예측 카드 업데이트
        function updatePredictionCards() {
            const container = document.getElementById('predictionCards');
            if (!container || !currentProfile) return;
            
            try {
                const activeGoals = currentProfile.bucketList.filter(g => !g.completed);
                const predictions = [];
                
                activeGoals.slice(0, 3).forEach(goal => {
                    try {
                        const probability = SmartPlanner.predictSuccessProbability(goal, currentProfile);
                        const actionPlan = SmartPlanner.generateActionPlan(goal);
                        
                        predictions.push({
                            goal: goal.title,
                            probability: Math.round(probability * 100),
                            nextStep: actionPlan.steps[0] || '계획을 세워보세요',
                            timeframe: actionPlan.timeframe || '미정'
                        });
                    } catch (error) {
                        console.error('예측 생성 오류:', error);
                    }
                });
                
                if (predictions.length === 0) {
                    container.innerHTML = '<p>예측할 수 있는 진행중인 목표가 없습니다.</p>';
                    return;
                }
                
                container.innerHTML = predictions.map(pred => `
                    <div class="prediction-card">
                        <h4>${pred.goal}</h4>
                        <div class="prediction-probability">
                            <span class="probability-value">${pred.probability}%</span>
                            <span class="probability-label">성공 확률</span>
                        </div>
                        <div class="prediction-next-step">
                            <strong>다음 단계:</strong> ${pred.nextStep}
                        </div>
                        <div class="prediction-timeframe">
                            <strong>예상 기간:</strong> ${pred.timeframe}
                        </div>
                    </div>
                `).join('');
            } catch (error) {
                console.error('예측 카드 오류:', error);
                container.innerHTML = '<p>예측을 생성할 수 없습니다.</p>';
            }
        }
        
        // 추천 섹션 업데이트
        function updateRecommendationsSection() {
            const container = document.querySelector('#smartRecommendations');
            if (!container || !currentProfile) return;
            
            try {
                const userPattern = DreamRecommendationEngine.analyzeUserPatterns(currentProfile);
                const recommendations = DreamRecommendationEngine.suggestNewDreams(userPattern);
                
                container.innerHTML = `
                    <h3>맞춤 추천 꿈</h3>
                    <div class="recommendations-list">
                        ${recommendations.slice(0, 3).map(rec => `
                            <div class="recommendation-card" onclick="addRecommendedGoal('${rec.title}', '${rec.category}')">
                                <div class="rec-icon">${rec.icon || '⭐'}</div>
                                <div class="rec-content">
                                    <h4>${rec.title}</h4>
                                    <p>${rec.description}</p>
                                    <div class="rec-score">추천도: ${Math.round(rec.score * 100)}%</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            } catch (error) {
                console.error('추천 섹션 업데이트 오류:', error);
                container.innerHTML = '<p>추천을 생성할 수 없습니다.</p>';
            }
        }
        
        // 감정적 인사이트 업데이트
        function updateEmotionalInsights() {
            const container = document.querySelector('#emotionalInsights');
            if (!container || !currentProfile) return;
            
            try {
                const recentGoals = currentProfile.bucketList
                    .filter(goal => goal.completedAt)
                    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
                    .slice(0, 5);
                
                const insights = recentGoals.map(goal => {
                    const pattern = EmotionalJourney.analyzeEmotionalPattern(goal);
                    return {
                        goal: goal.title,
                        emotion: pattern.dominantEmotion,
                        trend: pattern.trend,
                        message: EmotionalJourney.getMotivationalMessage(goal)
                    };
                });
                
                container.innerHTML = `
                    <h3>감정적 인사이트</h3>
                    <div class="insights-list">
                        ${insights.map(insight => `
                            <div class="insight-card">
                                <div class="insight-emotion">${insight.emotion}</div>
                                <div class="insight-content">
                                    <h4>${insight.goal}</h4>
                                    <p>${insight.message}</p>
                                    <span class="trend ${insight.trend}">${insight.trend === 'up' ? '📈' : '📊'}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            } catch (error) {
                console.error('감정적 인사이트 업데이트 오류:', error);
                container.innerHTML = '<p>인사이트를 생성할 수 없습니다.</p>';
            }
        }
        
        // 통계 계산 및 표시
        function calculateAndDisplayStats() {
            const statsContainer = document.querySelector('#insights-tab .stats-overview');
            if (!statsContainer || !currentProfile) return;
            
            const goals = currentProfile.bucketList;
            const completed = goals.filter(g => g.completed);
            const avgCompletionTime = completed.length > 0 ? 
                completed.reduce((sum, goal) => {
                    const created = new Date(goal.createdAt);
                    const completedDate = new Date(goal.completedAt);
                    return sum + (completedDate - created) / (1000 * 60 * 60 * 24);
                }, 0) / completed.length : 0;
            
            statsContainer.innerHTML = `
                <div class="stat-card">
                    <div class="stat-value">${Math.round(avgCompletionTime)}</div>
                    <div class="stat-label">평균 달성 일수</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${currentProfile.bucketList.filter(g => g.category === 'travel').length}</div>
                    <div class="stat-label">여행 목표</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${currentProfile.bucketList.filter(g => g.category === 'hobby').length}</div>
                    <div class="stat-label">취미 목표</div>
                </div>
            `;
        }
        
        // ========== 소셜 탭 실제 DOM 연결 함수들 ==========
        
        // 가족 구성원 UI 로드 (실제 HTML ID와 연결)
        function loadFamilyMembersUI() {
            const container = document.getElementById('familyMembers');
            if (!container) return;
            
            try {
                const familyMembers = DreamSocialNetwork.getFamilyMembers();
                
                if (familyMembers.length === 0) {
                    container.innerHTML = `
                        <div class="empty-family">
                            <p>아직 가족 구성원이 없습니다.</p>
                            <p>가족과 함께 꿈을 공유해보세요!</p>
                        </div>
                    `;
                    return;
                }
                
                container.innerHTML = familyMembers.map(member => `
                    <div class="family-member-card">
                        <div class="member-avatar">${member.avatar || '👤'}</div>
                        <div class="member-info">
                            <h4>${member.name}</h4>
                            <p>${member.relationship}</p>
                            <span class="connection-status ${member.connectionStatus}">
                                ${member.connectionStatus === 'active' ? '🟢 온라인' : '⚪ 오프라인'}
                            </span>
                        </div>
                        <div class="member-actions">
                            <button onclick="shareDreamWithMember('${member.id}')" class="btn-small">공유</button>
                            <button onclick="sendMessage('${member.id}')" class="btn-small">메시지</button>
                        </div>
                    </div>
                `).join('');
            } catch (error) {
                console.error('가족 구성원 로드 오류:', error);
                container.innerHTML = '<p>가족 구성원을 로드할 수 없습니다.</p>';
            }
        }
        
        // 공유된 목표 UI 로드
        function loadSharedGoalsUI() {
            const container = document.getElementById('sharedGoals');
            if (!container) return;
            
            try {
                const sharedGoals = DreamSocialNetwork.getSharedGoals();
                
                if (sharedGoals.length === 0) {
                    container.innerHTML = `
                        <div class="empty-shared">
                            <p>아직 공유된 목표가 없습니다.</p>
                            <p>가족과 목표를 공유하여 서로 응원해보세요!</p>
                        </div>
                    `;
                    return;
                }
                
                container.innerHTML = sharedGoals.map(goal => `
                    <div class="shared-goal-card">
                        <div class="goal-header">
                            <h4>${goal.title}</h4>
                            <span class="shared-by">by ${goal.sharedBy}</span>
                        </div>
                        <div class="goal-details">
                            <p class="goal-category">${getCategoryDisplayName(goal.category)}</p>
                            <p class="share-date">공유일: ${new Date(goal.sharedAt).toLocaleDateString('ko-KR')}</p>
                        </div>
                        <div class="goal-actions">
                            <button onclick="addEncouragement('${goal.id}')" class="btn-encourage">👏 응원</button>
                            <button onclick="adoptGoal('${goal.id}')" class="btn-adopt">📌 내 목표로</button>
                        </div>
                        ${goal.encouragements ? `
                            <div class="encouragements">
                                ${goal.encouragements.slice(0, 2).map(enc => `
                                    <div class="encouragement-item">
                                        <strong>${enc.from}:</strong> ${enc.message}
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                `).join('');
            } catch (error) {
                console.error('공유된 목표 로드 오류:', error);
                container.innerHTML = '<p>공유된 목표를 로드할 수 없습니다.</p>';
            }
        }
        
        // 가족 챌린지 UI 로드
        function loadFamilyChallengesUI() {
            const container = document.getElementById('familyChallenges');
            if (!container) return;
            
            try {
                const challenges = DreamSocialNetwork.getActiveChallenges();
                
                if (challenges.length === 0) {
                    container.innerHTML = `
                        <div class="empty-challenges">
                            <p>진행중인 가족 챌린지가 없습니다.</p>
                            <p>새로운 챌린지를 만들어 함께 도전해보세요!</p>
                        </div>
                    `;
                    return;
                }
                
                container.innerHTML = challenges.map(challenge => `
                    <div class="challenge-card">
                        <div class="challenge-header">
                            <h4>${challenge.title}</h4>
                            <span class="challenge-status">${challenge.status || 'active'}</span>
                        </div>
                        <p class="challenge-description">${challenge.description}</p>
                        <div class="challenge-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${challenge.progress || 0}%"></div>
                            </div>
                            <span class="progress-text">${challenge.progress || 0}% 완료</span>
                        </div>
                        <div class="challenge-participants">
                            <strong>참여자:</strong> ${challenge.participants ? challenge.participants.join(', ') : '없음'}
                        </div>
                        <div class="challenge-actions">
                            <button onclick="updateChallengeProgress('${challenge.id}')" class="btn-update">진행 업데이트</button>
                            <button onclick="viewChallengeDetails('${challenge.id}')" class="btn-details">상세 보기</button>
                        </div>
                    </div>
                `).join('');
            } catch (error) {
                console.error('가족 챌린지 로드 오류:', error);
                container.innerHTML = '<p>챌린지를 로드할 수 없습니다.</p>';
            }
        }
        
        // 응원 메시지 벽 로드
        function loadEncouragementWall() {
            const container = document.getElementById('encouragementWall');
            if (!container) return;
            
            try {
                // 최근 응원 메시지들을 가져옴 (실제로는 localStorage에서)
                const encouragements = JSON.parse(localStorage.getItem('encouragements') || '[]');
                
                if (encouragements.length === 0) {
                    container.innerHTML = `
                        <div class="empty-encouragement">
                            <p>아직 응원 메시지가 없습니다.</p>
                            <p>가족의 목표에 응원 메시지를 남겨보세요!</p>
                        </div>
                    `;
                    return;
                }
                
                const recent = encouragements.slice(-10).reverse(); // 최근 10개
                
                container.innerHTML = recent.map(enc => `
                    <div class="encouragement-message">
                        <div class="message-header">
                            <strong>${enc.from}</strong>
                            <span class="message-time">${new Date(enc.timestamp).toLocaleDateString('ko-KR')}</span>
                        </div>
                        <div class="message-content">${enc.message}</div>
                        <div class="message-target">→ ${enc.targetGoal}</div>
                    </div>
                `).join('');
            } catch (error) {
                console.error('응원 메시지 로드 오류:', error);
                container.innerHTML = '<p>응원 메시지를 로드할 수 없습니다.</p>';
            }
        }
        
        // 소셜 챌린지 업데이트
        function updateSocialChallenges() {
            const container = document.querySelector('#socialChallenges');
            if (!container) return;
            
            try {
                const challenges = DreamSocialNetwork.getActiveChallenges();
                
                container.innerHTML = `
                    <div class="challenges-header">
                        <h3>가족 챌린지</h3>
                        <button onclick="showCreateChallengeModal()" class="create-challenge-btn">+ 새 챌린지</button>
                    </div>
                    <div class="challenges-list">
                        ${challenges.map(challenge => `
                            <div class="challenge-card">
                                <h4>${challenge.title}</h4>
                                <p>${challenge.description}</p>
                                <div class="challenge-progress">
                                    <div class="progress-bar">
                                        <div class="progress-fill" style="width: ${challenge.progress}%"></div>
                                    </div>
                                    <span>${challenge.progress}% 완료</span>
                                </div>
                                <div class="challenge-participants">
                                    참여자: ${challenge.participants.join(', ')}
                                </div>
                            </div>
                        `).join('')}
                        ${challenges.length === 0 ? '<p class="no-challenges">진행중인 챌린지가 없습니다.</p>' : ''}
                    </div>
                `;
            } catch (error) {
                console.error('소셜 챌린지 업데이트 오류:', error);
                container.innerHTML = '<p>챌린지를 로드할 수 없습니다.</p>';
            }
        }
        
        // 공유된 목표 로드
        function loadSharedGoals() {
            const container = document.querySelector('#sharedGoalsList');
            if (!container) return;
            
            try {
                const sharedGoals = DreamSocialNetwork.getSharedGoals();
                
                container.innerHTML = `
                    <h3>공유된 꿈들</h3>
                    <div class="shared-goals">
                        ${sharedGoals.map(goal => `
                            <div class="shared-goal">
                                <div class="goal-content">
                                    <h4>${goal.title}</h4>
                                    <p>공유자: ${goal.sharedBy}</p>
                                    <span class="share-date">${new Date(goal.sharedAt).toLocaleDateString('ko-KR')}</span>
                                </div>
                                <div class="goal-actions">
                                    <button onclick="addEncouragement('${goal.id}')">응원하기</button>
                                    <button onclick="adoptGoal('${goal.id}')">내 목표로 추가</button>
                                </div>
                            </div>
                        `).join('')}
                        ${sharedGoals.length === 0 ? '<p class="no-shared">공유된 꿈이 없습니다.</p>' : ''}
                    </div>
                `;
            } catch (error) {
                console.error('공유된 목표 로드 오류:', error);
                container.innerHTML = '<p>공유된 목표를 로드할 수 없습니다.</p>';
            }
        }
        
        // 소셜 이벤트 핸들러 설정 (실제 HTML 버튼과 연결)
        function setupSocialEventHandlers() {
            // 실제 HTML의 가족 추가 버튼 연결
            const addFamilyBtn = document.getElementById('addFamilyBtn');
            if (addFamilyBtn) {
                addFamilyBtn.onclick = function() {
                    showAddFamilyModal();
                };
            }
            
            // 실제 HTML의 챌린지 생성 버튼 연결
            const createChallengeBtn = document.getElementById('createChallengeBtn');
            if (createChallengeBtn) {
                createChallengeBtn.onclick = function() {
                    showCreateChallengeModal();
                };
            }
            
            // 가족 추가 모달
            window.showAddFamilyModal = function() {
                const name = prompt('가족 구성원의 이름을 입력하세요:');
                if (name) {
                    const relationship = prompt('관계를 입력하세요 (예: 아버지, 어머니, 형, 누나 등):');
                    if (relationship) {
                        try {
                            DreamSocialNetwork.addFamilyMember({
                                name: name,
                                relationship: relationship,
                                avatar: '👤',
                                connectionStatus: 'offline'
                            });
                            alert(`${name}님이 가족 구성원으로 추가되었습니다!`);
                            loadFamilyMembersUI(); // UI 새로고침
                        } catch (error) {
                            console.error('가족 구성원 추가 오류:', error);
                            alert('가족 구성원 추가에 실패했습니다.');
                        }
                    }
                }
            };
            
            // 챌린지 생성 모달
            window.showCreateChallengeModal = function() {
                const title = prompt('챌린지 제목을 입력하세요:');
                if (title) {
                    const description = prompt('챌린지 설명을 입력하세요:');
                    if (description) {
                        try {
                            DreamSocialNetwork.createFamilyChallenge({
                                title: title,
                                description: description,
                                creator: currentProfile.name,
                                participants: [currentProfile.name],
                                progress: 0,
                                status: 'active'
                            });
                            alert('새로운 가족 챌린지가 생성되었습니다!');
                            loadFamilyChallengesUI(); // UI 새로고침
                        } catch (error) {
                            console.error('챌린지 생성 오류:', error);
                            alert('챌린지 생성에 실패했습니다.');
                        }
                    }
                }
            };
            
            // 응원 메시지 추가
            window.addEncouragement = function(goalId) {
                const message = prompt('응원 메시지를 입력하세요:');
                if (message && message.trim()) {
                    try {
                        // 응원 메시지를 localStorage에 저장
                        const encouragements = JSON.parse(localStorage.getItem('encouragements') || '[]');
                        const newEncouragement = {
                            id: Date.now().toString(),
                            goalId: goalId,
                            from: currentProfile.name,
                            message: message.trim(),
                            timestamp: new Date().toISOString(),
                            targetGoal: '공유된 목표'
                        };
                        
                        encouragements.push(newEncouragement);
                        localStorage.setItem('encouragements', JSON.stringify(encouragements));
                        
                        alert('응원 메시지가 전송되었습니다! 💪');
                        loadEncouragementWall(); // UI 새로고침
                        loadSharedGoalsUI(); // 공유 목표도 새로고침
                    } catch (error) {
                        console.error('응원 메시지 추가 오류:', error);
                        alert('응원 메시지 전송에 실패했습니다.');
                    }
                }
            };
            
            // 목표 채택
            window.adoptGoal = function(goalId) {
                if (confirm('이 목표를 내 목표로 추가하시겠습니까?')) {
                    try {
                        const sharedGoals = DreamSocialNetwork.getSharedGoals();
                        const targetGoal = sharedGoals.find(g => g.id === goalId);
                        
                        if (targetGoal) {
                            const newGoal = {
                                id: Date.now(),
                                title: targetGoal.title,
                                category: targetGoal.category,
                                completed: false,
                                createdAt: new Date().toISOString(),
                                notes: `${targetGoal.sharedBy}님이 공유한 목표를 채택했습니다.`,
                                inspiration: targetGoal.inspiration || ''
                            };
                            
                            currentProfile.bucketList.push(newGoal);
                            saveProfiles();
                            
                            alert('목표가 내 목표로 추가되었습니다! 🎯');
                            renderGoals(); // 목표 목록 새로고침
                        }
                    } catch (error) {
                        console.error('목표 채택 오류:', error);
                        alert('목표 추가에 실패했습니다.');
                    }
                }
            };
            
            // 가족과 꿈 공유
            window.shareDreamWithMember = function(memberId) {
                const goals = currentProfile.bucketList.filter(g => !g.completed);
                if (goals.length === 0) {
                    alert('공유할 수 있는 진행중인 목표가 없습니다.');
                    return;
                }
                
                const goalTitles = goals.map((goal, index) => `${index + 1}. ${goal.title}`).join('\\n');
                const selectedIndex = prompt(`공유할 목표를 선택하세요:\\n${goalTitles}\\n\\n번호를 입력하세요:`);
                
                if (selectedIndex && selectedIndex > 0 && selectedIndex <= goals.length) {
                    const selectedGoal = goals[selectedIndex - 1];
                    try {
                        DreamSocialNetwork.shareDreamWithFamily(selectedGoal.id, [memberId], 'public');
                        alert(`"${selectedGoal.title}" 목표가 공유되었습니다! 🤝`);
                        loadSharedGoalsUI(); // UI 새로고침
                    } catch (error) {
                        console.error('목표 공유 오류:', error);
                        alert('목표 공유에 실패했습니다.');
                    }
                }
            };
            
            // 메시지 보내기
            window.sendMessage = function(memberId) {
                const message = prompt('메시지를 입력하세요:');
                if (message && message.trim()) {
                    alert('메시지가 전송되었습니다! 📨\\n(실제 메시징 기능은 향후 구현 예정)');
                }
            };
            
            // 챌린지 진행 업데이트
            window.updateChallengeProgress = function(challengeId) {
                const progress = prompt('진행률을 입력하세요 (0-100):');
                if (progress && !isNaN(progress) && progress >= 0 && progress <= 100) {
                    try {
                        // 챌린지 진행률 업데이트 로직
                        alert(`챌린지 진행률이 ${progress}%로 업데이트되었습니다! 🎯`);
                        loadFamilyChallengesUI(); // UI 새로고침
                    } catch (error) {
                        console.error('챌린지 업데이트 오류:', error);
                        alert('챌린지 업데이트에 실패했습니다.');
                    }
                }
            };
            
            // 챌린지 상세 보기
            window.viewChallengeDetails = function(challengeId) {
                alert('챌린지 상세 보기 기능은 준비중입니다. 🔍');
            };
        }
        
        // 지도 뷰 전환
        window.switchMapView = function(viewType) {
            document.querySelectorAll('.map-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.map-view').forEach(view => view.classList.remove('active'));
            
            event.target.classList.add('active');
            document.getElementById(viewType + '-map').classList.add('active');
        };
        
        // 추천 목표 추가
        window.addRecommendedGoal = function(title, category) {
            if (confirm(`"${title}" 목표를 추가하시겠습니까?`)) {
                const goalInput = document.getElementById('goalInput');
                const categorySelect = document.getElementById('categorySelect');
                
                if (goalInput && categorySelect) {
                    goalInput.value = title;
                    categorySelect.value = category;
                    addGoal();
                    alert('목표가 추가되었습니다!');
                }
            }
        };

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
