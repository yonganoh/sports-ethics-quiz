---
description: Mechanical design PRELIMINARY · 선행설계 [프로젝트] [모듈] — 에이전트를 전부 실행, 산출물은 3D(STEP)와 2D 도면 PDF
argument-hint: [프로젝트] [모듈]
---

선행설계 명령이다. 인자: $ARGUMENTS

설계 시작과 같은 질문을 한 번에 모아 묻고, 답을 받으면 에이전트를 **전부** 실행한다.

1. Google Drive `00_공통` 폴더(`15u06EtC0vnFFmyq2Yp0gJsORWnM7vSH_`)에서 제목이 `00_START`로 시작하는 최신 파일(현재 ID `1wBr7PuFRxYPoO4eSwgsh9xeb_wsvg5rY`)을 읽는다.
2. 대시보드 https://claude.ai/artifact/SpewTfA39w8nvXMfmCx19F 의 `refs` 컬렉션 `r00-guide`(19번 선행설계 명령)와 `r01-rules`를 ArtifactData로 읽는다.
3. 필요 정보를 한 번에 모아 선택형으로 묻는다. 이미 아는 것은 묻지 않는다. **실행 방식은 묻지 않는다** (에이전트 전부 실행).
4. 편성: 기본 6명 전원. 최소 `mech-design-assist`(기구설계 보조) + `design-reviewer`(설계 검토자)는 뺄 수 없다. 사용자가 "최소로" · "절약"이라고 하면 이 2명만 실행한다.
5. 답을 받은 뒤 `.claude/agents/`의 에이전트를 순서대로 실행한다. 단계마다 결과를 보여 주고 승인을 받은 뒤 다음 단계로 간다.
6. 산출물은 **3D**(조립체 STEP 1개 + 부품별 STEP, 3D 뷰어, 간섭 검사)와 **2D 도면 PDF**(A3, 3각법) 둘 다다. 3D는 요청하지 않아도 만든다. 설계 검토자는 간섭 검사 결과와 도면 PDF를 함께 검토한다.
7. 그림 먼저, 공차는 숫자로만, 산출물에 AI·도구 이름을 적지 않는다.

우선순위: 사용자의 그 자리 지시 > 대시보드 작업 지침 > `00_START` > 에이전트 역할 정의.
이 파일에는 설계 값, 도면, 사양, 업체·사람 이름을 적지 않는다 (공개 저장소).
