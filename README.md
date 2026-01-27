# 🤠 FATALDRAW GITHUB PROFILE CARDS

<div align="center">
    <img src="https://raw.githubusercontent.com/DevBawky/FATALDRAW_Github_Profile_Details/output/stats.svg" alt="Bawky's Github Stats" width="600px" />
</div>


자신의 GitHub 통계를 __`서부 영화 현상수배 포스터(Western Wanted Poster)`__ 스타일로 만들어주는 생성기입니다!<br>
커밋 수와 스타 수에 따라 __`현상금`__ 이 책정되고 __`등급(S+ ~ D)`__ 이 매겨집니다.

## 특징
- __`현상금 시스템`__: 활동량에 따라 현상금이 올라갑니다. (최대 $99,999,999)
- __`등급 도장`__: 현상금 액수에 따라 S+에서 D급까지 도장이 찍힙니다.
- __`빈티지 필터`__: 프로필 사진에 자동으로 낡은 종이 질감과 잉크 효과가 적용됩니다.
- __`FATALDRAW 캐릭터`__: 원하는 캐릭터 이미지를 둘 중 하나를 선택하여 넣을 수 있습니다.

### 캐릭터 종류
| Juno | Rosalyn |
| ---- | ---- |
| <img width="300" height="300" alt="12" src="https://github.com/user-attachments/assets/d791ddee-c31e-4db9-9eb9-61e7665d15c6" /> | <img width="300" height="300" alt="13" src="https://github.com/user-attachments/assets/30b4498d-61ad-45fc-9a8d-70504598e806" /> |

## 사용 방법 (How to use)

1. 이 리포지토리를 **Fork** 하거나 **Use this template** 버튼을 클릭하여 자신의 계정으로 가져갑니다.
2. `assets` 폴더에 원하는 캐릭터 이미지를 업로드합니다.
   - 파일명 예시: `char_MyChar.png`
3. `.github/workflows/update-stats.yml` 파일을 엽니다.
4. `env` 섹션에서 `CHARACTER` 변수를 자신의 이미지 파일명(확장자 제외)으로 변경합니다.
   ```yaml
   env:
     CHARACTER: MyChar # char_MyChar.png 인 경우

5. Actions 탭으로 이동하여 워크플로우를 활성화(Enable) 합니다.
6. __`Run workflow`__ 를 눌러 수동으로 한 번 실행합니다.
7. 완료되면 output 브랜치에 __`stats.svg`__ 파일이 생성됩니다!

## 프로필에 적용
`![Wanted Stats](https://raw.githubusercontent.com/자신의_아이디/FATALDRAW_Github_Profile_Details/main/stats.svg)`
