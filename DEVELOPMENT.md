# Bucket Dreams - 개발 가이드

## 🚀 로컬 개발 환경 설정

### 요구사항
- 웹 브라우저 (Chrome, Firefox, Safari, Edge)
- 로컬 웹 서버 (개발 시 권장)

### 로컬 서버 실행 방법

#### Python (권장)
```bash
# Python 3.x
python -m http.server 8000

# Python 2.x
python -m SimpleHTTPServer 8000
```

#### Node.js
```bash
# npx 사용
npx serve .

# 또는 http-server 설치 후
npm install -g http-server
http-server
```

#### PHP
```bash
php -S localhost:8000
```

### 접속 주소
- 로컬: http://localhost:8000
- 네트워크: http://[IP주소]:8000

## 📁 프로젝트 구조

```
bucket-dreams/
├── index.html          # 메인 HTML 파일
├── styles.css          # 스타일시트
├── script.js           # JavaScript 로직
├── manifest.json       # PWA 매니페스트
├── README.md           # 프로젝트 설명
├── DEVELOPMENT.md      # 개발 가이드 (이 파일)
└── docs/               # 문서화 (선택사항)
    ├── SECURITY.md     # 보안 정책
    └── CONTRIBUTING.md # 기여 가이드
```

## 🔧 개발 워크플로우

### 1. 코드 수정
- HTML: `index.html`
- CSS: `styles.css` 
- JavaScript: `script.js`

### 2. 테스트
- 로컬 서버에서 기능 확인
- 모바일 디바이스 테스트 (Chrome DevTools)
- PWA 기능 확인

### 3. 디버깅
- 브라우저 개발자 도구 활용
- Console 로그 확인
- Performance 탭으로 성능 모니터링

## 🎯 주요 기능 개발 가이드

### 새 목표 카테고리 추가
1. `categoryNames` 객체에 새 카테고리 추가 (script.js)
2. HTML select 옵션에 새 카테고리 추가
3. CSS에 카테고리별 색상 정의

### 새 탭 추가
1. HTML에 nav-tab 버튼 추가
2. tab-content 섹션 추가
3. `switchTab()` 함수에 탭 로직 추가

### 스타일 커스터마이징
- CSS 변수 활용 (색상, 폰트 등)
- 반응형 디자인 고려
- 다크모드 지원

## 🚀 성능 최적화

### 이미지 최적화
- WebP 형식 사용 권장
- 이미지 압축 (script.js의 compressImage 함수)
- 지연 로딩 적용

### JavaScript 최적화
- 디바운싱/쓰로틀링 적용
- 메모리 누수 방지
- 이벤트 위임 사용

### CSS 최적화
- contain 속성 활용
- will-change 속성 신중하게 사용
- 애니메이션 성능 고려

## 🔒 보안 고려사항

### XSS 방지
- `escapeHtml()` 함수로 사용자 입력 필터링
- innerHTML 대신 textContent 사용 권장

### 파일 업로드 보안
- `validateImageFile()` 함수로 파일 검증
- 파일 크기 제한
- MIME 타입 확인

### 데이터 보호
- 클라이언트사이드 전용 저장
- 민감 데이터 암호화 고려

## 📱 PWA 개발

### 매니페스트 수정
- `manifest.json` 파일 수정
- 아이콘, 색상, 이름 등 커스터마이징

### 서비스 워커
- 캐시 전략 수정
- 오프라인 기능 강화
- 백그라운드 동기화

## 🧪 테스트 가이드

### 수동 테스트 체크리스트
- [ ] 프로필 생성/선택
- [ ] 목표 추가/수정/삭제
- [ ] 이미지 업로드/삭제
- [ ] 데이터 내보내기/가져오기
- [ ] 모달 동작
- [ ] 키보드 네비게이션
- [ ] 모바일 터치 기능

### 브라우저 호환성
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### 반응형 테스트
- 320px (작은 모바일)
- 768px (태블릿)
- 1024px (데스크톱)
- 1400px+ (큰 화면)

## 🐛 디버깅 팁

### 자주 발생하는 문제
1. **localStorage 오류**: 시크릿 모드에서 제한됨
2. **이미지 로딩 실패**: 파일 크기나 형식 확인
3. **모달이 열리지 않음**: aria-hidden 속성 확인
4. **터치 이벤트 안됨**: touch-action 속성 확인

### 개발자 도구 활용
```javascript
// 메모리 사용량 확인
console.log(performance.memory);

// 프로필 데이터 확인
console.log(JSON.parse(localStorage.getItem('bucketListProfiles')));

// 성능 측정
performance.mark('start');
// ... 코드 실행
performance.mark('end');
performance.measure('myOperation', 'start', 'end');
```

## 📦 배포

### GitHub Pages
1. Settings → Pages
2. Source: Deploy from a branch
3. Branch: main / (root)

### 기타 호스팅
- Netlify: `netlify.toml` 설정 파일 추가
- Vercel: `vercel.json` 설정 파일 추가
- Firebase Hosting: `firebase.json` 설정

## 🤝 기여하기

### 개발 규칙
- ES6+ 문법 사용
- 함수형 프로그래밍 스타일 권장
- 주석으로 복잡한 로직 설명
- 접근성 고려 (ARIA 속성)

### 코드 스타일
- 들여쓰기: 4 spaces
- 함수명: camelCase
- 상수: UPPER_CASE
- 클래스명: kebab-case

### 커밋 메시지 규칙
```
타입: 간단한 설명

- 🚀 feat: 새 기능
- 🐛 fix: 버그 수정
- 📚 docs: 문서 업데이트
- 💄 style: UI/스타일 변경
- ♻️ refactor: 코드 리팩터링
- ⚡ perf: 성능 개선
- ✅ test: 테스트 추가/수정
- 🔧 chore: 기타 변경
```

## 📞 문의

- 개발자: 룰루랄라 한기쌤
- 페이스북: https://www.facebook.com/playrurulala
- 이슈 등록: GitHub Issues 활용

---

**Happy Coding! 🎯**