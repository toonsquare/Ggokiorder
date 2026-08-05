import { OrderDirective } from './order.directive';

export const BASE_TRANSITION_TIME: number = 200;

/** projected 아이템(object)이 만족해야 하는 최소 계약. id 로 식별하고 parentObjectId 로 부모를 가리킨다. */
export interface GgokiorderObject {
  parentObjectId?: number;
  id: number;
}

export interface ClickItem<T extends GgokiorderObject = GgokiorderObject> {
  object?: T;
  isMultiSelect: boolean;
  button: number;
  isSelect: boolean;
}

export interface OrderEvent {
  orderItem: OrderDirective;
  mouseEvent: MouseEvent;
}

/** ggokiorder 이동으로 순서·소속이 바뀐 항목 하나. 바뀐 항목만 담아 배열로 한 번에 emit 한다.
 * 받은 쪽은 order 를 [objects] 배열의 index 로 써서 대상 object 를 얻고(공유 배열 기준),
 * 이 배열을 한 번만 순회하면 순서 저장과 소속 변경을 모두 처리할 수 있다.
 * - order: 이동 후 전체에서의 새 순서(index)
 * - parentObjectId: 이동 후 소속 부모 id (null = 최상위). isHierarchy 가 아니면 항상 null */
export interface MovedObject {
  order: number;
  parentObjectId: number | null;
}
