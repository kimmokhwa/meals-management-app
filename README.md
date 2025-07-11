# 휴무관리 시스템 📅

직원 휴무 관리를 위한 웹 애플리케이션입니다.

## 주요 기능

### 직원 관리
- 직원 정보 등록, 수정, 삭제
- 팀별 직원 관리 (의국, 상담, 코디, 간호, 피부, 경영지원)
- CSV 파일 업로드/다운로드
- 입사일/퇴사일 관리

### 휴무 달력
- 월별 달력 형태의 휴무 현황 조회
- 휴무 유형별 관리 (휴무, 연차, 오전반차, 오후반차, 병가 등)
- 일요일 자동 휴무 처리
- 클릭을 통한 휴무 추가/삭제

## 기술 스택

- **프론트엔드**: React 18 + Vite
- **스타일링**: Tailwind CSS
- **아이콘**: Lucide React
- **데이터베이스**: Supabase
- **배포**: Netlify

## 개발 환경 설정

### 필수 조건
- Node.js 18 이상
- npm 또는 yarn

### 설치 및 실행
```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 테스트
npm run test
```

### 환경 변수 설정
`.env` 파일을 생성하고 다음 변수를 설정하세요:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 프로젝트 구조
```
src/
├── components/          # React 컴포넌트
│   ├── EmployeeTab.jsx  # 직원 관리 탭
│   └── HolidayTab.jsx   # 휴무 달력 탭
├── lib/                 # 라이브러리 및 유틸리티
│   └── supabase.js      # Supabase 설정
├── App.jsx              # 메인 앱 컴포넌트
└── main.jsx            # 앱 진입점
```

## 라이선스
MIT License
