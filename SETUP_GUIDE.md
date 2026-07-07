# MAKA 설치 및 배포 가이드

MAKA는 Next.js + Supabase(로그인·DB·사진저장) + Vercel(배포) + Google Places API(지도 링크 자동입력) 조합으로 만들어진 사내 맛집 공유 사이트입니다. 아래 순서대로 진행하면 무료로 실제 서비스를 열 수 있습니다.

이미 이전 버전을 배포해두셨다면 1~5단계는 건너뛰고 "기존 설치 업데이트하기" 섹션으로 바로 가셔도 됩니다.

## 1단계. Supabase 프로젝트 만들기

1. https://supabase.com 접속 후 구글 계정 또는 이메일로 가입합니다.
2. "New project" 클릭 → 프로젝트 이름(예: maka), 데이터베이스 비밀번호, 리전(Northeast Asia (Seoul) 추천)을 입력하고 생성합니다. 생성까지 1~2분 걸립니다.
3. 왼쪽 메뉴 SQL Editor로 이동 → 이 폴더의 `supabase/schema.sql` 파일 내용을 전체 복사해서 붙여넣고 "Run"을 눌러 실행합니다. 테이블, 로그인 트리거, 포인트 트리거, 리더보드 뷰, 사진 저장소 버킷이 한 번에 만들어집니다.
4. 왼쪽 메뉴 Project Settings > API Keys 로 이동해서 아래 두 값을 복사해둡니다. (3단계에서 사용)
   - Project URL
   - anon public key ("Legacy anon, service_role API keys" 탭에 있는 값을 사용하세요)

## 2단계. 구글 로그인(OAuth) 설정

1. Supabase 대시보드 왼쪽 메뉴 Authentication > Providers > Google 을 켭니다. 이때 "Callback URL(for OAuth)"이 표시되는데 이 값을 복사해둡니다. (예: `https://xxxx.supabase.co/auth/v1/callback`)
2. https://console.cloud.google.com 접속 → 새 프로젝트 생성(예: MAKA).
3. 왼쪽 메뉴 "API 및 서비스" > "OAuth 동의 화면"(또는 "Google 인증 플랫폼")에서 User Type을 "외부(External)"로 선택하고 앱 이름(MAKA), 지원 이메일 등을 입력해 저장합니다.
4. "API 및 서비스" > "사용자 인증 정보"(또는 "클라이언트") > "OAuth 클라이언트 ID 만들기" → 애플리케이션 유형 "웹 애플리케이션".
5. "승인된 리디렉션 URI"에 1번에서 복사한 Supabase Callback URL을 붙여넣고 저장합니다.
6. 생성된 클라이언트 ID / 클라이언트 보안 비밀을 복사해서, Supabase Authentication > Providers > Google 설정 화면에 각각 붙여넣고 저장합니다.
7. 마지막으로 Supabase Authentication > URL Configuration 에서 "Site URL"과 "Redirect URLs"를 실제 배포 주소로 맞춰줍니다 (5단계에서 배포 주소가 나온 뒤 다시 와서 설정하면 됩니다).

## 3단계. Google Places API 키 발급 (지도 링크 자동입력용)

맛집 등록 화면에서 구글 지도 링크를 붙여넣으면 가게명·위치·사진을 자동으로 가져오는 기능에 필요합니다.

1. https://console.cloud.google.com 에서 2단계와 같은 프로젝트(MAKA) 선택
2. 왼쪽 메뉴 "결제(Billing)" → 결제 계정이 없다면 카드 등록 (Google은 매월 $200 상당의 무료 크레딧을 제공하므로, 소규모 사내 사용에서는 보통 과금되지 않습니다)
3. 왼쪽 메뉴 "API 및 서비스" > "라이브러리" → "Places API" 검색 후 "사용" 클릭
4. "API 및 서비스" > "사용자 인증 정보" > "사용자 인증 정보 만들기" > "API 키" 선택 → 생성된 키를 복사
5. (선택, 보안 강화) 생성된 키를 클릭 → "API 제한사항"에서 "Places API"만 허용하도록 제한

## 4단계. 로컬에서 환경변수 설정 (선택, 테스트용)

