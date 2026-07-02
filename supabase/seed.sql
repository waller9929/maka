-- ==========================================================
-- 샘플(시드) 맛집 데이터
-- 주의: 반드시 관리자 계정(waller9929@gmail.com)으로 사이트에
-- 최소 1번 구글 로그인을 한 뒤에 이 스크립트를 실행하세요.
-- (profiles 테이블에 관리자 행이 먼저 생성되어 있어야 합니다.)
-- ==========================================================

insert into public.places
  (name, location, category, rating, value_rating, price_range, visit_date,
   time_tags, companion_tags, comment, created_by)
select
  v.name, v.location, v.category, v.rating, v.value_rating, v.price_range, v.visit_date::date,
  v.time_tags, v.companion_tags, v.comment,
  (select id from public.profiles where email = 'waller9929@gmail.com')
from (
  values
    ('안녕순대국', '강남역 3번 출구', '한식', 4.5, 4.7, '1만원 이하', '2026-06-10',
      array['점심'], array['혼자서','친구·동료와 함께'],
      '점심에 빠르게 먹기 좋아요. 순대국밥이 진하고 양도 넉넉합니다.'),
    ('모모스커피', '역삼동', '카페·디저트', 4.8, 3.9, '1~2만원', '2026-06-05',
      array['저녁','주말'], array['혼자서','친구·동료와 함께'],
      '커피 맛이 좋고 자리가 여유로워서 미팅하기도 좋아요.'),
    ('스시겐', '삼성동', '일식', 4.2, 3.5, '2~3만원', '2026-05-28',
      array['저녁'], array['친구·동료와 함께'],
      '오마카세 아니고 캐주얼한 초밥집인데 퀄리티가 좋습니다.'),
    ('파스타로카', '논현동', '양식', 4.0, 4.2, '1~2만원', '2026-05-20',
      array['저녁','주말'], array['가족과 함께','친구·동료와 함께'],
      '가격 대비 양이 많고 파스타 종류가 다양해요.')
) as v(name, location, category, rating, value_rating, price_range, visit_date, time_tags, companion_tags, comment)
where exists (select 1 from public.profiles where email = 'waller9929@gmail.com');
