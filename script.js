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
        }

        // 프로필 데이터 로드
        function loadProfiles() {
            try {
                const saved = localStorage.getItem('bucketListProfiles');
                if (saved) {
                    const data = JSON.parse(saved);
                    profiles = data.profiles || [];
                    cleanOldProfiles();
                }
            } catch (e) {
                console.log('localStorage not available, using memory storage');
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

        // 프로필 데이터 저장
        function saveProfiles() {
            if (isGuestMode) return;
            
            try {
                const data = {
                    profiles: profiles,
                    lastCleaned: new Date().toISOString()
                };
                localStorage.setItem('bucketListProfiles', JSON.stringify(data));
            } catch (e) {
                console.log('Failed to save profiles');
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
            
            document.getElementById('autoLogoutNotice').style.display = 'none';
            
            autoLogoutWarningTimer = setTimeout(() => {
                showAutoLogoutWarning();
            }, 25 * 60 * 1000);
            
            autoLogoutTimer = setTimeout(() => {
                autoLogout();
            }, 30 * 60 * 1000);
        }

        // 자동 로그아웃 경고
        function showAutoLogoutWarning() {
            document.getElementById('autoLogoutNotice').style.display = 'block';
            let countdown = 5 * 60;
            
            const updateCountdown = () => {
                const minutes = Math.floor(countdown / 60);
                const seconds = countdown % 60;
                document.getElementById('autoLogoutText').textContent = 
                    `${minutes}:${seconds.toString().padStart(2, '0')} 후 자동 로그아웃됩니다`;
                countdown--;
                
                if (countdown < 0) {
                    clearInterval(countdownInterval);
                }
            };
            
            const countdownInterval = setInterval(updateCountdown, 1000);
            updateCountdown();
        }

        // 자동 로그아웃 실행
        function autoLogout() {
            alert('오랫동안 사용하지 않아 자동으로 로그아웃됩니다.');
            finishSession();
        }

        // 이벤트 리스너 설정
        function setupEventListeners() {
            document.getElementById('goalInput').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    addGoal();
                }
            });

            document.getElementById('newUserNameInput').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    createNewUser();
                }
            });

            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    currentFilter = this.dataset.category;
                    renderBucketList();
                });
            });

            document.getElementById('completionModal').addEventListener('click', function(e) {
                if (e.target === this) {
                    closeCompletionModal();
                }
            });
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
                document.getElementById('installBtn').style.display = 'block';
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
                    document.getElementById('installBtn').style.display = 'none';
                });
            }
        }

        // 프로필 선택 화면 표시
        function showProfileSelector() {
            document.getElementById('profileSelector').style.display = 'block';
            document.getElementById('mainApp').classList.remove('active');
            renderProfileOptions();
        }

        // 프로필 선택 옵션 렌더링
        function renderProfileOptions() {
            const container = document.getElementById('profileOptions');
            
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
            document.getElementById('newUserModal').style.display = 'block';
            document.getElementById('newUserNameInput').focus();
        }

        // 새 사용자 생성
        function createNewUser() {
            const nameInput = document.getElementById('newUserNameInput');
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
            
            document.getElementById('newUserModal').style.display = 'none';
            nameInput.value = '';
            showMainApp();
        }

        // 새 사용자 생성 취소
        function cancelNewUser() {
            document.getElementById('newUserModal').style.display = 'none';
            document.getElementById('newUserNameInput').value = '';
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
            document.getElementById('profileSelector').style.display = 'none';
            document.getElementById('mainApp').classList.add('active');
            updateHeaderTitle();
            renderBucketList();
            updateStats();
            updateDataStats();
            resetAutoLogout();
        }

        // 헤더 제목 업데이트
        function updateHeaderTitle() {
            const headerTitle = document.getElementById('headerTitle');
            if (currentProfile) {
                headerTitle.textContent = `🎯 ${currentProfile.name}의 버킷리스트`;
                if (isGuestMode) {
                    headerTitle.textContent += ' (게스트)';
                }
            }
        }

        // 사용자 전환 표시
        function showUserSwitch() {
            if (confirm('다른 사용자로 전환하시겠습니까?\n현재 세션이 종료됩니다.')) {
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
            document.getElementById(tabName + '-tab').classList.add('active');

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

            currentProfile.bucketList.push(newGoal);
            saveProfiles();
            
            goalInput.value = '';
            renderBucketList();
            updateStats();
            updateDataStats();
        }

        // 목표 삭제
        function deleteGoal(id) {
            if (confirm('정말 삭제하시겠습니까?')) {
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
            
            if (editMode) {
                modalTitle.textContent = '✏️ 목표 편집';
                modalSubtitle.textContent = '달성 정보를 수정할 수 있습니다';
                confirmBtn.textContent = '수정';
            } else {
                modalTitle.textContent = '🎉 목표 달성!';
                modalSubtitle.textContent = '이 순간의 느낌을 기록해보세요';
                confirmBtn.textContent = '저장';
            }
            
            if (goal.completedAt) {
                const completedDate = new Date(goal.completedAt).toISOString().split('T')[0];
                document.getElementById('completionDate').value = completedDate;
            } else {
                const today = new Date().toISOString().split('T')[0];
                document.getElementById('completionDate').value = today;
            }
            
            document.getElementById('completionNote').value = goal.completionNote || '';
            document.getElementById('completionModal').style.display = 'block';
            document.getElementById('completionNote').focus();
        }

        // 완료 모달 닫기
        function closeCompletionModal() {
            document.getElementById('completionModal').style.display = 'none';
            currentGoalId = null;
            isEditMode = false;
        }

        // 완료 저장
        function saveCompletion() {
            const goal = currentProfile.bucketList.find(g => g.id === currentGoalId);
            const note = document.getElementById('completionNote').value.trim();
            const completionDate = document.getElementById('completionDate').value;
            
            if (!completionDate) {
                alert('달성 날짜를 선택해주세요!');
                document.getElementById('completionDate').focus();
                return;
            }
            
            if (goal) {
                goal.completed = true;
                goal.completionNote = note;
                goal.completedAt = new Date(completionDate + 'T12:00:00').toISOString();
                saveProfiles();
                renderBucketList();
                updateStats();
                updateDataStats();
                renderGallery();
            }
            
            closeCompletionModal();
        }

        // 파일로 이미지 업로드
        function uploadImageFile(id, file) {
            if (file && file.type.startsWith('image/')) {
                // 스마트 최적화 시스템 사용
                processSelectedImage(id, file);
            }
        }

        // 모바일 촬영 기능 개선
        function captureImage(id) {
            if (isMobile()) {
                // 모바일에서는 기본 카메라 앱 사용
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.setAttribute('capture', 'environment'); // iOS 호환성
                input.style.display = 'none';
                
                input.onchange = function(e) {
                    const file = e.target.files[0];
                    if (file) {
                        // 스마트 최적화 적용
                        processSelectedImage(id, file);
                    }
                    document.body.removeChild(input);
                };
                
                document.body.appendChild(input);
                input.click();
            } else {
                // 데스크톱에서는 기존 웹캠 방식 사용
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
                    const goal = currentProfile.bucketList.find(g => g.id === id);
                    if (goal) {
                        goal.image = imageData;
                        saveProfiles();
                        renderBucketList();
                        renderGallery();
                        updateDataStats();
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
                        
                        <button onclick="generateSNSCard(${goalId}, 'instagram-post'); this.closest('div').parentElement.parentElement.remove()" style="
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
                        ">
                            <span style="font-size: 1.2rem;">🖼️</span>
                            인스타그램 피드 (1:1)
                        </button>
                        
                        <button onclick="generateSNSCard(${goalId}, 'facebook'); this.closest('div').parentElement.parentElement.remove()" style="
                            padding: 15px;
                            background: #1877f2;
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
                            <span style="font-size: 1.2rem;">👍</span>
                            페이스북 (16:9)
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

        // SNS 플랫폼별 카드 생성
        function generateSNSCard(goalId, platform) {
            const goal = currentProfile.bucketList.find(g => g.id === goalId);
            if (!goal || !goal.completed) return;

            // 플랫폼별 카드 크기 설정
            const cardSizes = {
                'instagram': { width: 1080, height: 1920 },      // 9:16 스토리
                'instagram-post': { width: 1080, height: 1080 }, // 1:1 정사각형
                'facebook': { width: 1200, height: 630 },        // 16:9 가로형
                'default': { width: 400, height: 600 }           // 2:3 세로형
            };

            const size = cardSizes[platform] || cardSizes.default;
            
            // 스마트 이미지 센터링 설정
            if (goal.image) {
                const img = new Image();
                img.onload = () => {
                    // 이미지 분석 및 센터링
                    const smartCrop = analyzeAndCropImage(img, size, platform);
                    goal.smartCroppedImage = smartCrop;
                    
                    // 카드 생성
                    createAchievementCard(goal, platform, size);
                };
                img.src = goal.image;
            } else {
                // 이미지 없이 카드 생성
                createAchievementCard(goal, platform, size);
            }
        }

        // 이미지 분석 및 스마트 크롭
        function analyzeAndCropImage(img, targetSize, platform) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = targetSize.width;
            canvas.height = targetSize.height;
            
            // 이미지 비율 계산
            const imgRatio = img.width / img.height;
            const targetRatio = targetSize.width / targetSize.height;
            
            let sx = 0, sy = 0, sw = img.width, sh = img.height;
            
            if (imgRatio > targetRatio) {
                // 이미지가 더 넓은 경우
                sw = img.height * targetRatio;
                sx = (img.width - sw) / 2;
                
                // 얼굴 인식 시뮬레이션 - 상단 1/3 중심
                if (platform === 'instagram' || platform === 'instagram-post') {
                    sx = (img.width - sw) * 0.5; // 중앙
                }
            } else {
                // 이미지가 더 좁은 경우
                sh = img.width / targetRatio;
                sy = (img.height - sh) / 2;
                
                // 상단 중심으로 조정
                sy = Math.max(0, (img.height - sh) * 0.3);
            }
            
            // 안티앨리어싱을 위한 고품질 설정
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // 이미지 그리기
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetSize.width, targetSize.height);
            
            return canvas.toDataURL('image/jpeg', 0.9);
        }

        // 달성 카드 생성
        function createAchievementCard(goal, platform, size) {
            const hiddenArea = document.getElementById('hiddenCardArea');
            
            // 카테고리 아이콘 매핑
            const categoryIcons = {
                travel: '✈️',
                hobby: '🎨',
                career: '💼',
                relationship: '💝',
                health: '💪',
                other: '✨'
            };
            
            let cardHTML = '';
            
            // 플랫폼별 카드 디자인
            if (platform === 'instagram') {
                // 인스타그램 스토리 (9:16)
                cardHTML = `
                    <div style="
                        width: ${size.width}px;
                        height: ${size.height}px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        position: relative;
                        overflow: hidden;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    ">
                        ${goal.smartCroppedImage || goal.image ? `
                            <img src="${goal.smartCroppedImage || goal.image}" style="
                                position: absolute;
                                top: 0;
                                left: 0;
                                width: 100%;
                                height: 100%;
                                object-fit: cover;
                                opacity: 0.9;
                            ">
                            <div style="
                                position: absolute;
                                top: 0;
                                left: 0;
                                right: 0;
                                bottom: 0;
                                background: linear-gradient(to bottom, 
                                    rgba(0,0,0,0.4) 0%, 
                                    rgba(0,0,0,0.1) 50%, 
                                    rgba(0,0,0,0.7) 100%);
                            "></div>
                        ` : ''}
                        
                        <div style="
                            position: absolute;
                            top: 80px;
                            left: 40px;
                            right: 40px;
                            color: white;
                            z-index: 2;
                        ">
                            <div style="
                                font-size: 18px;
                                font-weight: 600;
                                opacity: 0.9;
                                margin-bottom: 15px;
                                text-transform: uppercase;
                                letter-spacing: 2px;
                            ">${categoryNames[goal.category].replace(/[^\s가-힣a-zA-Z]/g, '')}</div>
                            <div style="
                                font-size: 48px;
                                font-weight: 800;
                                line-height: 1.2;
                                margin-bottom: 30px;
                                text-shadow: 0 4px 20px rgba(0,0,0,0.5);
                            ">${goal.text}</div>
                        </div>
                        
                        <div style="
                            position: absolute;
                            bottom: 120px;
                            left: 40px;
                            right: 40px;
                            color: white;
                            z-index: 2;
                        ">
                            ${goal.completionNote ? `
                                <div style="
                                    font-size: 24px;
                                    line-height: 1.5;
                                    margin-bottom: 30px;
                                    opacity: 0.95;
                                ">"${goal.completionNote}"</div>
                            ` : ''}
                            
                            <div style="
                                display: flex;
                                align-items: center;
                                gap: 15px;
                            ">
                                <div style="
                                    width: 60px;
                                    height: 60px;
                                    background: rgba(255,255,255,0.2);
                                    backdrop-filter: blur(10px);
                                    border-radius: 50%;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    font-size: 30px;
                                ">🎯</div>
                                <div>
                                    <div style="
                                        font-size: 22px;
                                        font-weight: 700;
                                        margin-bottom: 5px;
                                    ">${currentProfile.name || 'My Bucket List'}</div>
                                    <div style="
                                        font-size: 18px;
                                        opacity: 0.8;
                                    ">${new Date(goal.completedAt).toLocaleDateString('ko-KR')}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            } else if (platform === 'instagram-post') {
                // 인스타그램 피드 (1:1)
                cardHTML = `
                    <div style="
                        width: ${size.width}px;
                        height: ${size.height}px;
                        background: white;
                        position: relative;
                        overflow: hidden;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    ">
                        ${goal.smartCroppedImage || goal.image ? `
                            <img src="${goal.smartCroppedImage || goal.image}" style="
                                width: 100%;
                                height: 60%;
                                object-fit: cover;
                            ">
                        ` : `
                            <div style="
                                width: 100%;
                                height: 60%;
                                background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                font-size: 120px;
                                color: #ddd;
                            ">${categoryIcons[goal.category]}</div>
                        `}
                        
                        <div style="
                            position: absolute;
                            top: 10px;
                            left: 10px;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            padding: 8px 16px;
                            border-radius: 20px;
                            color: white;
                            font-size: 14px;
                            font-weight: 600;
                        ">${categoryNames[goal.category].replace(/[^\s가-힣a-zA-Z]/g, '')}</div>
                        
                        <div style="
                            padding: 40px;
                            height: 40%;
                            display: flex;
                            flex-direction: column;
                            justify-content: space-between;
                        ">
                            <div>
                                <div style="
                                    font-size: 32px;
                                    font-weight: 800;
                                    color: #1a1a1a;
                                    margin-bottom: 20px;
                                    line-height: 1.2;
                                ">${goal.text}</div>
                                
                                ${goal.completionNote ? `
                                    <div style="
                                        font-size: 20px;
                                        color: #666;
                                        line-height: 1.4;
                                        font-style: italic;
                                    ">"${goal.completionNote}"</div>
                                ` : ''}
                            </div>
                            
                            <div style="
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                                margin-top: 30px;
                            ">
                                <div style="
                                    display: flex;
                                    align-items: center;
                                    gap: 12px;
                                ">
                                    <div style="
                                        width: 40px;
                                        height: 40px;
                                        background: #f5f5f5;
                                        border-radius: 50%;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        font-size: 20px;
                                    ">🎯</div>
                                    <div>
                                        <div style="
                                            font-weight: 700;
                                            color: #333;
                                        ">${currentProfile.name || 'Bucket Dreams'}</div>
                                        <div style="
                                            font-size: 14px;
                                            color: #999;
                                        ">${new Date(goal.completedAt).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                <div style="
                                    font-size: 14px;
                                    color: #999;
                                    font-weight: 500;
                                ">#BucketDreams</div>
                            </div>
                        </div>
                    </div>
                `;
            } else if (platform === 'facebook') {
                // 페이스북 (16:9)
                cardHTML = `
                    <div style="
                        width: ${size.width}px;
                        height: ${size.height}px;
                        background: linear-gradient(135deg, #E3F2FD 0%, #F3E5F5 100%);
                        position: relative;
                        overflow: hidden;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                        display: flex;
                    ">
                        ${goal.smartCroppedImage || goal.image ? `
                            <div style="
                                width: 50%;
                                height: 100%;
                                position: relative;
                            ">
                                <img src="${goal.smartCroppedImage || goal.image}" style="
                                    width: 100%;
                                    height: 100%;
                                    object-fit: cover;
                                ">
                            </div>
                        ` : ''}
                        
                        <div style="
                            flex: 1;
                            padding: 60px;
                            display: flex;
                            flex-direction: column;
                            justify-content: center;
                            background: white;
                        ">
                            <div style="
                                font-size: 16px;
                                font-weight: 600;
                                color: #667eea;
                                margin-bottom: 20px;
                                text-transform: uppercase;
                                letter-spacing: 1px;
                            ">${categoryNames[goal.category].replace(/[^\s가-힣a-zA-Z]/g, '')}</div>
                            
                            <div style="
                                font-size: 42px;
                                font-weight: 800;
                                color: #1a1a1a;
                                margin-bottom: 30px;
                                line-height: 1.2;
                            ">${goal.text}</div>
                            
                            ${goal.completionNote ? `
                                <div style="
                                    font-size: 20px;
                                    color: #666;
                                    line-height: 1.5;
                                    margin-bottom: 30px;
                                    font-style: italic;
                                ">"${goal.completionNote}"</div>
                            ` : ''}
                            
                            <div style="
                                display: flex;
                                align-items: center;
                                gap: 15px;
                                margin-top: auto;
                            ">
                                <div style="
                                    width: 50px;
                                    height: 50px;
                                    background: #f5f5f5;
                                    border-radius: 50%;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    font-size: 24px;
                                ">🎯</div>
                                <div>
                                    <div style="
                                        font-weight: 700;
                                        color: #333;
                                        font-size: 18px;
                                    ">${currentProfile.name || 'My Bucket List'}</div>
                                    <div style="
                                        color: #999;
                                        font-size: 16px;
                                    ">달성일: ${new Date(goal.completedAt).toLocaleDateString('ko-KR')}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                // 기본 카드 (2:3)
                cardHTML = `
                    <div class="achievement-card ${goal.category}" style="width: ${size.width}px; height: ${size.height}px;">
                        <div class="achievement-card-content">
                            <div class="achievement-header">
                                <div class="achievement-title">${goal.text}</div>
                                <div class="achievement-category">${categoryNames[goal.category].replace(/[^\s가-힣a-zA-Z]/g, '')}</div>
                            </div>
                            
                            <div class="achievement-image-container">
                                ${goal.image ? 
                                    `<img src="${goal.image}" alt="목표 이미지" class="achievement-image">` : 
                                    `<div class="achievement-no-image">
                                        <div class="achievement-icon">${categoryIcons[goal.category] || '🎯'}</div>
                                    </div>`
                                }
                            </div>
                            
                            <div class="achievement-body">
                                ${goal.completionNote ? `
                                    <div class="achievement-note">
                                        <div class="achievement-note-text">${goal.completionNote}</div>
                                    </div>
                                ` : ''}
                                
                                <div class="achievement-message">
                                    "${congratulationMessages[goal.category]}"
                                </div>
                            </div>
                            
                            <div class="achievement-footer">
                                <div class="achievement-user-info">
                                    ${currentProfile.name && !isGuestMode ? 
                                        `<div class="achievement-user-name">${currentProfile.name}</div>` : 
                                        '<div class="achievement-user-name">My Bucket List</div>'
                                    }
                                    <div class="achievement-date">${new Date(goal.completedAt).toLocaleDateString('ko-KR', { 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric' 
                                    })}</div>
                                </div>
                                <div class="achievement-branding">
                                    BucketDreams
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            hiddenArea.innerHTML = cardHTML;
            
            // html2canvas로 이미지 생성
            html2canvas(hiddenArea.firstElementChild, {
                backgroundColor: null,
                scale: 3,
                logging: false,
                useCORS: true,
                allowTaint: true,
                width: size.width,
                height: size.height
            }).then(canvas => {
                const link = document.createElement('a');
                const fileName = currentProfile.name ? currentProfile.name.replace(/[^a-zA-Z0-9가-힣]/g, '_') : '사용자';
                const goalText = goal.text.replace(/[^a-zA-Z0-9가-힣]/g, '_');
                const platformName = {
                    'instagram': '인스타스토리',
                    'instagram-post': '인스타피드',
                    'facebook': '페이스북',
                    'default': '기본'
                }[platform];
                
                link.download = `${fileName}_${platformName}_${goalText}_${new Date(goal.completedAt).toISOString().split('T')[0]}.png`;
                link.href = canvas.toDataURL('image/png', 1.0);
                link.click();
                
                hiddenArea.innerHTML = '';
            }).catch(error => {
                console.error('카드 생성 실패:', error);
                alert('카드 생성에 실패했습니다. 다시 시도해주세요.');
                hiddenArea.innerHTML = '';
            });
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
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const importedData = JSON.parse(e.target.result);
                    
                    let bucketList = [];
                    let profileName = currentProfile ? currentProfile.name : '가져온사용자';
                    
                    if (importedData.profileName !== undefined && importedData.bucketList !== undefined) {
                        bucketList = importedData.bucketList || [];
                        profileName = importedData.profileName || profileName;
                    } else if (Array.isArray(importedData)) {
                        bucketList = importedData;
                    } else {
                        throw new Error('올바르지 않은 파일 형식입니다.');
                    }
                    
                    if (confirm(`"${profileName}"의 데이터를 현재 프로필에 적용하시겠습니까?\n(기존 데이터는 사라집니다)`)) {
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
                    alert('올바르지 않은 파일 형식입니다.');
                }
            };
            reader.readAsText(file);
        }

        // 프로필 관리자 표시
        function showProfileManager() {
            renderProfileManagerContent();
            document.getElementById('profileManagerModal').style.display = 'block';
        }

        // 프로필 관리자 닫기
        function closeProfileManager() {
            document.getElementById('profileManagerModal').style.display = 'none';
            renderProfileList();
        }

        // 프로필 관리자 내용 렌더링
        function renderProfileManagerContent() {
            const container = document.getElementById('profileManagerContent');
            
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

            if (confirm(`정말로 모든 목표(${goalCount}개)를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
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
            
            if (confirm(`"${profileName}" 프로필을 완전히 삭제하시겠습니까?\n(목표 ${goalCount}개 포함)\n\n이 작업은 되돌릴 수 없습니다.`)) {
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

            if (confirm(`정말로 모든 프로필(${profileCount}개)을 삭제하시겠습니까?\n총 ${totalGoals}개의 목표가 함께 삭제됩니다.\n\n이 작업은 되돌릴 수 없습니다.`)) {
                if (confirm('마지막 확인: 정말로 모든 데이터를 삭제하시겠습니까?\n\n⚠️ 이 작업 후에는 모든 사용자 데이터가 사라집니다!')) {
                    if (confirm('최종 확인: 백업을 했는지 확인하셨나요?\n정말로 모든 프로필을 삭제하시겠습니까?')) {
                        try {
                            localStorage.removeItem('bucketListProfiles');
                        } catch (e) {
                            console.log('Failed to clear localStorage');
                        }
                        
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

        // 버킷리스트 렌더링 (사진 삭제 기능 포함)
        function renderBucketList() {
            if (!currentProfile) return;
            
            const container = document.getElementById('bucketList');
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
                            `<img src="${goal.image}" alt="목표 이미지" class="item-image">
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
                                        title="${goal.completed ? '완료 취소' : '완료 표시'}">
                                    ${goal.completed ? '↩️' : '✅'}
                                </button>
                                <button class="btn btn-small btn-danger" 
                                        onclick="deleteGoal(${goal.id})"
                                        title="삭제">🗑️</button>
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
        }

        // 갤러리 렌더링
        function renderGallery() {
            if (!currentProfile) return;
            
            const container = document.getElementById('galleryGrid');
            const completedGoals = currentProfile.bucketList.filter(goal => goal.completed);
            const sortBy = document.getElementById('gallerySort').value;

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
                            `<img src="${goal.image}" alt="목표 이미지" class="item-image">` : 
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
        }

        // 통계 업데이트
        function updateStats() {
            if (!currentProfile) return;
            
            const total = currentProfile.bucketList.length;
            const completed = currentProfile.bucketList.filter(goal => goal.completed).length;
            const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

            document.getElementById('totalCount').textContent = total;
            document.getElementById('completedCount').textContent = completed;
            document.getElementById('progressPercent').textContent = progress + '%';
        }

        // 데이터 통계 업데이트
        function updateDataStats() {
            if (!currentProfile) return;
            
            const total = currentProfile.bucketList.length;
            const completed = currentProfile.bucketList.filter(goal => goal.completed).length;
            const dataSize = JSON.stringify(currentProfile.bucketList).length;
            const sizeInKB = Math.round(dataSize / 1024 * 100) / 100;
            
            document.getElementById('dataStatsTotal').textContent = total;
            document.getElementById('dataStatsCompleted').textContent = completed;
            document.getElementById('dataStatsSize').textContent = sizeInKB + 'KB';
        }

        // 전체 리스트 다운로드 (A4 PDF)
        function downloadAsImage() {
            if (!currentProfile || currentProfile.bucketList.length === 0) {
                alert('다운로드할 목표가 없습니다.');
                return;
            }
            
            // PDF 생성 중 알림
            const loadingDiv = document.createElement('div');
            loadingDiv.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                z-index: 10000;
                text-align: center;
            `;
            loadingDiv.innerHTML = `
                <div style="font-size: 2rem; margin-bottom: 10px;">📄</div>
                <div>PDF 생성 중...</div>
            `;
            document.body.appendChild(loadingDiv);
            
            // HTML 기반 PDF 생성을 위한 임시 컨테이너
            const pdfContainer = document.createElement('div');
            pdfContainer.style.cssText = `
                position: absolute;
                left: -9999px;
                top: -9999px;
                width: 794px;
                background: white;
                font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif;
            `;
            
            // 카테고리별로 그룹화
            const groupedGoals = {};
            currentProfile.bucketList.forEach(goal => {
                if (!groupedGoals[goal.category]) {
                    groupedGoals[goal.category] = [];
                }
                groupedGoals[goal.category].push(goal);
            });
            
            // 통계 정보
            const totalGoals = currentProfile.bucketList.length;
            const completedGoals = currentProfile.bucketList.filter(g => g.completed).length;
            const completionRate = Math.round((completedGoals / totalGoals) * 100);
            
            let pdfHTML = `
                <div style="padding: 40px; min-height: 1123px;">
                    <h1 style="text-align: center; font-size: 28px; margin-bottom: 10px; color: #333;">
                        ${currentProfile.name || '나'}의 버킷리스트
                    </h1>
                    <p style="text-align: center; color: #666; margin-bottom: 20px;">
                        생성일: ${new Date().toLocaleDateString('ko-KR')}
                    </p>
                    <hr style="border: none; border-top: 2px solid #eee; margin: 20px 0;">
                    
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 30px;">
                        <p style="font-size: 16px; color: #333; margin: 0;">
                            총 <strong>${totalGoals}개</strong> 목표 중 
                            <strong style="color: #28a745;">${completedGoals}개</strong> 달성 
                            <span style="color: #666;">(${completionRate}%)</span>
                        </p>
                    </div>
            `;
            
            // 각 카테고리별로 출력
            Object.entries(groupedGoals).forEach(([category, goals]) => {
                pdfHTML += `
                    <div style="margin-bottom: 30px;">
                        <div style="background: #f0f0f0; padding: 10px 15px; border-radius: 8px; margin-bottom: 15px;">
                            <h2 style="font-size: 18px; margin: 0; color: #333;">
                                ${categoryNames[category]}
                            </h2>
                        </div>
                        
                        <table style="width: 100%; border-collapse: collapse;">
                            <tbody>
                `;
                
                goals.forEach((goal, index) => {
                    const isCompleted = goal.completed;
                    const completedDate = goal.completedAt ? new Date(goal.completedAt).toLocaleDateString('ko-KR') : '';
                    
                    pdfHTML += `
                        <tr>
                            <td style="width: 30px; padding: 8px 0; vertical-align: top;">
                                <div style="
                                    width: 20px; 
                                    height: 20px; 
                                    border: 2px solid ${isCompleted ? '#28a745' : '#ccc'};
                                    border-radius: 3px;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    background: ${isCompleted ? '#28a745' : 'white'};
                                    color: white;
                                    font-weight: bold;
                                ">
                                    ${isCompleted ? '✓' : ''}
                                </div>
                            </td>
                            <td style="padding: 8px 15px; vertical-align: top; ${isCompleted ? 'color: #999;' : ''}">
                                <span style="${isCompleted ? 'text-decoration: line-through;' : ''}">
                                    ${goal.text}
                                </span>
                            </td>
                            <td style="width: 150px; padding: 8px 0; text-align: right; vertical-align: top;">
                                <div style="
                                    border-bottom: 1px dotted #ccc;
                                    height: 20px;
                                    font-size: 12px;
                                    color: #666;
                                ">
                                    ${completedDate}
                                </div>
                            </td>
                        </tr>
                    `;
                    
                    if (index < goals.length - 1) {
                        pdfHTML += `
                            <tr>
                                <td colspan="3" style="padding: 0;">
                                    <hr style="border: none; border-top: 1px solid #f0f0f0; margin: 5px 0;">
                                </td>
                            </tr>
                        `;
                    }
                });
                
                pdfHTML += `
                            </tbody>
                        </table>
                    </div>
                `;
            });
            
            pdfHTML += `
                    <div style="position: absolute; bottom: 20px; left: 0; right: 0; text-align: center; color: #999; font-size: 12px;">
                        <div>BucketDreams - 나의 버킷리스트</div>
                    </div>
                </div>
            `;
            
            pdfContainer.innerHTML = pdfHTML;
            document.body.appendChild(pdfContainer);
            
            // html2canvas와 jsPDF를 사용하여 PDF 생성
            const { jsPDF } = window.jspdf;
            
            html2canvas(pdfContainer, {
                scale: 2,
                useCORS: true,
                logging: false,
                width: 794,
                windowWidth: 794
            }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: 'a4'
                });
                
                const imgWidth = 210;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                const pageHeight = 297;
                
                let heightLeft = imgHeight;
                let position = 0;
                
                // 첫 페이지 추가
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
                
                // 추가 페이지가 필요한 경우
                while (heightLeft > 0) {
                    position = heightLeft - imgHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                    heightLeft -= pageHeight;
                }
                
                // PDF 다운로드
                const fileName = `${currentProfile.name || '나의'}_버킷리스트_${new Date().toISOString().split('T')[0]}.pdf`;
                pdf.save(fileName);
                
                // 정리
                document.body.removeChild(pdfContainer);
                document.body.removeChild(loadingDiv);
            }).catch(error => {
                console.error('PDF 생성 실패:', error);
                alert('PDF 생성에 실패했습니다.');
                document.body.removeChild(pdfContainer);
                document.body.removeChild(loadingDiv);
            });
        }

        // 페이지 로드 시 초기화
        window.addEventListener('load', init);

        // ========== 스마트 이미지 최적화 시스템 ==========

        class SmartImageOptimizer {
            constructor() {
                // 모바일 기기 감지
                this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                
                // 모바일용 설정
                this.maxWidth = this.isMobile ? 600 : 800;
                this.maxHeight = this.isMobile ? 450 : 600;
                this.quality = this.isMobile ? 0.7 : 0.8;
                this.targetFileSize = this.isMobile ? 300 * 1024 : 500 * 1024;
                
                this.canvas = document.createElement('canvas');
                this.ctx = this.canvas.getContext('2d');
            }

            // 메인 최적화 함수
            async optimizeImage(file, progressCallback = null) {
                return new Promise((resolve, reject) => {
                    try {
                        const startTime = Date.now();
                        
                        // 진행률 업데이트
                        if (progressCallback) progressCallback(10, '이미지 분석 중...');

                        const img = new Image();
                        img.onload = async () => {
                            try {
                                if (progressCallback) progressCallback(30, '이미지 처리 중...');

                                // 1단계: 스마트 크기 조정
                                const resizedData = this.smartResize(img);
                                
                                if (progressCallback) progressCallback(50, '품질 최적화 중...');

                                // 2단계: 품질 최적화
                                const optimizedData = await this.optimizeQuality(resizedData);
                                
                                if (progressCallback) progressCallback(70, '스마트 센터링 적용 중...');

                                // 3단계: 스마트 센터링 (얼굴 감지 시뮬레이션)
                                const centeredData = await this.smartCentering(optimizedData, img);
                                
                                if (progressCallback) progressCallback(90, '마무리 중...');

                                // 4단계: 메타데이터 정리 및 최종 검증
                                const finalData = this.finalizeImage(centeredData);
                                
                                const processingTime = Date.now() - startTime;
                                const originalSize = file.size;
                                const optimizedSize = this.getDataURLSize(finalData);
                                
                                if (progressCallback) progressCallback(100, '완료!');

                                resolve({
                                    optimizedDataURL: finalData,
                                    originalSize: originalSize,
                                    optimizedSize: optimizedSize,
                                    compressionRatio: ((originalSize - optimizedSize) / originalSize * 100).toFixed(1),
                                    processingTime: processingTime,
                                    dimensions: {
                                        original: { width: img.width, height: img.height },
                                        optimized: { width: this.canvas.width, height: this.canvas.height }
                                    }
                                });
                            } catch (error) {
                                reject(error);
                            }
                        };
                        
                        img.onerror = () => reject(new Error('이미지 로드 실패'));
                        img.src = URL.createObjectURL(file);
                        
                    } catch (error) {
                        reject(error);
                    }
                });
            }

            // 스마트 크기 조정
            smartResize(img) {
                const { width: origWidth, height: origHeight } = img;
                
                // 종횡비 계산
                const aspectRatio = origWidth / origHeight;
                
                let newWidth, newHeight;
                
                // 최대 크기 내에서 종횡비 유지하며 리사이징
                if (origWidth > origHeight) {
                    // 가로가 더 긴 경우
                    newWidth = Math.min(origWidth, this.maxWidth);
                    newHeight = newWidth / aspectRatio;
                    
                    if (newHeight > this.maxHeight) {
                        newHeight = this.maxHeight;
                        newWidth = newHeight * aspectRatio;
                    }
                } else {
                    // 세로가 더 길거나 정사각형인 경우
                    newHeight = Math.min(origHeight, this.maxHeight);
                    newWidth = newHeight * aspectRatio;
                    
                    if (newWidth > this.maxWidth) {
                        newWidth = this.maxWidth;
                        newHeight = newWidth / aspectRatio;
                    }
                }

                // Canvas 크기 설정
                this.canvas.width = Math.round(newWidth);
                this.canvas.height = Math.round(newHeight);
                
                // 고품질 리샘플링 설정
                this.ctx.imageSmoothingEnabled = true;
                this.ctx.imageSmoothingQuality = 'high';
                
                // 이미지 그리기
                this.ctx.drawImage(img, 0, 0, newWidth, newHeight);
                
                return this.canvas.toDataURL('image/jpeg', this.quality);
            }

            // 품질 최적화 (목표 파일 크기에 맞춤)
            async optimizeQuality(dataURL) {
                let currentQuality = this.quality;
                let currentDataURL = dataURL;
                let iterations = 0;
                const maxIterations = 5;

                while (iterations < maxIterations) {
                    const currentSize = this.getDataURLSize(currentDataURL);
                    
                    if (currentSize <= this.targetFileSize) {
                        break; // 목표 크기 달성
                    }
                    
                    // 품질 점진적 감소
                    currentQuality *= 0.8;
                    if (currentQuality < 0.3) currentQuality = 0.3; // 최소 품질 보장
                    
                    // 이미지 재생성
                    const img = await this.dataURLToImage(currentDataURL);
                    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                    this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
                    currentDataURL = this.canvas.toDataURL('image/jpeg', currentQuality);
                    
                    iterations++;
                }

                return currentDataURL;
            }

            // 스마트 센터링 (중요 영역 감지 시뮬레이션)
            async smartCentering(dataURL, originalImg) {
                const img = await this.dataURLToImage(dataURL);
                
                // 얼굴 감지 시뮬레이션 (실제로는 Face Detection API 또는 TensorFlow.js 사용 가능)
                const faceRegion = this.detectImportantRegion(img);
                
                if (faceRegion) {
                    return this.centerOnRegion(img, faceRegion);
                }
                
                // 얼굴이 감지되지 않으면 중앙 크롭
                return this.centerCrop(img);
            }

            // 중요 영역 감지 (간단한 휴리스틱 사용)
            detectImportantRegion(img) {
                // 실제로는 복잡한 알고리즘이지만, 여기서는 시뮬레이션
                // 상단 1/3 지역에 중요 내용이 있다고 가정
                const width = img.width || this.canvas.width;
                const height = img.height || this.canvas.height;
                
                // 상단 중앙 영역을 중요 영역으로 설정
                return {
                    x: width * 0.3,
                    y: height * 0.1,
                    width: width * 0.4,
                    height: height * 0.3
                };
            }

            // 특정 영역을 중심으로 크롭
            centerOnRegion(img, region) {
                const centerX = region.x + region.width / 2;
                const centerY = region.y + region.height / 2;
                
                // 현재 캔버스 크기 유지하면서 중요 영역이 중앙에 오도록 조정
                const offsetX = (this.canvas.width / 2) - centerX;
                const offsetY = (this.canvas.height / 2) - centerY;
                
                // 새로운 캔버스에 재배치
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.drawImage(img, offsetX, offsetY);
                
                return this.canvas.toDataURL('image/jpeg', this.quality);
            }

            // 중앙 크롭
            centerCrop(img) {
                // 이미 최적화된 크기이므로 그대로 반환
                return this.canvas.toDataURL('image/jpeg', this.quality);
            }

            // 최종 이미지 처리
            finalizeImage(dataURL) {
                // EXIF 데이터는 이미 Canvas 처리 과정에서 제거됨
                // 추가적인 최적화나 워터마크 추가 가능
                return dataURL;
            }

            // 유틸리티 함수들
            dataURLToImage(dataURL) {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => resolve(img);
                    img.onerror = reject;
                    img.src = dataURL;
                });
            }

            getDataURLSize(dataURL) {
                // Base64 데이터 크기 계산 (바이트)
                const base64Data = dataURL.split(',')[1];
                return Math.round(base64Data.length * 0.75); // Base64는 원본의 약 133% 크기
            }

            // 설정 업데이트
            updateSettings(settings) {
                if (settings.maxWidth) this.maxWidth = settings.maxWidth;
                if (settings.maxHeight) this.maxHeight = settings.maxHeight;
                if (settings.quality) this.quality = settings.quality;
                if (settings.targetFileSize) this.targetFileSize = settings.targetFileSize;
            }
        }

        // ========== 이미지 최적화 UI 컴포넌트 ==========

        class ImageOptimizationUI {
            constructor() {
                this.optimizer = new SmartImageOptimizer();
                this.currentGoalId = null;
            }

            // 이미지 최적화 프로세스 시작
            async processImage(goalId, file) {
                this.currentGoalId = goalId;
                
                try {
                    // 최적화 진행 모달 표시
                    this.showOptimizationModal();
                    
                    // 이미지 최적화 실행
                    const result = await this.optimizer.optimizeImage(file, (progress, message) => {
                        this.updateProgress(progress, message);
                    });
                    
                    // 결과 확인 모달 표시
                    this.showResultModal(result, file);
                    
                } catch (error) {
                    this.showErrorModal(error.message);
                }
            }

            // 최적화 진행 모달
            showOptimizationModal() {
                const modal = document.createElement('div');
                modal.id = 'optimizationModal';
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
                        <div style="margin-bottom: 20px;">
                            <div style="font-size: 3rem; margin-bottom: 10px;">🤖</div>
                            <h3 style="margin-bottom: 5px; color: #333;">스마트 이미지 최적화</h3>
                            <p style="color: #666; font-size: 0.9rem;">AI가 이미지를 최적화하고 있습니다</p>
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <div style="
                                background: #f0f9ff;
                                border-radius: 10px;
                                padding: 20px;
                                margin-bottom: 15px;
                            ">
                                <div id="progressBar" style="
                                    background: #e5e7eb;
                                    border-radius: 10px;
                                    height: 8px;
                                    overflow: hidden;
                                    margin-bottom: 10px;
                                ">
                                    <div id="progressFill" style="
                                        background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
                                        height: 100%;
                                        width: 0%;
                                        transition: width 0.3s ease;
                                        border-radius: 10px;
                                    "></div>
                                </div>
                                <div id="progressText" style="
                                    font-size: 0.9rem;
                                    color: #4facfe;
                                    font-weight: 600;
                                ">이미지 분석 중...</div>
                                <div id="progressPercent" style="
                                    font-size: 1.2rem;
                                    font-weight: 700;
                                    color: #333;
                                    margin-top: 5px;
                                ">0%</div>
                            </div>
                        </div>
                        
                        <div style="
                            background: #f8f9fa;
                            border-radius: 10px;
                            padding: 15px;
                            font-size: 0.8rem;
                            color: #6c757d;
                            text-align: left;
                        ">
                            <strong>🔧 처리 과정:</strong><br>
                            • 이미지 크기 최적화<br>
                            • 품질 압축<br>
                            • 스마트 센터링<br>
                            • 메타데이터 정리
                        </div>
                    </div>
                `;

                document.body.appendChild(modal);
            }

            // 진행률 업데이트
            updateProgress(progress, message) {
                const progressFill = document.getElementById('progressFill');
                const progressText = document.getElementById('progressText');
                const progressPercent = document.getElementById('progressPercent');
                
                if (progressFill) progressFill.style.width = `${progress}%`;
                if (progressText) progressText.textContent = message;
                if (progressPercent) progressPercent.textContent = `${progress}%`;
            }

            // 결과 확인 모달
            showResultModal(result, originalFile) {
                // 기존 모달 제거
                const existingModal = document.getElementById('optimizationModal');
                if (existingModal) document.body.removeChild(existingModal);

                const modal = document.createElement('div');
                modal.id = 'resultModal';
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

                const compressionRatio = result.compressionRatio;
                const sizeBefore = this.formatFileSize(result.originalSize);
                const sizeAfter = this.formatFileSize(result.optimizedSize);

                modal.innerHTML = `
                    <div style="
                        background: white;
                        border-radius: 20px;
                        padding: 30px;
                        max-width: 500px;
                        width: 90%;
                        max-height: 80vh;
                        overflow-y: auto;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    ">
                        <div style="text-align: center; margin-bottom: 25px;">
                            <div style="font-size: 3rem; margin-bottom: 10px;">✨</div>
                            <h3 style="margin-bottom: 5px; color: #333;">최적화 완료!</h3>
                            <p style="color: #666; font-size: 0.9rem;">이미지가 스마트하게 최적화되었습니다</p>
                        </div>
                        
                        <div style="margin-bottom: 20px;">
                            <img src="${result.optimizedDataURL}" style="
                                width: 100%;
                                max-height: 200px;
                                object-fit: cover;
                                border-radius: 10px;
                                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                            " alt="최적화된 이미지">
                        </div>
                        
                        <div style="
                            background: #f0f9ff;
                            border-radius: 15px;
                            padding: 20px;
                            margin-bottom: 20px;
                        ">
                            <h4 style="margin-bottom: 15px; color: #333; text-align: center;">📊 최적화 결과</h4>
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                                <div style="text-align: center;">
                                    <div style="color: #6c757d; font-size: 0.8rem; margin-bottom: 5px;">최적화 전</div>
                                    <div style="font-weight: 700; color: #dc3545;">${sizeBefore}</div>
                                    <div style="font-size: 0.8rem; color: #6c757d;">${result.dimensions.original.width}×${result.dimensions.original.height}</div>
                                </div>
                                <div style="text-align: center;">
                                    <div style="color: #6c757d; font-size: 0.8rem; margin-bottom: 5px;">최적화 후</div>
                                    <div style="font-weight: 700; color: #28a745;">${sizeAfter}</div>
                                    <div style="font-size: 0.8rem; color: #6c757d;">${result.dimensions.optimized.width}×${result.dimensions.optimized.height}</div>
                                </div>
                            </div>
                            
                            <div style="text-align: center; padding: 15px; background: white; border-radius: 10px;">
                                <div style="color: #4facfe; font-size: 1.8rem; font-weight: 800; margin-bottom: 5px;">
                                    ${compressionRatio}% 🔥
                                </div>
                                <div style="color: #6c757d; font-size: 0.9rem;">
                                    용량 절약 • ${result.processingTime}ms 처리시간
                                </div>
                            </div>
                        </div>
                        
                        <div style="
                            background: #f8f9fa;
                            border-radius: 10px;
                            padding: 15px;
                            margin-bottom: 20px;
                            font-size: 0.8rem;
                            color: #6c757d;
                        ">
                            <strong>🎯 적용된 최적화:</strong><br>
                            • 스마트 리사이징: 품질 유지하며 크기 조정<br>
                            • 압축 최적화: 시각적 품질 손실 최소화<br>
                            • 센터링: 중요 영역 중심 배치<br>
                            • 메타데이터 정리: 불필요한 정보 제거
                        </div>
                        
                        <div style="display: flex; gap: 10px; justify-content: center;">
                            <button onclick="this.closest('#resultModal').remove()" style="
                                padding: 12px 20px;
                                background: #6c757d;
                                color: white;
                                border: none;
                                border-radius: 8px;
                                cursor: pointer;
                                font-weight: 600;
                            ">다시 선택</button>
                            <button onclick="imageOptimizationUI.acceptOptimizedImage()" style="
                                padding: 12px 20px;
                                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                                color: white;
                                border: none;
                                border-radius: 8px;
                                cursor: pointer;
                                font-weight: 600;
                                box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
                            ">✅ 이 이미지 사용</button>
                        </div>
                    </div>
                `;

                document.body.appendChild(modal);
                
                // 결과 저장
                this.optimizationResult = result;
            }

            // 최적화된 이미지 적용
            acceptOptimizedImage() {
                if (this.optimizationResult && this.currentGoalId) {
                    const goal = currentProfile.bucketList.find(g => g.id === this.currentGoalId);
                    if (goal) {
                        goal.image = this.optimizationResult.optimizedDataURL;
                        saveProfiles();
                        renderBucketList();
                        renderGallery();
                        updateDataStats();
                        
                        this.showSuccessMessage(
                            `이미지가 최적화되어 저장되었습니다! 📸 (${this.optimizationResult.compressionRatio}% 절약)`
                        );
                    }
                }
                
                // 모달 닫기
                const modal = document.getElementById('resultModal');
                if (modal) document.body.removeChild(modal);
                
                // 상태 초기화
                this.optimizationResult = null;
                this.currentGoalId = null;
            }

            // 에러 모달
            showErrorModal(errorMessage) {
                // 기존 모달 제거
                const existingModal = document.getElementById('optimizationModal');
                if (existingModal) document.body.removeChild(existingModal);

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
                `;

                modal.innerHTML = `
                    <div style="
                        background: white;
                        border-radius: 15px;
                        padding: 25px;
                        max-width: 400px;
                        width: 90%;
                        text-align: center;
                    ">
                        <div style="font-size: 3rem; margin-bottom: 15px;">😅</div>
                        <h3 style="color: #dc3545; margin-bottom: 10px;">최적화 실패</h3>
                        <p style="color: #6c757d; margin-bottom: 20px;">${errorMessage}</p>
                        <button onclick="this.closest('div').closest('div').remove()" style="
                            padding: 10px 20px;
                            background: #dc3545;
                            color: white;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                        ">확인</button>
                    </div>
                `;

                document.body.appendChild(modal);
            }

            // 파일 크기 포맷팅
            formatFileSize(bytes) {
                if (bytes === 0) return '0 Bytes';
                const k = 1024;
                const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
            }

            // 성공 메시지
            showSuccessMessage(message) {
                const toast = document.createElement('div');
                toast.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: linear-gradient(135deg, #28a745, #20c997);
                    color: white;
                    padding: 15px 20px;
                    border-radius: 10px;
                    box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
                    z-index: 3000;
                    font-weight: 600;
                    animation: slideInRight 0.3s ease-out;
                    max-width: 300px;
                `;
                toast.textContent = message;

                document.body.appendChild(toast);

                setTimeout(() => {
                    if (document.body.contains(toast)) {
                        document.body.removeChild(toast);
                    }
                }, 4000);
            }
        }

        // 전역 인스턴스 생성
        const imageOptimizationUI = new ImageOptimizationUI();

        // ========== 기존 함수들 업데이트 ==========

        // 개선된 이미지 처리 함수
        function processSelectedImage(id, file) {
            if (!file || !file.type.startsWith('image/')) {
                alert('올바른 이미지 파일을 선택해주세요.');
                return;
            }

            // 파일 타입 검증
            if (!file.type.match(/^image\/(jpeg|jpg|png|gif|webp)$/i)) {
                alert('이미지 파일만 업로드 가능합니다.\n(지원 형식: JPEG, PNG, GIF, WebP)');
                return;
            }
            
            // 파일 크기 제한 (10MB)
            if (file.size > 10 * 1024 * 1024) {
                alert('파일 크기는 10MB 이하여야 합니다.');
                return;
            }

            // 이미지 최적화 UI 시작
            imageOptimizationUI.processImage(id, file);
        }

        // 설정 패널 추가 함수
        // 개선된 설정 패널 함수
        function showImageOptimizationSettings() {
            const modal = document.createElement('div');
            modal.id = 'imageSettingsModal';
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
            `;

            modal.innerHTML = `
                <div id="imageSettingsContent" style="
                    background: white;
                    border-radius: 15px;
                    padding: 25px;
                    max-width: 450px;
                    width: 90%;
                    position: relative;
                ">
                    <button onclick="closeImageSettingsModal()" style="
                        position: absolute;
                        top: 15px;
                        right: 15px;
                        background: transparent;
                        border: none;
                        font-size: 1.5rem;
                        color: #999;
                        cursor: pointer;
                        width: 30px;
                        height: 30px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 50%;
                        transition: all 0.2s;
                    " onmouseover="this.style.background='#f0f0f0'; this.style.color='#666'" 
                      onmouseout="this.style.background='transparent'; this.style.color='#999'">×</button>
                    <h3 style="margin-bottom: 20px; text-align: center;">⚙️ 이미지 최적화 설정</h3>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">최대 가로 크기 (px)</label>
                        <input type="range" id="maxWidthSlider" min="400" max="1200" value="800" 
                               oninput="document.getElementById('maxWidthValue').textContent = this.value"
                               style="width: 100%; margin-bottom: 5px;">
                        <div style="text-align: center; color: #666; font-size: 0.9rem;">
                            <span id="maxWidthValue">800</span>px
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">최대 세로 크기 (px)</label>
                        <input type="range" id="maxHeightSlider" min="300" max="900" value="600"
                               oninput="document.getElementById('maxHeightValue').textContent = this.value"
                               style="width: 100%; margin-bottom: 5px;">
                        <div style="text-align: center; color: #666; font-size: 0.9rem;">
                            <span id="maxHeightValue">600</span>px
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">이미지 품질</label>
                        <input type="range" id="qualitySlider" min="0.3" max="1" step="0.1" value="0.8"
                               oninput="document.getElementById('qualityValue').textContent = Math.round(this.value * 100)"
                               style="width: 100%; margin-bottom: 5px;">
                        <div style="text-align: center; color: #666; font-size: 0.9rem;">
                            <span id="qualityValue">80</span>%
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">목표 파일 크기</label>
                        <select id="targetSizeSelect" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 5px;">
                            <option value="250">250KB (빠른 로딩)</option>
                            <option value="500" selected>500KB (균형)</option>
                            <option value="1000">1MB (고품질)</option>
                            <option value="2000">2MB (최고품질)</option>
                        </select>
                    </div>
                    
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button onclick="closeImageSettingsModal()" style="
                            padding: 10px 20px;
                            background: #6c757d;
                            color: white;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                        ">취소</button>
                        <button onclick="applyOptimizationSettings(); closeImageSettingsModal()" style="
                            padding: 10px 20px;
                            background: #4facfe;
                            color: white;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                            font-weight: 600;
                        ">적용</button>
                    </div>
                    
                    <div style="
                        margin-top: 15px;
                        padding: 10px;
                        background: #f8f9fa;
                        border-radius: 8px;
                        text-align: center;
                        font-size: 0.8rem;
                        color: #6c757d;
                    ">
                        💡 팁: 배경을 클릭하거나 ESC 키를 눌러도 닫힙니다
                    </div>
                </div>
            `;

            // 배경 클릭시 닫기
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    closeImageSettingsModal();
                }
            });

            // ESC 키로 닫기
            const handleEscKey = function(e) {
                if (e.key === 'Escape') {
                    closeImageSettingsModal();
                    document.removeEventListener('keydown', handleEscKey);
                }
            };
            document.addEventListener('keydown', handleEscKey);
            
            // 모달 열릴 때 포커스 설정
            modal.setAttribute('data-escape-handler', 'true');

            document.body.appendChild(modal);
            
            // 접근성을 위한 포커스 설정
            setTimeout(() => {
                const firstSlider = document.getElementById('maxWidthSlider');
                if (firstSlider) firstSlider.focus();
            }, 100);
        }

        // 이미지 설정 모달 닫기 함수
        function closeImageSettingsModal() {
            const modal = document.getElementById('imageSettingsModal');
            if (modal) {
                // ESC 이벤트 리스너 제거
                const escapeListeners = document.querySelectorAll('[data-escape-handler]');
                escapeListeners.forEach(element => {
                    if (element === modal) {
                        document.removeEventListener('keydown', arguments.callee);
                    }
                });
                
                document.body.removeChild(modal);
            }
        }

        // 설정 적용 함수
        function applyOptimizationSettings() {
            const maxWidth = parseInt(document.getElementById('maxWidthSlider').value);
            const maxHeight = parseInt(document.getElementById('maxHeightSlider').value);
            const quality = parseFloat(document.getElementById('qualitySlider').value);
            const targetFileSize = parseInt(document.getElementById('targetSizeSelect').value) * 1024;

            imageOptimizationUI.optimizer.updateSettings({
                maxWidth: maxWidth,
                maxHeight: maxHeight,
                quality: quality,
                targetFileSize: targetFileSize
            });

            imageOptimizationUI.showSuccessMessage('최적화 설정이 저장되었습니다! ⚙️');
        }