1. `.env.local.example` 파일을 복사해 `.env.local` 파일을 만듭니다.
2. `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`에 1단계에서 복사한 값을, `GOOGLE_PLACES_API_KEY`에 3단계에서 복사한 키를 붙여넣습니다.
3. 터미널에서 `npm install` 실행 후 `npm run dev` 로 로컬 테스트가 가능합니다.

## 5단계. GitHub에 코드 올리기

1. https://github.com 에서 새 저장소(Repository)를 만듭니다. (Private 추천)
2. 이 폴더를 저장소에 업로드합니다 (GitHub Desktop을 쓰면 git 명령어 없이 가능합니다).

## 6단계. Vercel 배포

1. https://vercel.com 접속 → 구글 또는 GitHub 계정으로 가입/로그인 (무료 Hobby 플랜).
2. "Add New..." > "Project" → 5단계에서 만든 GitHub 저장소를 선택해서 Import 합니다.
3. "Environment Variables" 항목에 아래 값을 입력합니다.
   - `NEXT_PUBLIC_SUPABASE_URL` = 1단계에서 복사한 Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = 1단계에서 복사한 anon public key
   - `NEXT_PUBLIC_SITE_URL` = 배포될 주소 (처음엔 임의로 넣고 배포 후 실제 주소로 수정 가능)
   - `GOOGLE_PLACES_API_KEY` = 3단계에서 복사한 키
4. "Deploy" 클릭. 2~3분 후 무료 주소가 발급됩니다.
5. 왼쪽 메뉴 "Settings" → "Deployment Protection" → "Vercel Authentication"을 꺼서 동료들이 Vercel 계정 없이 접속할 수 있게 합니다.
6. 다시 구글 클라우드 콘솔 OAuth 클라이언트 설정으로 돌아가서 "승인된 자바스크립트 원본"과 Supabase의 "Site URL" / "Redirect URLs"에 발급된 Vercel 주소를 등록합니다.

## 7단계. 관리자 지정 및 샘플 데이터 넣기

1. 배포된 사이트에 접속해서 waller9929@gmail.com 계정으로 구글 로그인을 한 번 합니다. (자동으로 관리자 권한이 부여됩니다.)
2. Supabase SQL Editor에서 `supabase/seed.sql` 내용을 실행하면 샘플 맛집이 채워집니다. 필요 없으면 건너뛰어도 됩니다.

---

## 기존 설치 업데이트하기 (이전 버전을 이미 배포한 경우)

1. Supabase SQL Editor에서 `supabase/migration_v2.sql` 내용을 전체 실행합니다. (방문일 필드 제거, 구글 지도 링크 컬럼 추가, 레벨 이름 영문화, 기존 한글 데이터를 영문으로 변환)
2. 3단계를 따라 Google Places API 키를 발급받고, Vercel Environment Variables에 `GOOGLE_PLACES_API_KEY`를 추가합니다.
3. Supabase SQL Editor에서 `supabase/migration_v3.sql` 내용을 전체 실행합니다. (가격대 필드를 식당 유형(Value/Standard/Premium)으로 교체, 관리자가 홈페이지 타이틀을 수정할 수 있는 설정 테이블 추가)
4. Supabase SQL Editor에서 `supabase/migration_v4.sql` 내용을 전체 실행합니다. (가성비(Value for money) 컬럼 제거)
5. Supabase SQL Editor에서 `supabase/migration_v5.sql` 내용을 전체 실행합니다. (비로그인 댓글 허용, 방문자 카운트 컬럼/함수 추가)
6. Supabase SQL Editor에서 `supabase/migration_v6.sql` 내용을 전체 실행합니다. (카테고리 목록 변경 — 기존 "Cafe/Dessert" 데이터를 "Cafe"로 이전)
7. Supabase SQL Editor에서 `supabase/migration_v7.sql` 내용을 전체 실행합니다. (숨겨진 "월 식단표" 페이지용 테이블/함수 추가, 기본 비밀번호 `maka2026`)
8. Supabase SQL Editor에서 `supabase/migration_v8.sql` 내용을 전체 실행합니다. (방문 로그 테이블 추가 — 관리자 "Visitors" 대시보드용)
9. Supabase SQL Editor에서 `supabase/migration_v9.sql` 내용을 전체 실행합니다. (협찬 광고 테이블 추가 — 관리자 "Ads" 메뉴용)
10. Supabase SQL Editor에서 `supabase/migration_v10.sql` 내용을 전체 실행합니다. (댓글에 별점/사진 컬럼 추가, 맛집 rating 자동 계산 트리거 추가, 게스트 사진 업로드 허용)
11. Supabase SQL Editor에서 `supabase/migration_v11.sql` 내용을 전체 실행합니다. (게시판 테이블, RSS 피드 테이블 추가 — 아래 "게시판 및 인니 소식 크롤러 설정" 참고)
12. Vercel Environment Variables에 `CRON_SECRET` 값을 하나 추가합니다 (아무 임의의 긴 문자열이면 됩니다. 예: 1Password 등에서 생성). "인니 소식" 자동 수집을 안전하게 예약 실행하기 위한 값입니다.
13. GitHub Desktop으로 새 코드를 push 하면 Vercel이 자동으로 재배포합니다.

