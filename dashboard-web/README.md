# 오용안 대시보드 — 웹 버전 설치 안내

Claude 밖에서 열고, 팀원과 같은 데이터를 함께 쓰는 방법입니다. **전부 무료 범위**에서 됩니다.

## 폴더 구성
| 파일 | 설명 |
| --- | --- |
| `index.html` | 대시보드 본체 (공개해도 되는 파일, 데이터 없음) |
| `shim.js` | Claude 기능 대신 로그인 · 저장소를 연결하는 부품 |
| `config.js` | Firebase 설정값을 붙여 넣는 곳 |
| `firestore.rules` | 데이터 보호 규칙 (Firebase에 붙여 넣음) |
| `../dashboard-web-private/seed.json` | **현재 데이터** (공개 금지, 1회 가져오기용) |

> `seed.json`에는 회의록 · 프로젝트가 들어 있습니다. 웹에 올리거나 GitHub 공개 저장소에 넣지 마세요. 연락처와 개인 공간은 들어 있지 않습니다.

## 먼저 시험해 보기 (설정 없이)
`config.js`를 그대로 두고 `index.html`을 웹 서버로 열면 **개인 모드**(이 브라우저에만 저장)로 동작합니다. 주소 끝에 `?import=1`을 붙이면 `seed.json`을 가져올 수 있습니다.

## 팀 공유 설정 (Firebase, 약 20분)
1. **프로젝트 만들기**: https://console.firebase.google.com → 프로젝트 추가 (Google Analytics는 꺼도 됩니다).
2. **로그인 켜기**: 빌드 → Authentication → 시작하기 → **Google** 사용 설정.
3. **웹 앱 등록**: 프로젝트 설정 → 일반 → 내 앱 → 웹(</>) 등록 → 나오는 `apiKey`, `authDomain`, `projectId`, `appId`를 `config.js`에 붙여 넣습니다.
4. **데이터베이스**: 빌드 → Firestore Database → 데이터베이스 만들기 (프로덕션 모드, 서울 `asia-northeast3` 권장).
5. **보안 규칙**: Firestore → 규칙 탭에 `firestore.rules` 내용을 붙여 넣고 게시합니다.
6. **내 계정을 관리자로 등록** (처음 1번만, 콘솔에서 직접): Firestore → 데이터 → 컬렉션 시작 → 컬렉션 ID `members` → 문서 ID에 **내 Google 이메일(소문자)** → 필드 `role` (문자열) = `admin`.
   - 팀원은 같은 방식으로 `editor`(수정 가능) 또는 `viewer`(보기만)로 등록합니다. 등록되지 않은 계정은 로그인해도 데이터를 볼 수 없습니다.
7. **웹에 올리기**: 아래 중 하나. 올린 뒤 주소(예: `xxx.netlify.app`)를 Firebase → Authentication → 설정 → **승인된 도메인**에 추가해야 로그인이 됩니다.
   - Netlify Drop (https://app.netlify.com/drop): `dashboard-web` 폴더를 끌어다 놓기 (가장 쉬움)
   - Firebase Hosting, Cloudflare Pages 등
8. **데이터 가져오기**: `https://내주소/?import=1` 접속 → 관리자 계정으로 로그인 → `seed.json` 선택. 완료 후 주소의 `?import=1`을 지우고 새로고침합니다.

## 웹 버전에서 달라지는 점
| 기능 | Claude 안 | 웹 |
| --- | --- | --- |
| 계산기 · 자료실 · 프로젝트 · 일정 · 회의록 | 됨 | **됨** |
| 팀 공유 · 권한 | Claude 계정 | Google 로그인 + 등록된 이메일 |
| 받아쓰기 | 됨 | 됨 (크롬 · 엣지, 안드로이드 크롬. 아이폰은 제한적) |
| AI 회의록 정리 | 됨 | **안 됨** (별도 AI 연동과 비용이 필요) |
| Google Drive 폴더 연동 | 됨 | **안 됨** |

## 수정은 여기서만
대시보드 수정은 Claude 세션에서 하고, 수정된 `index.html`만 다시 올리면 웹에도 반영됩니다. 웹에서 입력한 데이터는 Firebase에 저장되고, Claude 안의 대시보드 데이터와는 **자동으로 동기화되지 않습니다** (서로 따로 저장됩니다).
