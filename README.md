# ggokiorder

요소 목록의 순서 변경을 위한 컴포넌트 sortable 대체재

## 설치

Angular 19 / 20 을 지원한다. (`peerDependencies: >=19.0.0 <21.0.0`)

```bash
npm i github:toonsquare/Ggokiorder#v1.0.1
```

`v1.0.1` 부터는 빌드 산출물(`dist/ggokiorder`)이 루트인 `release` 브랜치를
가리키므로 패키지 이름 그대로 import 하면 된다.

```ts
import { GgokiorderComponent } from 'ggokiorder';
```

> `v1.0.0` 은 루트가 Angular 워크스페이스라 `ggokiorder/dist/ggokiorder` 경로로
> import 해야 했고, Angular 19 가 중첩 설치되어 NG3004 가 발생했다.
> 반드시 `v1.0.1` 이상을 사용할 것.

## 개발

```bash
npm ci
npm run build:lib    # dist/ggokiorder 생성
npm run pack:lib     # tarball 생성해 내용 확인
```

`release` 브랜치는 `dist/ggokiorder` 트리를 그대로 루트로 갖는 배포 전용
브랜치다. 소스는 `main` 에서만 수정한다.

# 선택 및 이동 규칙

## 레퍼런스 : 구글 PPT 의 페이지 선택 및 이동

## 적용 규칙

### `mousedown` 이벤트

- `mousedown` 으로 단일 선택
- `Ctrl + mousedown` 으로 원하는 요소 다중 선택 (`@Input() multiSelectMode: boolean` 값 `true` 일 경우)
- `Shift + mousedown` 으로 이전 선택 요소로부터 mousedown 요소까지 다중 선택 (`@Input() multiSelectMode: boolean` 값 `true` 일 경우)
  - 기준점 규칙
    - 마지막 단일 선택 혹은 `Ctrl key` 다중 선택 요소 기준
    - 마지막 선택 요소를 `Ctrl + mouseup` 선택 해제 했을 경우 선택 한 요소 중 마지막 요소 기준

### `mousemove` 이벤트

- 선택한 요소들 모아서 이동 시작
- 요소와 요소 사이에 이동시 divider 표시해주며 `mouseup` 시 해당 위치로 요소들 이동
- divider 표시 기준은 요소 상하로부터 `@Input() moveArea: number` 까지의 범위
- `@Input() isHierarchy` 가 `true` 일 경우 요소의 가운데 영역(상하 `moveArea` 를 제외한 부분)에서는 divider 대신 해당 행이 하이라이트 되며, `mouseup` 시 그 행의 하위로 편입

### `mouseup` 이벤트

- 다중 선택일 때 `mouseup` 으로 선택 요소 외 선택해제하고 단일 선택
- 다중/단일 선택일 때 `Ctrl + mouseup` 으로 해당 요소 선택 해제
- `mousemove` 였을 때 이동 중지하고 이동한 요소대로 정렬

# 사용법

## 모듈 추가

- `GgokiorderComponent` 와 `OrderDirective` 모두 standalone 이다
- 사용하는 standalone 컴포넌트의 `@Component > imports` (혹은 `*.module.ts > @NgModule > imports`) 에 `GgokiorderComponent`, `OrderDirective` 추가

## 지원 환경

- Angular 19 / 20 / 21
- zone.js, zoneless(`provideZonelessChangeDetection`) 모두 지원
- SSR 안전. 서버에서는 `ResizeObserver` 등록과 레이아웃 계산을 하지 않고 브라우저 첫 렌더 뒤에 초기화한다

## Input 데코레이터

### `objects`

- __필수__ `Input`. 타입 `T[]` (`T extends GgokiorderObject`)
- 요소 목록에 대응하는 object 배열. `orderDirective` 를 붙인 요소들과 순서가 일치해야 한다
- `GgokiorderObject` 는 `{ id: number; parentObjectId?: number | null }` 를 만족해야 한다 (`parentObjectId` 는 선택. isHierarchy 를 쓰지 않으면 없어도 된다)
- __ggokiorder 가 이동 결과를 이 배열에 직접 반영(in-place)한다__

### `selected`