## 이번 업데이트로 추가된 기능

- 리더보드는 이제 관리자만 볼 수 있습니다 (메뉴에서도 숨겨집니다).
- 맛집 등록/수정 화면에서 "Restaurant type"을 드롭다운이 아닌 박스 클릭으로 Value/Standard/Premium 중 선택합니다.
- 메인 페이지 상단에 "Today's picks" 섹션이 추가되어, 매번 페이지를 열 때마다 서로 다른 카테고리에서 무작위로 3곳을 추천합니다.
- 관리자 계정으로 로그인하면 우측 상단 "Site settings" 메뉴에서 메인 페이지 상단 타이틀 문구(기본값: "MAKA - Work Hard, Eat Well")를 직접 수정할 수 있습니다.
- "가성비(Value for money)" 별점 기능은 제거되었습니다. 대신 Restaurant type(Value/Standard/Premium)이 그 역할을 대신합니다.
- 맛집 위치(location) 텍스트를 기준으로 "Region: Indonesia / Other" 필터가 추가되었고, Indonesia를 선택하면 주요 도시(Jakarta, Bandung, Surabaya, Bali 등) 하위 필터가 나타납니다. 별도 입력 없이 자동으로 판단됩니다.
- 메인 페이지에 "Today's picks" 옆으로 "Top 10" 랭킹이 추가되었습니다 (평점 높은 순, 동점이면 댓글 수 많은 순, 필터/검색이 없을 때만 표시).
- 관리자 계정의 "Manage places" 메뉴에서 체크박스로 맛집을 선택해서 "Delete selected"로 한 번에 삭제할 수 있습니다 (전체 선택도 가능, 되돌릴 수 없으니 신중하게 사용하세요).
- 같은 "Manage places" 화면에서 이름/위치/카테고리/식당유형을 목록에 바로 입력해서 고칠 수 있습니다. 수정한 행은 파란색으로 표시되고, "Save changes" 버튼을 누르면 바뀐 항목만 한 번에 저장됩니다.
- Google Maps 링크 붙여넣기 시 값이 중복 입력되던 버그를 수정했습니다.
- 로그인하지 않아도 댓글을 남길 수 있습니다. 이름(선택) 입력란에 이름을 적으면 표시되고, 비워두면 "Anonymous"로 표시됩니다. 비로그인 댓글은 포인트가 적립되지 않습니다.
- 사이트 전체 누적 방문자 수(관리자 "Site settings" 페이지에서만 확인 가능)와 각 맛집 상세페이지별 조회수가 집계됩니다.
- 카테고리 목록이 Western(양식) / Cafe(카페) / Korean(한식) / Indonesian(인니식) / Japanese(일식) / Seafood(해산물) / Chinese(중식) / Buffet(뷔페) / Other(기타) / Dessert(디저트) 10종으로 확장되었습니다. 기존 "Cafe/Dessert" 맛집은 일단 "Cafe"로 옮겨지며, 디저트 전문점이면 상세페이지에서 개별로 "Dessert"로 수정해주세요.
- 메인 페이지의 "Today's picks" 제목 글자 자체가 숨김 링크입니다. 누르면 비밀번호를 물어보는 페이지(`/monthly-menu`)로 이동하고, 맞으면 관리자가 올려둔 "월 식단표" 이미지/파일을 보여줍니다. 기본 비밀번호는 `maka2026`이며, 관리자 "Site settings" 페이지에서 비밀번호와 식단표 파일을 바꿀 수 있습니다. (비밀번호는 DB에서 직접 대조만 하고 브라우저로 전달되지 않아 안전합니다.)
- 관리자 전용 "Visitors" 메뉴에서 방문자 대시보드를 볼 수 있습니다. 최근 30일 일별 방문 그래프와, 구글 계정별(비로그인은 "Guest"로 묶어서) 방문 횟수 테이블을 함께 보여줍니다.
- 관리자 메뉴가 "Bulk upload / Site settings / Manage places / Visitors" 4개 버튼으로 나열되던 것을 "Admin" 버튼 하나로 통합했습니다. 클릭하면 왼쪽에 메뉴 목록, 오른쪽에 선택한 화면이 나오는 관리자 전용 페이지로 이동합니다.
- 모든 페이지 맨 아래에 Contact 정보(waller9929@gmail.com)를 표시하는 Footer가 추가되었습니다.
- 관리자 "Manage places" 화면에서 이름/위치/카테고리/식당유형과 함께 평점(Base rating)도 목록에서 바로 수정할 수 있습니다. (이후 댓글 별점 자동 계산 기능이 추가되면서 이 값은 "기준값" 역할로 바뀌었습니다 — 아래 항목 참고)
- Value/Standard/Premium 식당유형 배지 색상을 좀 더 눈에 띄는 파스텔톤(초록/하늘색/핑크)으로 바꿨습니다.
- 관리자 메뉴에 "Ads"가 추가되어, 협찬(광고) 업체명·이미지·링크·게재 기간을 등록/삭제할 수 있습니다. 등록된 광고 중 게재 기간에 해당하는 것 하나가 메인 페이지 필터바 바로 위에 "Sponsored" 표시와 함께 노출되고, 여러 개가 겹치면 방문할 때마다 무작위로 하나가 보여집니다. 게재 기간이 지나면 자동으로 노출에서 빠집니다.
- 댓글을 남길 때 별점(1~5, 선택)과 사진(최대 4장, 선택)을 함께 남길 수 있습니다. 비로그인 댓글에도 동일하게 적용됩니다.
- 맛집의 전체 평점(Rating)이 이제 자동으로 계산됩니다. 관리자/작성자가 입력한 값(Manage places의 "Base rating" 또는 상세페이지 수정화면의 "Base rating")을 "가상 댓글 1개"로 취급하고, 여기에 별점을 남긴 실제 댓글들을 더해 평균을 냅니다. 댓글이 추가/수정/삭제되거나 Base rating이 바뀔 때마다 자동으로 재계산됩니다.
- 맛집 상세페이지 수정 화면에서 메인 이미지를 새로 업로드해서 교체할 수 있습니다.
- 맛집 등록 화면에 "Search on Google" 버튼이 추가되었습니다. 눌러서 식당 이름을 검색하고 목록에서 선택하면 이름·위치·카테고리·사진·구글지도 링크가 자동으로 채워집니다 (기존 "링크 붙여넣기" 방식도 그대로 사용 가능합니다).
- 상단 메뉴에 "Board"가 추가되어 누구나(비로그인 게스트 포함) 자유게시판·중고거래/나눔장터·Q&A/건의함·식당 경험담 게시글을 쓸 수 있습니다. 공지사항은 관리자만 작성 가능합니다. 글 작성 +10점, 댓글 작성 +3점, 내 글에 댓글이 달리면 +1점으로 맛집과 동일한 포인트 기준이 적용됩니다. 게시글에는 사진을 최대 4장까지 첨부할 수 있습니다.
- "인니 소식" 게시판은 관리자가 등록한 RSS 피드에서 자동으로 기사를 가져와 제목/요약/원문링크 형태로 올립니다 (기사 전체를 복제하지 않고 항상 원문 링크로 연결됩니다). 관리자 "Board" 메뉴에서 RSS 피드 소스를 추가/삭제하고 "Fetch now" 버튼으로 즉시 가져올 수도 있습니다. 자동 수집은 Vercel Cron으로 하루 한 번(UTC 22시, 자카르타 기준 새벽 5시경) 실행됩니다 — Vercel 무료(Hobby) 플랜은 예약 실행을 하루 1회로 제한하기 때문입니다. 더 자주 갱신하고 싶다면 관리자 화면의 "Fetch now" 버튼을 수동으로 눌러주시면 됩니다.

