# MAKA 설치 및 배포 가이드

MAKA는 Next.js + Supabase(로그인·DB·사진저장) + Vercel(배포) 조합으로 만들어진 사내 맛집 공유 사이트입니다. 아래 순서대로 진행하면 무료로 실제 서비스를 열 수 있습니다.

## 1단계. Supabase 프로젝트 만들기

1. https://supabase.com 접속 후 구글 계정 또는 이메일로 가입합니다.
2. "New project" 클릭 → 프로젝트 이름(예: maka), 데이터베이스 비밀번호, 리전(Northeast Asia (Seoul) 추천)을 입력하고 생성합니다. 생성까지 1~2분 걸립니다.
3. 왼쪽 메뉴 SQL Editor로 이동 → 이 폴더의 `supabase/schema.sql` 파일 내용을 전체 복사해서 붙여넣고 "Run"을 눌러 실행합니다. 테이블, 로그인 트리거, 포인트 트리거, 리더보드 뷰, 사진 저장소 버킷이 한 번에 만들어집니다.
4. 왼쪽 메뉴 Project Settings > API 로 이동해서 아래 두 값을 복사해둡니다. (3단계에서 사용)
   - Project URL
   - anon public key

## 2단계. 구글 로그인(OAuth) 설정

1. Supabase 대시보드 왼쪽 메뉴 Authentication > Providers > Google 을 켭니다. 이때 "Callback URL(for OAuth)"이 표시되는데 이 값을 복사해둡니다. (예: `https://xxxx.supabase.co/auth/v1/callback`)
2. https://console.cloud.google.com 접속 → 새 프로젝트 생성(예: MAKA).
3. 왼쪽 메뉴 "API 및 서비스" > "OAuth 동의 화면"에서 User Type을 "외부(External)"로 선택하고 앱 이름(MAKA), 지원 이메일 등을 입력해 저장합니다.
4. "API 및 서비스" > "사용자 인증 정보" > "사용자 인증 정보 만들기" > "OAuth 클라이언트 ID" 선택 → 애플리케이션 유형 "웹 애플리케이션".
5. "승인된 리디렉션 URI"에 1번에서 복사한 Supabase Callback URL을 붙여넣고 저장합니다.
6. 생성된 클라이언트 ID / 클라이언트 보안 비밀을 복사해서, Supabase Authentication > Providers > Google 설정 화면에 각각 붙여넣고 저장합니다.

## 3단계. 로컬에서 환경변수 설정 (선택, 테스트용)

1. `.env.local.example` 파일을 복사해 `.env.local` 파일을 만듭니다.
2. `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`에 1단계에서 복사한 값을 붙여넣습니다.
3. 터미널에서 `npm install` 실행 후 `npm run dev` 로 로컬 테스트가 가능합니다.

## 4단계. GitHub에 코드 올리기

1. https://github.com 에서 새 저장소(Repository)를 만듭니다. (Private 추천)
2. 이 폴더를 저장소에 업로드합니다 (GitHub Desktop을 쓰면 git 명령어 없이 가능합니다).

## 5단계. Vercel 배포

1. https://vercel.com 접속 → 구글 또는 GitHub 계정으로 가입/로그인 (무료 Hobby 플랜).
2. "Add New..." > "Project" → 4단계에서 만든 GitHub 저장소를 선택해서 Import 합니다.
3. "Environment Variables" 항목에 아래 값을 입력합니다.
   - `NEXT_PUBLIC_SUPABASE_URL` = 1단계에서 복사한 Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = 1단계에서 복사한 anon public key
   - `NEXT_PUBLIC_SITE_URL` = 배포될 주소 (예: `https://maka.vercel.app`, 처음엔 임의로 넣고 배포 후 실제 주소로 수정 가능)
4. "Deploy" 클릭. 2~3분 후 `https://maka-xxxx.vercel.app` 같은 무료 주소가 발급됩니다.
5. 다시 구글 클라우드 콘솔 OAuth 클라이언트 설정으로 돌아가서 "승인된 자바스크립트 원본"에 발급된 Vercel 주소를 추가로 등록합니다.

## 6단계. 관리자 지정 및 샘플 데이터 넣기

1. 배포된 사이트에 접속해서 waller9929@gmail.com 계정으로 구글 로그인을 한 번 합니다. (자동으로 관리자 권한이 부여됩니다.)
2. Supabase SQL Editor에서 `supabase/seed.sql` 내용을 실행하면 샘플 맛집 4곳이 채워집니다. 필요 없으면 건너뛰어도 됩니다.

## 참고사항

- Vercel 무료(Hobby) 플랜은 개인/비상업 프로젝트 기준 약관입니다. 사내 소규모 도구로 쓰는 정도는 실무상 문제되는 경우가 드물지만, 정식으로는 유료 Pro 플랜이 약관에 맞습니다.
- 회사 도메인(예: maka.company.com)을 연결하려면 도메인을 구매한 뒤 Vercel 프로젝트 Settings > Domains 에서 연결하면 됩니다.
- 자카르타 맛집 자동 수집(Google Places API 연동)은 이번 버전에는 포함되어 있지 않습니다. 필요하면 다음 단계로 추가할 수 있습니다.
