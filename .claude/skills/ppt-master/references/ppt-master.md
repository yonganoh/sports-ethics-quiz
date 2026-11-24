# PPT Master로 만들 때 (hugohe3/ppt-master, MIT)

이 문서는 `ppt-master` 스킬의 본 제작 절차다. PPT Master 본체는 **이 저장소에 들어 있지 않고**, 쓸 때마다 공개 GitHub에서 읽기 전용으로 받는다(복제 5초 안팎, `skills/ppt-master/`만 약 80MB). 저작자 표시(LICENSE, SPONSORS 파일)는 지우지 않는다.

PPT Master는 오픈소스 PPT 생성 워크플로(스킬)다. 문서나 주제를 받아 SVG 페이지를 만들고 **편집 가능한 PPTX**로 내보낸다. 사용자는 이 방식을 "아주 마음에 든다"고 했다. 아래는 실제로 한 번 끝까지 돌려서 얻은 절차와 함정이다.

## 1. 준비

```bash
# 읽기 전용 복제 (add_repo 도구로 먼저 읽기 권한을 확인한다)
mkdir -p /home/user/hugohe3 && cd /home/user/hugohe3
GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 https://github.com/hugohe3/ppt-master ppt-master
# 시스템 파이썬 패키지와 충돌하므로 가상환경을 쓴다
python3 -m venv /tmp/pm-venv --system-site-packages
/tmp/pm-venv/bin/pip install -r /home/user/hugohe3/ppt-master/requirements.txt
python3 skills/ppt-master/scripts/attribution_guard.py   # 0이어야 함. 저작자 표시 파일을 지우면 막힌다 (아래 "외부 코드" 주의 참고)
```
- 스킬 폴더는 `skills/ppt-master/`(81MB). 사용자 계정 스킬로 올리려면 폴더를 통째로 써야 한다(LICENSE, SPONSORS 파일 필수).
- `skills/ppt-master/SKILL.md`와 `workflows/routing.md`가 진입점이다. 경로는 `SKILL_DIR`로 잡고 `cd`하지 않는다.
- 프로젝트 폴더는 복제본의 `projects/` 아래에 만든다. **사용자 저장소(공개일 수 있음)에는 올리지 않는다.**

- `SKILL_DIR=/home/user/hugohe3/ppt-master/skills/ppt-master` 로 잡는다. 본체 `SKILL.md`가 "경로를 추측하지 말고 SKILL_DIR을 기준으로 쓰며 `cd`하지 않는다"고 요구한다.
- **외부 코드 주의:** 받은 저장소의 스크립트를 처음 실행하기 전에 `SKILL.md`와 `workflows/routing.md`를 읽고 무엇을 하는지 확인한다. 자동 모드가 외부 스크립트 실행을 막으면 억지로 우회하지 말고 사용자에게 허용해도 되는지 묻는다. 확인되지 않은 스크립트는 사용자 개인 파일이 있는 폴더에서 실행하지 않는다.
- 이 환경에는 `python-pptx`, `soffice`, `pdftoppm`이 있다 (2026-11-24 확인). 본체 버전은 2026-11-24 기준 v6.10.0이다.

## 2. 절차 (Default Generate)

1. 원문을 한 개 마크다운으로 정리한다(사실 전부). `project_manager.py init <이름>` → `import-sources` → 사진은 `projects/<이름>/images/`에 복사 → `analyze_images.py`.
2. **1단계 확인(채팅):** 받는 사람, 목적, 읽고 난 뒤 달라질 점, 핵심 한 줄, 사용 방식, 보관 방식, 템플릿 없이 새로 설계인지. 질문 도구로 한 번에 묻고, 사용자가 확정할 때까지 만들지 않는다. UI 확인 페이지는 클라우드 세션에서 열 수 없으니 채팅을 쓴다.
3. **2단계 확인:** 디자인 3가지 안(그림으로 — SKILL.md의 예시 3가지 규칙과 같다), 페이지 수, 색, 글꼴, 아이콘, 이미지 출처, 노트·애니메이션·나레이션 여부를 한 번에 확인받는다. 사용자가 섞기를 원하면 섞은 안을 적어 다시 확인한다.
4. `design_spec.md`(I~X)와 `spec_lock.md`를 쓰고 `project_manager.py validate`로 검사한다. 아래 3번의 수치를 맞춘다.
5. 이미지가 필요하면 `images/image_prompts.json`을 쓰고 `image_gen.py --manifest`를 돌린다(아래 이미지 절).
6. SVG 페이지를 `svg_output/`에 만든다. `svg_quality_checker.py <project> --canonical-authoring --stage final --json`이 오류 0이어야 한다.
7. `finalize_svg.py` → `svg_to_pptx.py <project> --no-notes` (노트를 쓰지 않을 때). 결과는 `exports/`.
8. 출력 후 PPTX → PDF → PNG로 모든 쪽을 보고 확인한다(SKILL.md 1장 5번).

## 3. 한국어 덱 수치