## 이번 업데이트로 추가된 기능 (v16)

- 상단 메뉴 오른쪽에 언어 변경 버튼(EN/KO/ID)이 추가되었습니다. 메뉴, 검색창, 홈페이지 제목, 게시판 등 화면 문구가 선택한 언어로 바뀝니다 (단, 맛집 이름·댓글·게시글처럼 사람이 직접 쓴 내용은 번역되지 않습니다). 선택한 언어는 브라우저 쿠키에 저장되어 다음 방문 때도 유지됩니다.
- 상단 메뉴의 "Board" 글자가 눈에 잘 띄도록 색상 배지 스타일로 바뀌었습니다.
- 홈페이지에 "Today's picks" / "Top 10" 옆으로 "From the board" 섹션이 추가되어, 최근 게시글 5개를 미리 볼 수 있습니다.
- 게시판 목록 화면에도 댓글 수와 함께 조회수가 표시됩니다 (상세페이지에는 기존부터 있었습니다).
- 본인이 작성한 게시글은 상세페이지에서 "Edit" 버튼으로 제목·내용·사진을 직접 수정할 수 있습니다 (사진은 최대 4장, 게스트로 작성한 글은 수정 기능이 없습니다 — 로그인 계정으로 쓴 글만 해당).
- 관리자의 게시글/댓글 삭제 권한을 전체 점검했습니다 (기존 v15부터 정상 동작 중이었음을 재확인).
- 맛집 등록 화면의 "Search on Google" 팝업에 "📍 Use my current location" 버튼이 추가되어, 브라우저 위치 권한을 허용하면 현재 위치에서 가까운 식당 목록을 바로 보여줍니다 (검색어 없이도 사용 가능하며, 검색어와 함께 쓰면 내 주변 반경 5km 내에서 우선적으로 찾아줍니다).

