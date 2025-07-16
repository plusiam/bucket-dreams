        // ========== 전역 에러 핸들링 및 보안 강화 ==========
        
        // 전역 에러 핸들러
        window.addEventListener('error', function(e) {
            console.error('앱 오류 발생:', e.error);
            // 사용자에게 친화적인 알림 (스크립트 에러 제외)
            if (!e.error.message.includes('Script error')) {
                alert('일시적인 오류가 발생했습니다. 페이지를 새로고침해주세요.');
            }
        });

        // localStorage 안전 사용 함수
        function safeLocalStorage(action, key, data = null) {
            try {
                if (action === 'get') return localStorage.getItem(key);
                if (action === 'set') return localStorage.setItem(key, data);
                if (action === 'remove') return localStorage.removeItem(key);
            } catch (e) {
                console.warn('localStorage 사용 불가:', e);
                return null;
            }
        }

        // 이미지 파일 검증 함수
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
            
            return true;
        }

        // 디바운싱 함수
        function debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }

        // 이미지 지연 로딩 함수
        function addLazyLoading() {
            const images = document.querySelectorAll('.item-image');
            images.forEach(img => {
                img.loading = 'lazy';
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

        // 자동완성용 일반적인 목표들
        const commonGoals = [
            '세계여행하기', '마라톤 완주하기', '새로운 언어 배우기',
            '책 100권 읽기', '요리 배우기', '악기 배우기', 
            '스카이다이빙하기', '오로라 보기', '등산하기',
            '새로운 취미 시작하기', '건강한 생활 유지하기'
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

        // 모바일 여부 확인
        function isMobile() {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                   (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
        }

        // 초기화
        function init() {
            loadProfiles();
            setupEventListeners();
            setupPWA();
            showProfileSelector();
            setupAutoLogout();
            setupGoalInputPlaceholder();
        }

        // 목표 입력창 placeholder 설정
        function setupGoalInputPlaceholder() {
            const goalInput = document.getElementById('goalInput');
            if (goalInput) {
                const randomGoal = commonGoals[Math.floor(Math.random() * commonGoals.length)];
                goalInput.placeholder = `예: ${randomGoal}`;
                
                // 포커스시 placeholder 변경
                goalInput.addEventListener('focus', function() {
                    const newRandomGoal = commonGoals[Math.floor(Math.random() * commonGoals.length)];
                    this.placeholder = `예: ${newRandomGoal}`;
                });
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
                }
            } else {
                profiles = [];
            }
        }

        // 오래된 프로필 정리
        function cleanOldProfiles() {
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            profiles = profiles.filter(profile => {
                return new Date(profile.lastAccess).getTime() > thirtyDaysAgo;
            });
            saveProfiles();
        }

        // 프로필 데이터 저장 (안전한 localStorage 사용)
        function saveProfiles() {
            if (isGuestMode) return;
            
            const data = {
                profiles: profiles,
                lastCleaned: new Date().toISOString()
            };
            
            const result = safeLocalStorage('set', 'bucketListProfiles', JSON.stringify(data));
            if (result === null) {
                console.warn('프로필 저장 실패 - localStorage 사용 불가');
            }
        }

        // 자동 로그아웃 설정
        function setupAutoLogout() {
            resetAutoLogout();
            
            ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
                document.addEventListener(event, resetAutoLogout, true);
            });
        }

        // 자동 로그아웃 리셋
        function resetAutoLogout() {
            clearTimeout(autoLogoutTimer);
            clearTimeout(autoLogoutWarningTimer);
            
            const notice = document.getElementById('autoLogoutNotice');
            if (notice) notice.style.display = 'none';
            
            autoLogoutWarningTimer = setTimeout(() => {
                showAutoLogoutWarning();
            }, 25 * 60 * 1000);
            
            autoLogoutTimer = setTimeout(() => {
                autoLogout();
            }, 30 * 60 * 1000);
        }

        // 자동 로그아웃 경고
        function showAutoLogoutWarning() {
            const notice = document.getElementById('autoLogoutNotice');
            if (notice) {
                notice.style.display = 'block';
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
            }
        }

        // 자동 로그아웃 실행
        function autoLogout() {
            alert('오랫동안 사용하지 않아 자동으로 로그아웃됩니다.');
            finishSession();
        }

        // 이벤트 리스너 설정
        function setupEventListeners() {
            const goalInput = document.getElementById('goalInput');
            if (goalInput) {
                goalInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        addGoal();
                    }
                });
            }

            const newUserNameInput = document.getElementById('newUserNameInput');
            if (newUserNameInput) {
                newUserNameInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        createNewUser();
                    }
                });
            }

            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    currentFilter = this.dataset.category;
                    renderBucketList();
                });
            });

            const completionModal = document.getElementById('completionModal');
            if (completionModal) {
                completionModal.addEventListener('click', function(e) {
                    if (e.target === this) {
                        closeCompletionModal();
                    }
                });
            }
        }

        // PWA 설정
        function setupPWA() {
            if ('serviceWorker' in navigator) {
                const swCode = `
                    const CACHE_NAME = 'bucket-list-v1';
                    const urlsToCache = ['/'];
                    
                    self.addEventListener('install', event => {
                        event.waitUntil(
                            caches.open(CACHE_NAME)
                                .then(cache => cache.addAll(urlsToCache))
                        );
                    });
                    
                    self.addEventListener('fetch', event => {
                        event.respondWith(
                            caches.match(event.request)
                                .then(response => response || fetch(event.request))
                        );
                    });
                `;
                
                const blob = new Blob([swCode], { type: 'application/javascript' });
                const swUrl = URL.createObjectURL(blob);
                
                navigator.serviceWorker.register(swUrl)
                    .then(registration => console.log('SW registered'))
                    .catch(error => console.log('SW registration failed'));
            }

            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                deferredPrompt = e;
                const installBtn = document.getElementById('installBtn');
                if (installBtn) installBtn.style.display = 'block';
            });
        }

        // PWA 설치
        function installPWA() {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                        console.log('User accepted the install prompt');
                    }
                    deferredPrompt = null;
                    const installBtn = document.getElementById('installBtn');
                    if (installBtn) installBtn.style.display = 'none';
                });
            }
        }

        // 프로필 선택 화면 표시
        function showProfileSelector() {
            const profileSelector = document.getElementById('profileSelector');
            const mainApp = document.getElementById('mainApp');
            
            if (profileSelector) profileSelector.style.display = 'block';
            if (mainApp) mainApp.classList.remove('active');
            
            renderProfileOptions();
        }

        // 프로필 선택 옵션 렌더링
        function renderProfileOptions() {
            const container = document.getElementById('profileOptions');
            if (!container) return;
            
            let optionsHTML = '';
            
            profiles.forEach(profile => {
                const lastAccess = new Date(profile.lastAccess).toLocaleDateString('ko-KR');
                const goalCount = profile.bucketList.length;
                const completedCount = profile.bucketList.filter(goal => goal.completed).length;
                
                optionsHTML += `
                    <button class="profile-card" onclick="selectProfile('${profile.id}')">
                        <h3>👤 ${profile.name}</h3>
                        <p>목표: ${goalCount}개 | 완료: ${completedCount}개</p>
                        <div class="profile-meta">마지막 접속: ${lastAccess}</div>
                    </button>
                `;
            });
            
            optionsHTML += `
                <button class="profile-card new-user" onclick="showNewUserModal()">
                    <h3>➕ 새 사용자</h3>
                    <p>새로운 버킷리스트 시작하기</p>
                </button>
            `;
            
            optionsHTML += `
                <button class="profile-card guest" onclick="startGuestMode()">
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
            
            if (modal) modal.style.display = 'block';
            if (input) input.focus();
        }

        // 새 사용자 생성
        function createNewUser() {
            const nameInput = document.getElementById('newUserNameInput');
            if (!nameInput) return;
            
            const userName = nameInput.value.trim();
            
            if (!userName) {
                alert('이름을 입력해주세요!');
                nameInput.focus();
                return;
            }
            
            if (profiles.some(p => p.name === userName)) {
                alert('이미 존재하는 이름입니다. 다른 이름을 사용해주세요.');
                nameInput.focus();
                return;
            }
            
            const newProfile = {
                id: Date.now().toString(),
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
            if (modal) modal.style.display = 'none';
            nameInput.value = '';
            showMainApp();
        }

        // 새 사용자 생성 취소
        function cancelNewUser() {
            const modal = document.getElementById('newUserModal');
            const input = document.getElementById('newUserNameInput');
            
            if (modal) modal.style.display = 'none';
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

        // 메인 앱 화면 표시
        function showMainApp() {
            const profileSelector = document.getElementById('profileSelector');
            const mainApp = document.getElementById('mainApp');
            
            if (profileSelector) profileSelector.style.display = 'none';
            if (mainApp) mainApp.classList.add('active');
            
            updateHeaderTitle();
            renderBucketList();
            updateStats();
            updateDataStats();
            resetAutoLogout();
            addLazyLoading(); // 이미지 지연 로딩 적용
        }

        // 헤더 제목 업데이트
        function updateHeaderTitle() {
            const headerTitle = document.getElementById('headerTitle');
            if (headerTitle && currentProfile) {
                headerTitle.textContent = `🎯 ${currentProfile.name}의 버킷리스트`;
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

        // 세션 종료
        function finishSession() {
            if (confirm('사용을 완료하시겠습니까?')) {
                if (currentProfile && !isGuestMode) {
                    currentProfile.lastAccess = new Date().toISOString();
                    saveProfiles();
                }
                showProfileSelector();
            }
        }

        // 탭 전환
        function switchTab(tabName) {
            document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
            event.target.classList.add('active');

            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            const targetTab = document.getElementById(tabName + '-tab');
            if (targetTab) targetTab.classList.add('active');

            if (tabName === 'gallery') {
                renderGallery();
            }
            
            if (tabName === 'data') {
                updateDataStats();
                renderProfileList();
            }
        }

        // 목표 추가
        function addGoal() {
            const goalInput = document.getElementById('goalInput');
            const categorySelect = document.getElementById('categorySelect');
            
            if (!goalInput || !categorySelect) return;
            
            if (!goalInput.value.trim()) {
                alert('목표를 입력해주세요!');
                return;
            }

            const newGoal = {
                id: Date.now(),
                text: goalInput.value.trim(),
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
            }
        }

        // 목표 삭제
        function deleteGoal(id) {
            if (confirm('정말 삭제하시겠습니까?')) {
                if (currentProfile) {
                    currentProfile.bucketList = currentProfile.bucketList.filter(goal => goal.id !== id);
                    saveProfiles();
                    renderBucketList();
                    updateStats();
                    updateDataStats();
                    renderGallery();
                }
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
                if (completionNote) completionNote.focus();
            }
        }

        // 완료 모달 닫기
        function closeCompletionModal() {
            const modal = document.getElementById('completionModal');
            if (modal) modal.style.display = 'none';
            currentGoalId = null;
            isEditMode = false;
        }

        // 완료 저장
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
            
            goal.completed = true;
            goal.completionNote = note;
            goal.completedAt = new Date(completionDate + 'T12:00:00').toISOString();
            
            saveProfiles();
            renderBucketList();
            updateStats();
            updateDataStats();
            renderGallery();
            
            closeCompletionModal();
        }

        // 파일로 이미지 업로드 (보안 강화)
        function uploadImageFile(id, file) {
            if (!file) return;
            
            // 파일 검증
            if (!validateImageFile(file)) {
                return;
            }
            
            if (file.type.startsWith('image/')) {
                processSelectedImage(id, file);
            }
        }

        // 이미지 처리 함수 (간소화된 버전)
        function processSelectedImage(id, file) {
            if (!currentProfile) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                const goal = currentProfile.bucketList.find(g => g.id === id);
                if (goal) {
                    goal.image = e.target.result;
                    saveProfiles();
                    renderBucketList();
                    renderGallery();
                    updateDataStats();
                }
            };
            reader.readAsDataURL(file);
        }

        // 모바일 촬영 기능
        function captureImage(id) {
            if (isMobile()) {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.setAttribute('capture', 'environment');
                input.style.display = 'none';
                
                input.onchange = function(e) {
                    const file = e.target.files[0];
                    if (file && validateImageFile(file)) {
                        processSelectedImage(id, file);
                    }
                    document.body.removeChild(input);
                };
                
                document.body.appendChild(input);
                input.click();
            } else {
                captureWithWebcam(id);
            }
        }

        // 데스크톱용 웹캠 촬영
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

            const video = document.createElement('video');
            video.style.cssText = `
                width: 80%;
                max-width: 500px;
                border-radius: 10px;
                margin-bottom: 20px;
            `;
            video.autoplay = true;

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
                video: { facingMode: 'environment' } 
            })
            .then(stream => {
                video.srcObject = stream;
                
                captureBtn.onclick = () => {
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
                };

                cancelBtn.onclick = () => {
                    stream.getTracks().forEach(track => track.stop());
                    document.body.removeChild(modal);
                };
            })
            .catch(err => {
                console.error('카메라 접근 실패:', err);
                alert('카메라에 접근할 수 없습니다.');
                document.body.removeChild(modal);
            });
        }

        // 사진 삭제 기능
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

        // SNS 플랫폼별 카드 옵션 표시
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
                        ">
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
                        ">
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
                    ">취소</button>
                </div>
            `;

            document.body.appendChild(modal);
        }

        // SNS 카드 생성 (간소화된 버전)
        function generateSNSCard(goalId, platform) {
            if (!currentProfile) return;
            
            const goal = currentProfile.bucketList.find(g => g.id === goalId);
            if (!goal || !goal.completed) return;

            alert('카드 생성 기능은 개발 중입니다.');
        }

        // 데이터 내보내기
        function exportCurrentProfile() {
            if (!currentProfile) return;
            
            const exportObj = {
                profileName: currentProfile.name,
                bucketList: currentProfile.bucketList,
                exportDate: new Date().toISOString(),
                isGuestMode: isGuestMode
            };
            
            const dataStr = JSON.stringify(exportObj, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            const fileName = currentProfile.name ? currentProfile.name.replace(/[^a-zA-Z0-9가-힣]/g, '_') : '사용자';
            link.download = `${fileName}_버킷리스트_백업_${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            URL.revokeObjectURL(url);
        }

        // 데이터 가져오기
        function importData(file) {
            if (!file || !currentProfile) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const importedData = JSON.parse(e.target.result);
                    
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
                    
                    if (confirm(`"${profileName}"의 데이터를 현재 프로필에 적용하시겠습니까?\\n(기존 데이터는 사라집니다)`)) {
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
            reader.readAsText(file);
        }

        // 프로필 관리자 표시
        function showProfileManager() {
            renderProfileManagerContent();
            const modal = document.getElementById('profileManagerModal');
            if (modal) modal.style.display = 'block';
        }

        // 프로필 관리자 닫기
        function closeProfileManager() {
            const modal = document.getElementById('profileManagerModal');
            if (modal) modal.style.display = 'none';
            renderProfileList();
        }

        // 프로필 관리자 내용 렌더링
        function renderProfileManagerContent() {
            const container = document.getElementById('profileManagerContent');
            if (!container) return;
            
            let contentHTML = '<div style="margin-bottom: 15px;">';
            
            profiles.forEach(profile => {
                const isCurrent = currentProfile && profile.id === currentProfile.id;
                const lastAccess = new Date(profile.lastAccess).toLocaleDateString('ko-KR');
                const goalCount = profile.bucketList.length;
                const completedCount = profile.bucketList.filter(goal => goal.completed).length;
                
                contentHTML += `
                    <div style="background: ${isCurrent ? '#f0f9ff' : 'white'}; padding: 15px; border-radius: 8px; margin-bottom: 10px; border: ${isCurrent ? '2px solid #4facfe' : '1px solid #ddd'};">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <h4>${profile.name} ${isCurrent ? '(현재 사용자)' : ''}</h4>
                                <p style="font-size: 0.8rem; color: #6c757d;">목표: ${goalCount}개 | 완료: ${completedCount}개 | 마지막 접속: ${lastAccess}</p>
                            </div>
                            <div>
                                ${!isCurrent ? `<button onclick="deleteProfile('${profile.id}')" class="btn-danger" style="padding: 4px 8px; font-size: 0.7rem; border-radius: 4px; border: none; cursor: pointer;">삭제</button>` : ''}
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

        // 프로필 삭제
        function deleteProfile(profileId) {
            if (confirm('정말로 이 프로필을 삭제하시겠습니까?')) {
                profiles = profiles.filter(p => p.id !== profileId);
                saveProfiles();
                renderProfileManagerContent();
                alert('프로필이 삭제되었습니다.');
            }
        }

        // 프로필 데이터 초기화
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

            if (confirm(`정말로 모든 목표(${goalCount}개)를 삭제하시겠습니까?\\n이 작업은 되돌릴 수 없습니다.`)) {
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

        // 현재 프로필 삭제
        function deleteCurrentProfile() {
            if (!currentProfile || isGuestMode) {
                alert('게스트 모드에서는 이 기능을 사용할 수 없습니다.');
                return;
            }

            const profileName = currentProfile.name;
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

        // 모든 프로필 삭제
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
                        safeLocalStorage('remove', 'bucketListProfiles');
                        profiles = [];
                        currentProfile = null;
                        
                        alert('모든 프로필이 삭제되었습니다.');
                        showProfileSelector();
                    }
                }
            }
        }

        // 프로필 목록 렌더링
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
                
                listHTML += `
                    <div class="profile-item ${isCurrent ? 'current' : ''}">
                        <h4>${profile.name} ${isCurrent ? '(현재)' : ''}</h4>
                        <p>목표: ${goalCount}개 | 완료: ${completedCount}개</p>
                        <p>마지막 접속: ${lastAccess}</p>
                    </div>
                `;
            });
            
            container.innerHTML = listHTML;
        }

        // 버킷리스트 렌더링
        function renderBucketList() {
            if (!currentProfile) return;
            
            const container = document.getElementById('bucketList');
            if (!container) return;
            
            const filteredList = currentFilter === 'all' 
                ? currentProfile.bucketList 
                : currentProfile.bucketList.filter(goal => goal.category === currentFilter);

            if (filteredList.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <h3>목표가 없습니다</h3>
                        <p>${currentFilter === 'all' ? '첫 번째 버킷리스트를 추가해보세요!' : '이 카테고리에 목표를 추가해보세요!'}</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = filteredList.map(goal => `
                <div class="bucket-item ${goal.category} ${goal.completed ? 'completed' : ''}">
                    <div class="item-image-container ${goal.image ? 'has-image' : ''}">
                        ${goal.image ? 
                            `<img src="${goal.image}" alt="목표 이미지" class="item-image" loading="lazy">
                             <button class="image-delete-btn" onclick="deleteImage(${goal.id})" title="사진 삭제">🗑️</button>` : 
                            `<div class="image-placeholder">📷</div>`
                        }
                    </div>
                    
                    <div class="item-content">
                        <div class="item-header">
                            <div class="item-title">${goal.text}</div>
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
                                <div class="completion-note-text">${goal.completionNote}</div>
                                <div class="completion-date">달성일: ${new Date(goal.completedAt).toLocaleDateString('ko-KR')}</div>
                            </div>
                        ` : ''}
                        
                        ${goal.completed ? `
                            <div class="completed-controls">
                                <button class="btn-edit" onclick="editCompletedGoal(${goal.id})">
                                    ✏️ 편집
                                </button>
                                <button class="download-card-btn" onclick="showCardOptions(${goal.id})">
                                    🎯 달성 카드
                                </button>
                            </div>
                        ` : ''}
                        
                        <div class="image-upload-section ${goal.image ? 'has-image' : ''}">
                            <div class="upload-buttons">
                                <label class="upload-btn" for="file-${goal.id}">
                                    📁 ${goal.image ? '교체' : '사진 선택'}
                                </label>
                                <button class="upload-btn camera" onclick="captureImage(${goal.id})">
                                    📷 ${isMobile() ? '카메라' : '촬영'}
                                </button>
                                ${goal.image ? `
                                    <button class="upload-btn btn-delete-image" onclick="deleteImage(${goal.id})">
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
                </div>
            `).join('');

            // 이미지 지연 로딩 적용
            addLazyLoading();
        }

        // 갤러리 렌더링
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

            container.innerHTML = sortedGoals.map(goal => `
                <div class="gallery-item">
                    <div class="item-image-container">
                        ${goal.image ? 
                            `<img src="${goal.image}" alt="목표 이미지" class="item-image" loading="lazy">` : 
                            `<div class="image-placeholder">🎯</div>`
                        }
                    </div>
                    
                    <div class="item-content">
                        <div class="item-title">${goal.text}</div>
                        <div class="category-tag ${goal.category}">${categoryNames[goal.category]}</div>
                        
                        ${goal.completionNote ? `
                            <div class="completion-note">
                                <div class="completion-note-label">달성 후기</div>
                                <div class="completion-note-text">${goal.completionNote}</div>
                            </div>
                        ` : ''}
                        
                        <div class="completion-date">달성일: ${new Date(goal.completedAt).toLocaleDateString('ko-KR')}</div>
                        
                        <div class="completed-controls">
                            <button class="btn-edit" onclick="editCompletedGoal(${goal.id})">
                                ✏️ 편집
                            </button>
                            <button class="download-card-btn" onclick="showCardOptions(${goal.id})">
                                🎯 달성 카드
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');

            // 이미지 지연 로딩 적용
            addLazyLoading();
        }

        // 통계 업데이트
        function updateStats() {
            if (!currentProfile) return;
            
            const total = currentProfile.bucketList.length;
            const completed = currentProfile.bucketList.filter(goal => goal.completed).length;
            const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

            const totalElement = document.getElementById('totalCount');
            const completedElement = document.getElementById('completedCount');
            const progressElement = document.getElementById('progressPercent');

            if (totalElement) totalElement.textContent = total;
            if (completedElement) completedElement.textContent = completed;
            if (progressElement) progressElement.textContent = progress + '%';
        }

        // 데이터 통계 업데이트
        function updateDataStats() {
            if (!currentProfile) return;
            
            const total = currentProfile.bucketList.length;
            const completed = currentProfile.bucketList.filter(goal => goal.completed).length;
            const dataSize = JSON.stringify(currentProfile.bucketList).length;
            const sizeInKB = Math.round(dataSize / 1024 * 100) / 100;
            
            const totalElement = document.getElementById('dataStatsTotal');
            const completedElement = document.getElementById('dataStatsCompleted');
            const sizeElement = document.getElementById('dataStatsSize');

            if (totalElement) totalElement.textContent = total;
            if (completedElement) completedElement.textContent = completed;
            if (sizeElement) sizeElement.textContent = sizeInKB + 'KB';
        }

        // 전체 리스트 PDF 다운로드 (간소화된 버전)
        function downloadAsImage() {
            if (!currentProfile || currentProfile.bucketList.length === 0) {
                alert('다운로드할 목표가 없습니다.');
                return;
            }
            
            alert('PDF 다운로드 기능은 개발 중입니다.');
        }

        // 페이지 로드 시 초기화
        window.addEventListener('load', init);

        // 연장 버튼 이벤트 리스너 (자동 로그아웃)
        document.addEventListener('DOMContentLoaded', function() {
            const extendBtn = document.getElementById('extendBtn');
            if (extendBtn) {
                extendBtn.addEventListener('click', function() {
                    resetAutoLogout();
                    alert('세션이 연장되었습니다.');
                });
            }
        });

        // 버튼 이벤트 리스너들 (안전하게 등록)
        document.addEventListener('DOMContentLoaded', function() {
            // 설정 버튼
            const settingsBtn = document.getElementById('settingsBtn');
            if (settingsBtn) {
                settingsBtn.addEventListener('click', function() {
                    alert('이미지 설정 기능은 개발 중입니다.');
                });
            }

            // 사용자 전환 버튼
            const userSwitchBtn = document.getElementById('userSwitchBtn');
            if (userSwitchBtn) {
                userSwitchBtn.addEventListener('click', showUserSwitch);
            }

            // 사용 완료 버튼
            const finishBtn = document.getElementById('finishBtn');
            if (finishBtn) {
                finishBtn.addEventListener('click', finishSession);
            }

            // 목표 추가 버튼
            const addGoalBtn = document.getElementById('addGoalBtn');
            if (addGoalBtn) {
                addGoalBtn.addEventListener('click', addGoal);
            }

            // 모달 관련 버튼들
            const cancelModalBtn = document.getElementById('cancelModalBtn');
            if (cancelModalBtn) {
                cancelModalBtn.addEventListener('click', closeCompletionModal);
            }

            const saveModalBtn = document.getElementById('saveModalBtn');
            if (saveModalBtn) {
                saveModalBtn.addEventListener('click', saveCompletion);
            }

            // 새 사용자 모달 버튼들
            const cancelNewUserBtn = document.getElementById('cancelNewUserBtn');
            if (cancelNewUserBtn) {
                cancelNewUserBtn.addEventListener('click', cancelNewUser);
            }

            const createUserBtn = document.getElementById('createUserBtn');
            if (createUserBtn) {
                createUserBtn.addEventListener('click', createNewUser);
            }

            // 프로필 관리자 버튼들
            const profileManagerBtn = document.getElementById('profileManagerBtn');
            if (profileManagerBtn) {
                profileManagerBtn.addEventListener('click', showProfileManager);
            }

            const closeProfileManagerBtn = document.getElementById('closeProfileManagerBtn');
            if (closeProfileManagerBtn) {
                closeProfileManagerBtn.addEventListener('click', closeProfileManager);
            }

            // 데이터 관리 버튼들
            const exportBtn = document.getElementById('exportBtn');
            if (exportBtn) {
                exportBtn.addEventListener('click', exportCurrentProfile);
            }

            const importBtn = document.getElementById('importBtn');
            const importFile = document.getElementById('importFile');
            if (importBtn && importFile) {
                importBtn.addEventListener('click', function() {
                    importFile.click();
                });
                
                importFile.addEventListener('change', function(e) {
                    const file = e.target.files[0];
                    if (file) {
                        importData(file);
                        e.target.value = ''; // 파일 입력 초기화
                    }
                });
            }

            // 데이터 삭제 버튼들
            const clearDataBtn = document.getElementById('clearDataBtn');
            if (clearDataBtn) {
                clearDataBtn.addEventListener('click', clearCurrentProfileData);
            }

            const deleteProfileBtn = document.getElementById('deleteProfileBtn');
            if (deleteProfileBtn) {
                deleteProfileBtn.addEventListener('click', deleteCurrentProfile);
            }

            const clearAllBtn = document.getElementById('clearAllBtn');
            if (clearAllBtn) {
                clearAllBtn.addEventListener('click', clearAllProfiles);
            }

            // PDF 다운로드 버튼
            const downloadPdfBtn = document.getElementById('downloadPdfBtn');
            if (downloadPdfBtn) {
                downloadPdfBtn.addEventListener('click', downloadAsImage);
            }

            // PWA 설치 버튼
            const installBtn = document.getElementById('installBtn');
            if (installBtn) {
                installBtn.addEventListener('click', installPWA);
            }

            // 갤러리 정렬 버튼
            const gallerySort = document.getElementById('gallerySort');
            if (gallerySort) {
                gallerySort.addEventListener('change', renderGallery);
            }

            // 탭 전환 버튼들
            document.querySelectorAll('.nav-tab').forEach(tab => {
                tab.addEventListener('click', function() {
                    const tabName = this.dataset.tab;
                    if (tabName) {
                        switchTab(tabName);
                    }
                });
            });
        });