import { AfterContentInit, AfterViewInit, ElementRef, EventEmitter, OnChanges, OnDestroy, QueryList, SimpleChanges } from '@angular/core';
import { OrderDirective } from './order.directive';
import { ClickItem, GgokiorderObject, MovedObject, OrderEvent } from './ggokiorder.models';
import * as i0 from "@angular/core";
interface GgokiorderItem<T extends GgokiorderObject = GgokiorderObject> {
    directive: OrderDirective;
    object: T;
    order: number;
    top: number;
    prevTop?: number;
    isMousedown?: boolean;
}
interface MovedItem {
    prev: number;
    isSelected: boolean;
}
interface MovedResultArray {
    items: MovedItem[];
    orders: number[];
}
export declare class GgokiorderComponent<T extends GgokiorderObject = GgokiorderObject> implements AfterViewInit, AfterContentInit, OnDestroy, OnChanges {
    items: QueryList<OrderDirective>;
    scrollDiv: ElementRef;
    orderDiv: ElementRef;
    emptyDiv: ElementRef;
    goalDivider: ElementRef;
    selected: number[];
    moveArea: number;
    objects: T[];
    multiSelectMode: boolean;
    allowNoSelection: boolean;
    isHierarchy: boolean;
    moved: EventEmitter<MovedObject[]>;
    clickItem: EventEmitter<ClickItem<T>>;
    changeHeight: EventEmitter<void>;
    movingState: EventEmitter<boolean>;
    isMoving: boolean;
    targetIndex: number | undefined;
    targetTop: number | undefined;
    targetParentIndex: number | undefined;
    isDividerIndented: boolean;
    clientY: number | undefined;
    scrollInterval: number;
    private changeSub;
    private orderItems;
    private movingItems;
    private movingIndices;
    private mousedownIndex;
    private prevMousedownIndex;
    private lastShiftIndex;
    private minTop;
    private maxTop;
    private mousedownX;
    private mousedownY;
    private mousedownButton;
    private scrollY;
    private maxScroll;
    private isMovingInit;
    private isActiveChanged;
    private deferredSelection;
    private isInternallyChanged;
    private dropTargetItem;
    private dropBoundaryParentId?;
    private _mousedownItem;
    get mousedownItem(): GgokiorderItem<T> | undefined;
    set mousedownItem(item: GgokiorderItem<T> | undefined);
    get ensureMousedownItem(): GgokiorderItem<T>;
    ngOnChanges(changes: SimpleChanges): void;
    ngAfterContentInit(): void;
    ngAfterViewInit(): void;
    ngOnDestroy(): void;
    /**
     * ng-content 요소들 기본 스타일 적용
     * @param {QueryList<OrderDirective>} orderElements
     * @return {void}
     */
    initGgokiorder(orderElements: QueryList<OrderDirective>): void;
    /**
     * 요소 height 변경
     * @return {void}
     */
    resizeElements(): void;
    /**
     * movingItems 초기화
     * @return {void}
     */
    initMovingItems(): void;
    /**
     * selected 목록 초기화
     * @return {void}
     */
    initSelected(): void;
    /**
     * 부모 행 접기/펼치기 토글. 접힘 상태(아이템 시그널)를 뒤집고 목록 레이아웃을 갱신한다.
     * (부모 접기/펼치기 기능을 ggokiorder 가 담당)
     * @param {T} object 부모 행의 object
     * @returns {void}
     */
    toggleCollapse(object: T): void;
    /**
     * mousedown event
     * @param {OrderEvent} event
     * @return {void}
     */
    mousedownEvent(event: OrderEvent): void;
    /**
     * Shift Mousedown 으로 Multi select
     * @return {void}
     */
    selectItemOnShiftMousedown(): void;
    /**
     * Ctrl Mousedown 으로 Multi select
     * @return {void}
     */
    selectItemOnCtrlMousedown(): void;
    /**
     * Ctrl Mouseup 으로 선택 및 해제
     * @returns {boolean}
     */
    selectItemOnCtrlMouseup(): boolean;
    /**
     * mousedown 시 이동일 경우와 분기 처리
     * @return {void}
     */
    selectItemWithSelected(): void;
    /**
     * Single Select
     * @return {void}
     */
    selectItem(): void;
    /**
     * mousemove event
     * @param {MouseEvent} event
     * @return {void}
     */
    mousemoveEvent: (event: MouseEvent) => void;
    /**
     * 마지막 요소 부분 빈 div 세팅
     * 없으면 스크롤 이상하게 움직임
     * @return {void}
     */
    setLastItem(): void;
    /**
     * mouseup event
     * @param {MouseEvent} event
     * @return {void}
     */
    mouseupEvent: (event: MouseEvent) => void;
    /**
     * 선택 요소들 이동 전 초기화
     * @return {void}
     */
    movingInit(): void;
    /**
     * 요소 움직임
     * @param {Event} event
     * @return {void}
     */
    elementsMoving(event: Event): void;
    /**
     * movingItems 위치 이동
     * @param {number} topValue
     * @return {void}
     */
    applyMovingItemsPosition(topValue: number): void;
    /**
     * 선택 요소들 이동 종료
     * @return {void}
     */
    endMoving(): void;
    /**
     * 요소 이동 결과 받아오기
     * @param {number} count
     * @param {number[]} excludedItems
     * @param {boolean} isNotChange
     * @returns {MovedResultArray}
     */
    getMovedResults(count: number, excludedItems: number[], isNotChange?: boolean): MovedResultArray;
    /**
     * 요소 이동 결과 생성
     * @param {number} prev
     * @param {boolean} isSelected
     * @return {MovedItem}
     */
    getMovedResult(prev: number, isSelected: boolean): MovedItem;
    /**
     * 현재 스크롤 위치 기억
     * @param {Event} event
     * @return {void}
     */
    setScroll(event: Event): void;
    /**
     * 스크롤 이동
     * @param {number} value
     * @return {void}
     */
    moveScroll(value: number): void;
    /**
     * 스크롤 on/off
     * @param {boolean} isMovingScroll
     * @param {number} value
     */
    toggleMovingScroll(isMovingScroll: boolean, value?: number): void;
    /**
     * 선택한 모든 아이템 선택 취소
     * @param {MouseEvent} event
     * @return {void}
     */
    unselectAllItem(event: MouseEvent): void;
    /**
     * 행 가운데 영역 드랍 처리. 드랍 대상 행 하위로 이동 아이템들을 편입시킨다.
     * 대상 행이 부모(그룹) 행(isCollapsed 보유)이 아니면 편입 불가 → 원래 순서로 되돌린다.
     * @param {number} parentIndex 드랍 대상 행의 orderItems index
     * @returns {void}
     */
    private dropToParent;
    /**
     * targetIndex 위치에 이동 아이템들(isHierarchy 시 부모 자식 포함)을 끼워넣은 이동 결과 목록 생성
     * @param {number} targetIndex
     * @returns {MovedItem[]}
     */
    private buildMovedResults;
    /**
     * 이동 결과를 원래 순서로 되돌린다.
     * @returns {void}
     */
    private revertMoveResult;
    /**
     * 아이템의 object 를 계층 인터페이스로 해석한다.
     * @param {GgokiorderItem<T>} item
     * @returns {GgokiorderHierarchyObject}
     */
    private asHierarchy;
    /**
     * 아이템의 부모 id (없으면 null). isHierarchy 이 아니면 항상 null.
     * @param {GgokiorderItem<T>} item
     * @returns {number | null}
     */
    private getParentObjectId;
    /**
     * 접힌 부모에 속해 숨겨야 하는 자식 행인지 여부.
     * @param {GgokiorderItem<T>} item
     * @returns {boolean}
     */
    private isCollapsedHidden;
    /**
     * 부모 인덱스의 자식 orderItems 인덱스 목록.
     * @param {number} parentIndex
     * @returns {number[]}
     */
    private getChildIndices;
    /**
     * 실제로 함께 이동시킬 인덱스 목록. isHierarchy 일 때 선택된 부모의 자식까지 포함한다.
     * (부모 드래그 시 자식이 함께 따라가도록)
     * @returns {number[]}
     */
    private getMovingIndices;
    /**
     * 하위 드랍 대상 행 하이라이트 적용/해제.
     * 행은 projected content 라 컴포넌트 스코프 스타일이 닿지 않으므로 인라인 스타일로 처리한다.
     * @param {GgokiorderItem<T> | undefined} item 하이라이트할 행 (undefined 면 해제만)
     * @returns {void}
     */
    private setParentDropHighlight;
    /**
     * 주어진 순서를 부모 계층 기준으로 해석해 소속 변경 목록을 만든다.
     * 부모 블록(부모 행 + 뒤따르는 자식 연속 구간)을 기준으로 이동 중인 아이템의 새 소속을 정한다.
     * - 이동 중인 아이템이 자기 부모 블록 밖(최상위 영역)에 놓이면 → 부모 이탈 ({ object })
     * - 이동 중인 아이템이 다른 부모 블록 안에 놓이면 → 그 부모로 편입 ({ parentObjectId, object })
     *   (단, 이동 아이템에 부모 행이 포함되면 부모 중첩 방지를 위해 편입 불가 → 무효)
     * - 이동하지 않은 자식의 블록이 끊기면 → 무효
     * isHierarchy 가 아니면 항상 빈 Map(소속 변경 없음)을 반환한다.
     * @param {T[]} orderedObjects 이동 결과로 만들어질 object 순서
     * @param {number | null} [dropParentId] 디바이더 드랍 시 커서가 가리킨 소속 부모 id.
     *   부모 블록 경계(마지막 자식 ↔ 부모 밖 요소 사이)처럼 순서만으로 소속이 모호할 때 이 값을 우선한다.
     *   undefined 면 블록 컨텍스트로 판단.
     * @returns {Map<T, number | null> | null} 소속이 바뀐 object → 새 부모 id(null = 최상위) Map. 배치가 계층 규칙상 무효면 null.
     */
    private resolveParentChanges;
    /**
     * 이동으로 순서 또는 소속이 바뀐 항목만 골라 이동 결과 배열을 만든다.
     * 받은 쪽이 order 를 index 로 대상 object 를 얻고, 한 번의 순회로 순서 저장과 소속 변경을 처리할 수 있도록
     * 각 항목에 새 order·parentObjectId 를 담는다. (object 자체는 공유 배열의 index 로 얻으므로 담지 않는다)
     * @param {T[]} resultObjects 이동 결과 순서의 object 목록 (index = 새 order)
     * @param {MovedItem[]} movedResults 이동 결과(각 항목의 prev = 이동 전 index)
     * @param {Map<T, number | null>} parentChanges 소속이 바뀐 object → 새 부모 id(null = 최상위) Map
     * @returns {MovedObject[]}
     */
    private buildMovedObjects;
    /**
     *  HTML element 에 top 적용 및 배열 순서 재배치 적용
     * @param {MovedItem[]} movedResults
     * @returns {void}
     * @private
     */
    private applyMoveResult;
    static ɵfac: i0.ɵɵFactoryDeclaration<GgokiorderComponent<any>, never>;
    static ɵcmp: i0.ɵɵComponentDeclaration<GgokiorderComponent<any>, "ggokiorder", never, { "selected": { "alias": "selected"; "required": false; }; "moveArea": { "alias": "moveArea"; "required": false; }; "objects": { "alias": "objects"; "required": false; }; "multiSelectMode": { "alias": "multiSelectMode"; "required": false; }; "allowNoSelection": { "alias": "allowNoSelection"; "required": false; }; "isHierarchy": { "alias": "isHierarchy"; "required": false; }; }, { "moved": "moved"; "clickItem": "clickItem"; "changeHeight": "changeHeight"; "movingState": "movingState"; }, ["items"], ["*"], true, never>;
}
export {};