- 캔버스 PPT 16:9 = 1280×720. 글꼴 스택은 `Malgun Gothic` 하나만(한글+영문). 한글 글꼴은 이름 한 개만 쓴다.
- px→pt는 ×0.75. 사용자 규칙을 px로 옮기면: 제목 38(약 28pt), 본문 20(15pt), 소제목 24, 설명 16(12pt), 각주 13, 핵심 숫자 40, 표지 64, 큰 숫자(DAY 1 같은) 120. 쓰는 역할은 `design_spec.md` 글꼴 표와 `spec_lock.md typography`에 모두 선언한다.
- `spec_lock.md`의 `forbidden`에는 사용자가 한 말을 그대로 `(user)`를 붙여 적는다(예: "카드·그림자 없이 얇은 선과 사진 중심 (user)").
- AI 이미지를 안 쓰면 §I의 `AI Image Acquisition Path`를 `not applicable`로, §III의 `AI Image Strategy`와 §VIII의 `ai` 행, 락의 `image_rendering` 줄을 지운다.

## 4. 이미지 (중요한 함정)

- Gemini API 키가 있어도 **프로젝트가 무료 단계면 이미지 모델 한도가 0**이다(`429 RESOURCE_EXHAUSTED ... limit: 0`). 이미지 생성은 결제가 연결된 프로젝트의 키가 필요하다. Google AI 구독(재미나이 앱)과 API 과금은 별개다.
- 키 넣는 방법: 환경 설정의 Network secrets에 호스트 `generativelanguage.googleapis.com`, 사용자 지정 헤더 이름 `x-goog-api-key`, **접두사 비움(기본 `Bearer` 삭제)**, 값은 키. 보안 입력창(`request_credential`)은 이 헤더를 받지 못하므로 사용자가 직접 넣는다. 키를 채팅에 쓰지 않게 한다. 새 세션에서 적용될 수 있다.
- 실행: `IMAGE_BACKEND=gemini GEMINI_API_KEY=dummy GEMINI_MODEL=<모델> python image_gen.py --manifest images/image_prompts.json -o images` (더미 값은 프록시가 실제 키로 바꾼다). 모델 이름은 `/v1beta/models` 목록에서 확인한다.
- 실패하면 사용자에게 선택지를 준다: 결제 설정 후 재시도 / 사용자가 직접 생성 / AI 이미지 취소. 취소하면 표지·구분 페이지는 실제 사진 + 짙은 남색 덮개로 대체한다. 제멋대로 다른 서비스로 바꾸지 않는다.
- AI 일러스트는 표지·구분 페이지 배경에만 쓰고, 실제 장소 사진은 그대로 둔다. 글자·간판이 없는 수채 느낌으로 하고, 왼쪽에 글자 자리를 비운다.

## 5. SVG 만들 때 걸린 검사 (미리 피하기)

- **`data-pptx-bounds`가 서로 겹치면 오류**다(1px 허용). 헤더 높이는 제목만 있을 때 76, 부제가 있을 때 112로 잡고 그 아래에서 다음 블록을 시작한다.
- **전면 배경 사진·덮개를 `<g>`로 묶으면** 다른 모든 블록과 겹친다. 직접 자식으로 두고 `data-pptx-role="background"`를 붙인다.
- 글이 자기 `<g>` 경계를 넘으면 오류다(5% 초과). 경계 높이를 글 높이보다 여유 있게 잡는다. 줄바꿈은 직접 한다(`wrap` 함수: `scripts/svg_helpers.py`).
- 한글 글자 폭은 1em, 숫자·영문은 약 0.6em으로 추정하고 3% 여유를 둔다. 실제 PowerPoint에서는 더 넓게 나올 수 있어 열 너비의 약 94%로 잡는다.
- 아이콘은 `<use data-icon="tabler-outline/이름" fill="#색" stroke-width="1.5"/>`. 쓰기 전에 `icon_sync.py <project> tabler-outline/이름...`로 복사한다. 이름이 없는 아이콘이 많다(예: utensils).
- 체커를 `| head`처럼 파이프로 끊으면 보고서가 안 써진다. 파일로 리다이렉트한 뒤 `validation/svg_quality_report.json`에서 `categories.blocking.issues`를 읽는다.
- 반복 구조(일차별 페이지)는 파이썬 스크립트로 SVG를 한꺼번에 생성하는 편이 빠르다(`scripts/svg_helpers.py`). 페이지 수·순서는 `design_spec.md §IX`와 같아야 한다.

## 6. 결과 확인과 전달

- **다른 스킬 없이 확인한다.** 열림 검사: `python3 -c "import pptx; pptx.Presentation('<파일>.pptx')"`. 미리보기: `soffice --headless --convert-to pdf --outdir <폴더> <파일>.pptx` 후 `pdftoppm -r 80 -png <폴더>/<파일>.pdf <폴더>/p`. 모든 쪽 이미지를 직접 보고 넘침·겹침·잘림을 확인한다.
- 렌더는 대체 글꼴이라 줄바꿈이 다르다고 알린다.
- 전달은 `SendUserFile`. 저장 이름은 `#YYYYMMDD_이름_RevN.pptx`.
- 사용자가 PC에서 계정 플러그인으로 직접 설치하길 원하면: Claude Code에서 `/plugin marketplace add hugohe3/ppt-master` → `/plugin install ppt-master@ppt-master`. 이 세션에서는 대신 설치해 줄 수 없다. 이 저장소의 `ppt-master` 스킬을 쓰면 설치 없이 매번 받아서 쓴다.
