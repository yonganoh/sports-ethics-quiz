# 실제 장소 사진 구하기

사용자는 "진짜 그 장소의 사진"을 원한다. 가장 안전한 출처는 Wikimedia Commons의 자유 이용 사진이다(촬영자·라이선스 표기가 가능).

## 환경 준비

클라우드 세션은 기본적으로 외부 호스트가 막혀 있다. 사진을 받으려면 환경에 다음 호스트를 허용해야 한다(사용자 승인이 필요하다).
`commons.wikimedia.org`, `upload.wikimedia.org`, `en.wikipedia.org`

주의: 썸네일 주소가 `thumb.wikimedia.org`로 오면 막힌다. 같은 경로를 `upload.wikimedia.org`로 바꾸고 `?utm...` 쿼리를 지운다.

## 검색

Commons API로 파일 이름공간 검색:
`https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=<장소 영문명>+filetype:bitmap&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=900`
결과의 `extmetadata`에서 라이선스(`LicenseShortName`)와 촬영자(`Artist`)를 읽어 출처 슬라이드에 쓴다.

- User-Agent는 개인정보가 없는 일반적인 이름으로 보낸다.
- 외국 지명은 영문 표기가 잘 맞는다. 못 찾는 곳이 많다(숙소 객실, 체험 시설 등).
- 고른 뒤에는 **직접 눈으로 확인**한다. 캡션과 사진이 안 맞는 경우가 있다(예: 호텔 사진에 주유소 간판이 크게 나옴).

## 속도 제한 (429)

공유 IP라 자주 막힌다. 한 번에 몰아 받지 말고 간격을 둔다.
- `python urllib`보다 `curl -A "<일반 이름>"`이 잘 통과했다.
- 파일당 10~15초 간격, 429면 30~45초 쉬고 재시도(최대 6회). 재시도 루프를 쉬지 않고 돌리면 계속 막힌다.
- 실행은 백그라운드로 돌리고 로그를 본다. 이미 받은 파일은 건너뛰도록 짠다.

## 못 찾았을 때

- 억지로 비슷한 다른 장소 사진을 쓰지 않는다. 쓰면 캡션에 **(예시)**를 적는다.
- 사용자에게 "찾지 못한 곳" 목록을 알리고, 사진을 보내 달라고 하면 그것을 쓴다(사용자 제공 사진 출처 표기 규칙 적용).
- 블로그·상품 페이지 사진은 사용자가 직접 준 경우에만 쓰고 "개인 공유용" 표기를 붙인다.
- 사진에 낯선 사람의 얼굴이 크게 나오면 사용자에게 알리고 용도를 개인 공유로 한정한다.