- __필수__ `Input`. 타입 `number[]`
- 선택한 요소의 index 배열
- __ggokiorder 가 선택 변경을 이 배열에 직접 반영(in-place)한다__

### `moveArea`

- 선택 `Input`. 타입 `number`. 기본값 `10`
- 요소의 상단 혹은 하단으로부터 `${moveArea}px` 까지를 이동 시킬 목표 지점으로 삼는다

### `multiSelectMode`

- 선택 `Input`. 타입 `boolean`. 기본값 `true`
- 다중선택 가능/불가능 체크
- `false` 일 경우 다중 선택 불가능

### `allowNoSelection`

- 선택 `Input`. 타입 `boolean`. 기본값 `false`
- 선택없음 가능/불가능 체크
- false 면 기본 한개 이상 선택 상태 유지

### `isHierarchy`

- 선택 `Input`. 타입 `boolean`. 기본값 `false`
- 부모-자식 계층 모드 사용 여부
- `true` 일 경우 `objects` 는 `parentObjectId` 로 부모를 가리키고(없거나 `null` 이면 최상위), 부모 행은 `isCollapsed` (Angular `WritableSignal<boolean>`) 로 접힘 상태를 노출해야 한다
- 부모 행을 이동시키면 자식 행이 함께 이동하고, 행 가운데 영역에 드랍하면 해당 행의 하위로 편입된다
- 부모 접기/펼치기는 `toggleCollapse(object: T)` public 메서드로 처리한다

## Output 데코레이터

### moved

- emit 타입
  ```
  MovedObject[]: {
    order: number;          // 이동 후 objects 배열에서의 새 index
    parentObjectId?: number | null; // 이동 후 소속 부모 id (null = 최상위). isHierarchy 아니면 담기지 않음
  }[]
  ```
- 순서 또는 소속이 __바뀐 항목만__ 담아 전달
- `objects` 배열은 emit 시점에 이미 재정렬 되어 있으므로 `objects[order]` 로 대상 object 를 얻는다

### clickItem

- emit 타입
  ```
  ClickItem<T>: {
    object?: T;
    isMultiSelect: boolean;
    button: number;
    isSelect: boolean;
  }
  ```
- `mousedown`, `mouseup` 했을 때 선택 목록 변경되면 변경 값 전달
- `object` 는 선택 전체 해제 시 `undefined`
- `isSelect` 는 이번 클릭이 선택인지(`true`) 선택 해제인지(`false`)

### changeHeight

- emit 타입
  ```
  void
  ```
- 전체 요소 목록의 height 가 변할 경우 변경 됐음 전달

### movingState

- emit 타입
  ```
  boolean
  ```
- 선택 아이템 이동 상태인지 토글값 전달

## orderDirective

- ggokiorder 에 넣어주는 __요소마다 반드시 붙여야 하는__ directive
- `mousedown` 감지, 요소 크기 변경(`ResizeObserver`) 감지, 위치 스타일 적용을 담당한다
- 요소에 `position`, `top`, `left`, `z-index`, `opacity` 를 직접 지정하므로 이 속성들은 소비자 쪽에서 지정해도 덮어써진다. 그 외 인라인 스타일은 유지된다
- 행을 래퍼 요소로 감싸도 인식된다 (`@ContentChildren` 이 `descendants: true`)

## scss

### --max-height

- 기본값: none
- ggokiorder 의 최대 height

### --scroll-spot-height

- 기본값 20px;
- ggokiorder 스크롤 있을 때 최상/최하단 마우스 올렸을 때 스크롤 되는 영역

### --goal-width

- 기본값 100%
- 목표 위치 디바이더의 가로 크기

### --goal-thickness

- 기본값 2px
- 목표 위치 디바이더의 두께

### --goal-color

- 기본값 red
- 목표 위치 디바이더의 색

### --goal-radius

- 기본값 1px
- 목표 위치 디바이더의 radius

### --child-indent

- 기본값 0px
- isHierarchy 시 자식 행(부모가 있는 행)의 좌측 들여쓰기 폭. ggokiorder 가 행에 padding-left 로 적용한다
- 목표 위치가 부모 하위일 때 디바이더는 이 값보다 4px 더 들여쓰기 된다

# 예제