## 게시판 및 인니 소식 크롤러 설정

1. 관리자 계정으로 로그인 후 우측 상단 "Admin" → "Board" 메뉴로 이동합니다.
2. "인니 소식 RSS 피드 소스" 섹션에서 이름과 RSS 피드 URL을 입력해 소스를 추가합니다 (예: 언론사에서 제공하는 RSS 주소).
3. "Fetch now" 버튼을 눌러 바로 가져와지는지 확인합니다.
4. 그대로 두면 매일 한 번 자동으로도 새 기사를 가져옵니다.

## 대량 맛집 업로드 (구글 지도 저장 리스트 가져오기)

1. https://takeout.google.com 접속 → 로그인 → "Deselect all" 후 "저장됨(Saved)" 항목만 체크 → 내보내기
2. 받은 파일에서 가져오고 싶은 리스트의 장소명·주소·카테고리를 확인합니다.
3. 사이트에 관리자 계정으로 로그인 후 우측 상단 "Admin" 버튼 → "Bulk upload places" 페이지로 이동
4. "Download template.csv"로 양식을 받아서 장소명(name), 위치(location), 카테고리(category), 구글지도 링크(google_maps_url), 코멘트(comment)를 채워 넣습니다.
5. 채운 CSV 파일을 업로드하면 미리보기가 뜨고, "Import" 버튼으로 한 번에 등록됩니다. (평점·가성비·시간대·동행 태그는 비어있는 채로 등록되며, 나중에 각 맛집 상세 페이지에서 개별 수정 가능합니다.)

## 참고사항

- Vercel 무료(Hobby) 플랜은 개인/비상업 프로젝트 기준 약관입니다. 사내 소규모 도구로 쓰는 정도는 실무상 문제되는 경우가 드물지만, 정식으로는 유료 Pro 플랜이 약관에 맞습니다.
- 회사 도메인(예: maka.company.com)을 연결하려면 도메인을 구매한 뒤 Vercel 프로젝트 Settings > Domains 에서 연결하면 됩니다.
- Google Places API는 무료 크레딧을 초과하면 과금될 수 있습니다. 사용량은 Google Cloud Console의 "결제" 메뉴에서 확인할 수 있습니다.