## *.ts

```ts
import { Component } from '@angular/core';
import { ClickItem, GgokiorderComponent, GgokiorderObject, MovedObject, OrderDirective } from 'ggokiorder';

interface TestObject extends GgokiorderObject {
  id: number;
  name: string;
}

@Component({
  selector: 'test',
  templateUrl: './test.component.html',
  styleUrls: ['./test.component.scss'],
  imports: [GgokiorderComponent, OrderDirective]
})
export class Test {
  public tests: TestObject[] = ['ㄱㄱㄱ', 'ㄴㄴㄴ', 'ㄷㄷㄷ', 'ㄹㄹㄹ', 'ㅁㅁㅁ', 'ㅂㅂㅂ', 'ㅅㅅㅅ', 'ㅇㅇㅇ', 'ㅈㅈㅈ', 'ㅊㅊㅊ', 'ㅋㅋㅋ', 'ㅌㅌㅌ', 'ㅍㅍㅍ', 'ㅎㅎㅎ'].map(
    (name, id) => ({ id, name })
  );
  public testsSelected: number[] = [];

  /**
   * 리스트 값 추가
   * @return {void}
   */
  testAddFunc(): void {
    this.tests.push({ id: Date.now(), name: Math.random().toString() });
  }

  /**
   * 리스트 값 제거
   * @return {void}
   */
  testDeleteFunc(): void {
    const removing: number[] = [...this.testsSelected].sort((a, b) => b - a);
    removing.forEach(index => {
      this.tests.splice(index, 1);
    });
    this.testsSelected = [0];
  }

  /**
   * ggokiorder 순서 결과 반영
   * tests 배열은 emit 시점에 이미 재정렬 되어 있으므로 order 를 index 로 대상 object 를 얻는다
   * @param {MovedObject[]} moved 순서 또는 소속이 바뀐 항목 목록
   * @return {void}
   */
  orderChange(moved: MovedObject[]): void {
    if (moved.length === 0) return;

    moved.forEach(({ order }) => {
      const object: TestObject = this.tests[order];
      console.log(object, order);
    });
  }

  /**
   * 요소 선택 처리
   * testsSelected 는 ggokiorder 가 직접 갱신하므로 여기서 다시 대입하지 않는다
   * @param {ClickItem<TestObject>} clickItem
   * @param {TestObject} [clickItem.object] 클릭 한 요소의 object (전체 선택 해제 시 undefined)
   * @param {boolean} clickItem.isMultiSelect 싱글 셀렉인지 멀티 셀렉인지
   * @param {number} clickItem.button 누른 마우스 버튼
   * @param {boolean} clickItem.isSelect 선택인지 선택 해제인지
   * @return {void}
   */
  selectTest(clickItem: ClickItem<TestObject>): void {
    console.log(clickItem.object, clickItem.isSelect);
  }
}
```

## *.html

```angular2html
<button style="background: #00ff00" (click)="testAddFunc()">값 추가</button>
<button style="background: #00ff00" (click)="testDeleteFunc()">값 제거</button>
<ggokiorder [objects]="tests" [selected]="testsSelected" (clickItem)="selectTest($event)" (moved)="orderChange($event)">
  <!-- 아이템 목록. ggokiorder 의 ng-content 에 들어갈 내용 -->
  @for (test of tests; track test.id; let index = $index) {
    <div class="test-item" orderDirective [class.selected]="testsSelected.includes(index)">
      <div class="index-wrapper">{{ index }}</div>
      <div class="text-wrapper">{{ test.name }}</div>
    </div>
  }
</ggokiorder>
```

## *.scss

```scss
ggokiorder {
  --max-height: 450px;
  --scroll-spot-height: 30px;

  --goal-width: 90%;
  --goal-thickness: 6px;
  --goal-color: #ff00ff;
  --goal-radius: 3px;
}

.test-item {
  position: relative;
  width: 100%;
  height: 44px;
  padding: 2px 8px;
  background: #00ffff;
  display: flex;
  border: 2px solid #ffffff;

  &.selected {
    border: 2px solid green;
  }

  .index-wrapper {
    background: #ffff00;
  }

  .text-wrapper {
    background: #dddd00;
  }
}
```
